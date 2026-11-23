import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getGmailClient, parseGmailMessage, type PlatformConnectionRow } from '@/lib/google-gmail';
import { classifyAndDraftEmail } from '@/lib/claude-email';
import { extractBookingIntent, checkAvailability, describeAvailability } from '@/lib/booking-intent';
import { getGuestContext, describeGuestContext } from '@/lib/guest-context';
import { getKnowledgeBase, describeKnowledgeBase } from '@/lib/knowledge-base';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Wie weit zurück gesucht wird, falls ein Konto noch nie synchronisiert wurde.
const INITIAL_LOOKBACK_HOURS = 24;
const MAX_MESSAGES_PER_ACCOUNT = 20;

type SyncResult = {
  hotel_id: string;
  email: string;
  imported: number;
  skipped: number;
  error?: string;
};

/**
 * Zwei mögliche Aufrufer dieser Route:
 * 1. Vercel Cron (GET, `Authorization: Bearer $CRON_SECRET`) → synchronisiert ALLE Hotels.
 * 2. Der "Postfach synchronisieren"-Button im Dashboard (POST, `Authorization: Bearer <Supabase-Access-Token>`)
 *    → synchronisiert NUR das Hotel des eingeloggten Nutzers.
 *
 * Gibt entweder { scope: 'all' }, { scope: 'hotel', hotelId } oder null (nicht autorisiert) zurück.
 */
async function resolveAuthorizedScope(
  req: NextRequest
): Promise<{ scope: 'all' } | { scope: 'hotel'; hotelId: string } | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token === cronSecret) {
    return { scope: 'all' };
  }

  if (token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user) {
      return { scope: 'hotel', hotelId: data.user.id };
    }
  }

  if (!cronSecret) {
    // Kein Secret konfiguriert und kein gültiger Nutzer-Token – nur für lokale Entwicklung akzeptabel.
    console.warn('CRON_SECRET ist nicht gesetzt und kein gültiger Login-Token übergeben – Zugriff wird trotzdem erlaubt (Dev-Fallback).');
    return { scope: 'all' };
  }

  return null;
}

