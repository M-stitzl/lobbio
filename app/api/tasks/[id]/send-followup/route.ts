import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getGmailClient, sendGmailReply, type PlatformConnectionRow } from '@/lib/google-gmail';
import { resolveOriginalMessage } from '@/lib/task-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getAuthenticatedHotelId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Schritt "Senden": verschickt den (ggf. vom Hotelchef bearbeiteten)
 * Folge-Entwurf im selben Gmail-Thread wie die ursprüngliche Anfrage,
 * speichert ihn als neue outbound-Nachricht (damit er im Gesprächsverlauf
 * sichtbar bleibt) und markiert die Aufgabe als erledigt.
 */
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

  const { data: task, error: taskError } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('hotel_id', hotelId)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: 'Aufgabe nicht gefunden.' }, { status: 404 });
  }
  if (!task.guest_id) {
    return NextResponse.json(
      { error: 'Kein Gast mit dieser Aufgabe verknüpft – keine Kontaktmöglichkeit hinterlegt.' },
      { status: 400 }
    );
  }

  const { data: guest } = await supabaseAdmin.from('guests').select('id, name').eq('id', task.guest_id).single();
  if (!guest) {
    return NextResponse.json(
      { error: 'Der verknüpfte Gast konnte nicht gefunden werden – keine Kontaktmöglichkeit hinterlegt.' },
      { status: 400 }
    );
  }

  const originalMessage = await resolveOriginalMessage(supabaseAdmin, hotelId, task);

  if (!originalMessage || !originalMessage.gmail_thread_id || !originalMessage.external_sender_email) {
    return NextResponse.json(
      { error: 'Keine E-Mail-Kontaktmöglichkeit für diesen Gast hinterlegt.' },
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
      toEmailAddress: originalMessage.external_sender_email,
      subject: originalMessage.subject ?? '',
      bodyText: draftText,
      threadId: originalMessage.gmail_thread_id,
      inReplyToMessageId: originalMessage.original_message_id_header,
    });

    const replySubject = (originalMessage.subject ?? '').trim().toLowerCase().startsWith('re:')
      ? originalMessage.subject
      : `Re: ${originalMessage.subject || '(kein Betreff)'}`;

    const { error: insertError } = await supabaseAdmin.from('messages').insert({
      hotel_id: hotelId,
      guest_id: guest.id,
      channel: 'email',
      direction: 'outbound',
      content: draftText,
      subject: replySubject,
      status: 'answered',
      gmail_thread_id: originalMessage.gmail_thread_id,
      external_sender_email: originalMessage.external_sender_email,
      approved_by_user: true,
      sent_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('send-followup: Versand erfolgreich, aber Nachricht konnte nicht gespeichert werden', insertError);
    }

    const { error: taskUpdateError } = await supabaseAdmin.from('tasks').update({ status: 'done' }).eq('id', id);
    if (taskUpdateError) {
      console.error('send-followup: Versand erfolgreich, aber Aufgabe konnte nicht als erledigt markiert werden', taskUpdateError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('send-followup: Gmail-Versand fehlgeschlagen', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'E-Mail-Versand fehlgeschlagen.' },
      { status: 500 }
    );
  }
}
