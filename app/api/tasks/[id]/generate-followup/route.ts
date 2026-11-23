import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { draftFollowUpEmail } from '@/lib/claude-followup';
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
 * Schritt "KI-Entwurf erstellen": lädt die zur Aufgabe gehörende
 * ursprüngliche Gästeanfrage (über tasks.source_message_id, mit Fallback auf
 * die jüngste eingehende E-Mail des Gasts) als Kontext und lässt daraus aus
 * Stichpunkten eine vollständige Folge-E-Mail formulieren. Legt selbst noch
 * nichts an/versendet nichts – das passiert erst in send-followup.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const hotelId = await getAuthenticatedHotelId(req);
  if (!hotelId) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  let body: { notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  // bewusst als Stichpunkte statt vollständigem Fließtext gedacht –
  // vollständiger Text funktioniert genauso, ist aber kein Zwang mehr.
  const notes = (body.notes ?? '').trim();
  if (!notes) {
    return NextResponse.json({ error: 'Bitte zuerst Stichpunkte oder einen Text eintragen.' }, { status: 400 });
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
  if (!task.requires_guest_reply) {
    return NextResponse.json({ error: 'Diese Aufgabe erwartet keine Rückmeldung an einen Gast.' }, { status: 400 });
  }

  // klar erklären statt einen unspezifischen Fehler zu zeigen, wenn
  // keine Kontaktmöglichkeit hinterlegt ist.
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

  const { data: hotel } = await supabaseAdmin.from('hotels').select('name').eq('id', hotelId).single();

  try {
    const draft = await draftFollowUpEmail({
      hotelName: hotel?.name ?? 'unser Hotel',
      guestName: guest.name,
      originalSubject: originalMessage.subject ?? '',
      originalMessageContent: originalMessage.content,
      taskTitle: task.title,
      notes,
    });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('generate-followup: Claude-Aufruf fehlgeschlagen', error);
    return NextResponse.json({ error: 'KI-Entwurf konnte nicht erstellt werden.' }, { status: 500 });
  }
}