async function syncAccount(account: PlatformConnectionRow): Promise<SyncResult> {
  let imported = 0;
  let skipped = 0;

  try {
    const { data: hotel } = await supabaseAdmin
      .from('hotels')
      .select('name')
      .eq('id', account.hotel_id)
      .single();
    const hotelName = hotel?.name ?? 'unser Hotel';

    // Einmal pro Sync-Lauf laden (nicht pro Nachricht) – die Fakten gelten
    // fürs ganze Hotel, nicht pro E-Mail.
    const knowledgeBaseEntries = await getKnowledgeBase(supabaseAdmin, account.hotel_id);
    const knowledgeBaseContext = describeKnowledgeBase(knowledgeBaseEntries);

    const gmail = await getGmailClient(account);

    const sinceDate = account.last_synced_at ?? null;
    const afterSeconds = sinceDate
      ? Math.floor(new Date(sinceDate).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - INITIAL_LOOKBACK_HOURS * 3600;

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: `in:inbox after:${afterSeconds}`,
      maxResults: MAX_MESSAGES_PER_ACCOUNT,
    });

    const messageRefs = listRes.data.messages ?? [];

    if (messageRefs.length === 0) {
      await supabaseAdmin
        .from('platform_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', account.id);
      return { hotel_id: account.hotel_id, email: account.email_address ?? account.id, imported: 0, skipped: 0 };
    }

    // Bereits importierte Gmail-IDs für dieses Hotel in einem Rutsch abfragen,
    // statt pro Nachricht einzeln zu prüfen.
    const candidateIds = messageRefs.map((m) => m.id).filter(Boolean) as string[];
    const { data: existingRows } = await supabaseAdmin
      .from('messages')
      .select('external_message_id')
      .eq('hotel_id', account.hotel_id)
      .in('external_message_id', candidateIds);
    const existingIds = new Set((existingRows ?? []).map((r) => r.external_message_id));

    for (const ref of messageRefs) {
      if (!ref.id || existingIds.has(ref.id)) {
        skipped++;
        continue;
      }

      try {
        const full = await gmail.users.messages.get({ userId: 'me', id: ref.id, format: 'full' });
        const parsed = parseGmailMessage(full.data);

        if (!parsed.bodyText) {
          skipped++;
          continue;
        }

        const { data: guest } = await supabaseAdmin
          .from('guests')
          .select('id, name, vip_notes')
          .eq('hotel_id', account.hotel_id)
          .ilike('email', parsed.fromEmail)
          .maybeSingle();

        // Vorgelagerte, unabhängig voneinander fehlschlagbare Schritte:
        // Anfrage-Extraktion, Verfügbarkeitsprüfung und
        // Gästekontext-Abruf haben alle eigene try/catch-Fallbacks auf
        // null/leer – ein Fehler in einem Schritt bricht die restliche
        // Antwortgenerierung nicht ab.
        const intent = await extractBookingIntent(parsed.bodyText);
        const availability = await checkAvailability(
          supabaseAdmin,
          account.hotel_id,
          intent.checkIn,
          intent.checkOut,
          intent.roomTypeHint
        );
        const guestContext = await getGuestContext(supabaseAdmin, account.hotel_id, guest?.id ?? null);

        const availabilityDescription = describeAvailability(availability);
        const guestContextDescription = describeGuestContext(guestContext);

        const classification = await classifyAndDraftEmail({
          hotelName,
          subject: parsed.subject,
          bodyText: parsed.bodyText,
          guestName: guest?.name,
          guestVipNotes: guest?.vip_notes,
          availabilityDescription,
          guestContextDescription,
          knowledgeBaseContext,
        });

        // Transparenz-Notiz für die Freigabe-Ansicht: zeigt dem
        // Hotelchef, worauf sich der Entwurf stützt, unabhängig davon, ob die
        // Nachricht überhaupt eine Verfügbarkeitsanfrage war.
        const contextNote =
          availability.available === null
            ? 'Keine automatische Verfügbarkeitsprüfung möglich für diese Anfrage.'
            : `Verfügbarkeit geprüft: ${availabilityDescription}.`;

        const { error: insertError } = await supabaseAdmin.from('messages').insert({
          hotel_id: account.hotel_id,
          guest_id: guest?.id ?? null,
          channel: 'email',
          direction: 'inbound',
          content: parsed.bodyText,
          subject: parsed.subject || null,
          status: 'pending_review',
          ai_category: classification.category,
          ai_draft_reply: classification.draftReply,
          ai_context_note: contextNote,
          ai_open_followups: classification.openFollowups,
          // Nur wirklich benötigt, wenn kein Gast zugeordnet wurde – aber
          // harmlos, den Wert trotzdem immer mitzuspeichern.
          extracted_sender_name: guest ? null : intent.senderName,
          external_message_id: parsed.externalMessageId,
          gmail_thread_id: parsed.threadId,
          external_sender_email: parsed.fromEmail,
          original_message_id_header: parsed.messageIdHeader || null,
          approved_by_user: false,
        });

        if (insertError) {
          // Race mit einem parallelen Sync-Lauf o.ä. — einzelne Nachricht überspringen,
          // Rest des Batches nicht abbrechen.
          console.error(`sync-emails: Insert fehlgeschlagen für ${ref.id}`, insertError);
          skipped++;
          continue;
        }

        imported++;
      } catch (perMessageError) {
        console.error(`sync-emails: Fehler bei Nachricht ${ref.id}`, perMessageError);
        skipped++;
      }
    }

    await supabaseAdmin
      .from('platform_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', account.id);

    return { hotel_id: account.hotel_id, email: account.email_address ?? account.id, imported, skipped };
  } catch (accountError) {
    console.error(`sync-emails: Fehler bei Konto ${account.email_address}`, accountError);
    return {
      hotel_id: account.hotel_id,
      email: account.email_address ?? account.id,
      imported,
      skipped,
      error: accountError instanceof Error ? accountError.message : 'Unbekannter Fehler',
    };
  }
}

async function handleSync(req: NextRequest) {
  const scope = await resolveAuthorizedScope(req);
  if (!scope) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  // .eq('platform', 'gmail') ist Pflicht: platform_connections kann auch
  // google_reviews-Verbindungen enthalten, die hier nichts verloren haben.
  let accountsQuery = supabaseAdmin.from('platform_connections').select('*').eq('platform', 'gmail');
  if (scope.scope === 'hotel') {
    accountsQuery = accountsQuery.eq('hotel_id', scope.hotelId);
  }
  const { data: accounts, error: accountsError } = await accountsQuery;

  if (accountsError) {
    console.error('sync-emails: Konnte platform_connections nicht laden', accountsError);
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
  }

  if (scope.scope === 'hotel' && (accounts ?? []).length === 0) {
    return NextResponse.json(
      { error: 'Kein verbundenes Gmail-Postfach gefunden. Bitte zuerst unter Einstellungen verbinden.' },
      { status: 400 }
    );
  }

  const results: SyncResult[] = [];
  for (const account of (accounts ?? []) as PlatformConnectionRow[]) {
    results.push(await syncAccount(account));
  }

  return NextResponse.json({ results });
}

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}
