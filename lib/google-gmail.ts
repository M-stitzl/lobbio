import 'server-only';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { encrypt, decrypt } from '@/lib/encryption';

// Eine Zeile aus platform_connections (verallgemeinerte Form der früheren
// email_accounts). Hier typisiert für die Gmail-Nutzung; email_address und die
// Token-Felder sind bei anderen platform-Werten (z.B. google_reviews) nullable.
export type PlatformConnectionRow = {
  id: string;
  hotel_id: string;
  platform: string;
  email_address: string | null;
  credentials_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
};

// Etwas Puffer einplanen, damit ein Token nicht mitten in einem Gmail-API-Aufruf abläuft.
const EXPIRY_BUFFER_MS = 60_000;

/**
 * Liefert einen gültigen (nicht abgelaufenen) Gmail access_token für das übergebene
 * email_accounts-Konto. Erneuert ihn bei Bedarf über den gespeicherten refresh_token
 * und persistiert das Ergebnis verschlüsselt in der DB.
 *
 * Läuft ausschließlich server-seitig (Cron-Job, Sende-Route) – nie im Client verwenden.
 */
export async function getValidAccessToken(account: PlatformConnectionRow): Promise<string> {
  const stillValid =
    account.token_expires_at &&
    new Date(account.token_expires_at).getTime() - EXPIRY_BUFFER_MS > Date.now();

  if (stillValid) {
    return decrypt(account.credentials_encrypted);
  }

  if (!account.refresh_token_encrypted) {
    throw new Error(
      `Kein refresh_token für Hotel ${account.hotel_id} hinterlegt. Gmail-Verbindung muss in den Einstellungen neu hergestellt werden.`
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: decrypt(account.refresh_token_encrypted) });

  const { credentials } = await oauth2Client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error(`Token-Refresh für Hotel ${account.hotel_id} lieferte keinen access_token zurück.`);
  }

  await supabaseAdmin
    .from('platform_connections')
    .update({
      credentials_encrypted: encrypt(credentials.access_token),
      token_expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
    })
    .eq('id', account.id);

  return credentials.access_token;
}

/**
 * Erstellt einen einsatzbereiten Gmail-API-Client für das übergebene Konto.
 */
export async function getGmailClient(account: PlatformConnectionRow) {
  const accessToken = await getValidAccessToken(account);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Extrahiert Absenderadresse, Betreff und Klartext-Body aus einer Gmail-Message-Ressource.
 */
export function parseGmailMessage(message: {
  id?: string | null;
  threadId?: string | null;
  payload?: {
    headers?: { name?: string | null; value?: string | null }[] | null;
    mimeType?: string | null;
    body?: { data?: string | null } | null;
    parts?: {
      mimeType?: string | null;
      body?: { data?: string | null } | null;
      parts?: { mimeType?: string | null; body?: { data?: string | null } | null }[] | null;
    }[] | null;
  } | null;
}) {
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

  const fromHeader = getHeader('From'); // z.B. "Thomas Müller <thomas.m@example.com>"
  const emailMatch = fromHeader.match(/<(.+)>/);
  const fromEmail = (emailMatch ? emailMatch[1] : fromHeader).trim().toLowerCase();
  const fromName = fromHeader.replace(/<.+>/, '').trim().replace(/^"|"$/g, '');

  const subject = getHeader('Subject');
  const messageIdHeader = getHeader('Message-ID') || getHeader('Message-Id');

  const decodeBase64Url = (data: string) =>
    Buffer.from(data, 'base64url').toString('utf-8');

  function findPlainTextPart(part: NonNullable<typeof message.payload>): string | null {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    for (const sub of part.parts ?? []) {
      if (sub.mimeType === 'text/plain' && sub.body?.data) {
        return decodeBase64Url(sub.body.data);
      }
    }
    return null;
  }

  let bodyText = '';
  if (message.payload) {
    bodyText =
      findPlainTextPart(message.payload) ??
      (message.payload.body?.data ? decodeBase64Url(message.payload.body.data) : '');
  }

  return {
    externalMessageId: message.id ?? '',
    threadId: message.threadId ?? '',
    fromEmail,
    fromName,
    subject,
    messageIdHeader,
    bodyText: bodyText.trim(),
  };
}

function encodeMimeSubject(subject: string): string {
  // RFC 2047: nicht-ASCII-Betreffs (Umlaute etc.) müssen encoded werden.
  return `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
}

/**
 * Sendet eine Antwort im selben Gmail-Thread wie die Original-Nachricht.
 * threadId + passende In-Reply-To/References/Subject-Header sind laut Gmail-API
 * Voraussetzung dafür, dass die Antwort tatsächlich im Original-Thread landet.
 */
export async function sendGmailReply(
  gmail: Awaited<ReturnType<typeof getGmailClient>>,
  params: {
    fromEmailAddress: string;
    toEmailAddress: string;
    subject: string;
    bodyText: string;
    threadId: string;
    inReplyToMessageId?: string | null;
  }
) {
  const replySubject = params.subject.trim().toLowerCase().startsWith('re:')
    ? params.subject
    : `Re: ${params.subject || '(kein Betreff)'}`;

  const headerLines = [
    `From: ${params.fromEmailAddress}`,
    `To: ${params.toEmailAddress}`,
    `Subject: ${encodeMimeSubject(replySubject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ];

  if (params.inReplyToMessageId) {
    headerLines.push(`In-Reply-To: ${params.inReplyToMessageId}`);
    headerLines.push(`References: ${params.inReplyToMessageId}`);
  }

  // Body separat base64-kodieren (RFC 2045: bei "Content-Transfer-Encoding: base64"
  // muss der Body selbst base64 sein, in Zeilen von max. 76 Zeichen). Vorher war der
  // Body als Klartext-UTF-8 unter "7bit" deklariert – das ist mit Umlauten (ä/ö/ü/ß)
  // ungültig, da UTF-8-Mehrbyte-Sequenzen Bytes > 127 enthalten, "7bit" aber nur
  // 7-Bit-ASCII erlaubt.
  const encodedBody = Buffer.from(params.bodyText, 'utf-8')
    .toString('base64')
    .replace(/(.{76})/g, '$1\r\n');

  const rawMessage = `${headerLines.join('\r\n')}\r\n\r\n${encodedBody}`;
  const raw = Buffer.from(rawMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw, threadId: params.threadId },
  });
}

/**
 * Sendet eine neue E-Mail (kein Antwort-Thread), z.B. die Buchungsbestätigung
 * aus dem Buchungsportal. Gleiche MIME-Kodierung wie sendGmailReply.
 */
export async function sendGmailMessage(
  gmail: Awaited<ReturnType<typeof getGmailClient>>,
  params: { fromEmailAddress: string; fromName?: string; toEmailAddress: string; subject: string; bodyText: string }
) {
  const from = params.fromName ? `${encodeMimeSubject(params.fromName)} <${params.fromEmailAddress}>` : params.fromEmailAddress;
  const headerLines = [
    `From: ${from}`,
    `To: ${params.toEmailAddress}`,
    `Subject: ${encodeMimeSubject(params.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ];
  const encodedBody = Buffer.from(params.bodyText, 'utf-8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  const raw = Buffer.from(`${headerLines.join('\r\n')}\r\n\r\n${encodedBody}`, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}
