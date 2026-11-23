import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getGmailClient, sendGmailReply, type PlatformConnectionRow } from '@/lib/google-gmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Verifiziert den mitgeschickten Supabase-Access-Token und liefert die
 * zugehörige hotel_id zurück (hotels.id === auth.uid(), wie in der RLS-Policy).
 * Kein automatischer Versand ohne diese Prüfung – nur der eingeloggte Hotelchef
 * darf über diese Route tatsächlich eine E-Mail verschicken.
 */
async function getAuthenticatedHotelId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const hotelId = await getAuthenticatedHotelId(req);
  if (!hotelId) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  let body: { draftText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const draftText = (body.draftText ?? '').trim();
  if (!draftText) {
    return NextResponse.json({ error: 'Der Antworttext darf nicht leer sein.' }, { status: 400 });
  }

  const { data: message, error: messageError } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('id', id)
    .eq('hotel_id', hotelId) // stellt sicher, dass niemand fremde Nachrichten versendet
    .single();

  if (messageError || !message) {
    return NextResponse.json({ error: 'Nachricht nicht gefunden.' }, { status: 404 });
  }

  if (message.channel !== 'email') {
    return NextResponse.json({ error: 'Nur E-Mail-Nachrichten können über diese Route versendet werden.' }, { status: 400 });
  }

  if (message.status === 'answered') {
    return NextResponse.json({ error: 'Diese Nachricht wurde bereits beantwortet.' }, { status: 409 });
  }

  if (!message.external_sender_email || !message.gmail_thread_id) {
    return NextResponse.json(
      { error: 'Fehlende Absender- oder Thread-Informationen – kann nicht als Antwort versendet werden.' },
      { status: 400 }
    );
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from('platform_connections')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('platform', 'gmail')
    .single();

  if (accountError || !account || !(account as PlatformConnectionRow).email_address) {
    return NextResponse.json({ error: 'Kein verbundenes Gmail-Postfach für dieses Hotel gefunden.' }, { status: 400 });
  }

  try {
    const gmail = await getGmailClient(account as PlatformConnectionRow);

    await sendGmailReply(gmail, {
      fromEmailAddress: (account as PlatformConnectionRow).email_address as string,
      toEmailAddress: message.external_sender_email,
      subject: message.subject ?? '',
      bodyText: draftText,
      threadId: message.gmail_thread_id,
      inReplyToMessageId: message.original_message_id_header,
    });

    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        status: 'answered',
        approved_by_user: true,
        sent_at: new Date().toISOString(),
        ai_draft_reply: draftText,
      })
      .eq('id', id);

    if (updateError) {
      console.error('send: Versand erfolgreich, aber Status-Update fehlgeschlagen', updateError);
      return NextResponse.json(
        { error: 'E-Mail wurde versendet, aber der Status konnte nicht aktualisiert werden.' },
        { status: 500 }
      );
    }

    // für jeden vom Entwurf offengelassenen Punkt eine Aufgabe anlegen,
    // die mit dem Gast verknüpft ist ("Rückmeldung ausstehend" auf der
    // Aufgaben-Seite) – erst hier beim tatsächlichen Versand, nicht schon bei
    // der Klassifizierung, wie im Prompt gefordert. Ein Fehler hierbei darf
    // die bereits erfolgreich versendete E-Mail nicht rückgängig machen.
    const openFollowups: string[] = Array.isArray(message.ai_open_followups) ? message.ai_open_followups : [];
    if (openFollowups.length > 0) {
      const { error: tasksError } = await supabaseAdmin.from('tasks').insert(
        openFollowups.map((title) => ({
          hotel_id: hotelId,
          title,
          source: 'message' as const,
          status: 'open' as const,
          guest_id: message.guest_id,
          requires_guest_reply: true,
          source_message_id: message.id,
        }))
      );
      if (tasksError) {
        console.error('send: Versand erfolgreich, Folge-Aufgaben konnten aber nicht angelegt werden', tasksError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('send: Gmail-Versand fehlgeschlagen', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'E-Mail-Versand fehlgeschlagen.' },
      { status: 500 }
    );
  }
}
