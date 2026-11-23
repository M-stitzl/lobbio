import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { name?: string; hotelName?: string; email?: string; phone?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const hotelName = (body.hotelName ?? '').trim();
  const email = (body.email ?? '').trim();
  const phone = (body.phone ?? '').trim();
  const message = (body.message ?? '').trim();

  if (!name || !hotelName || !email) {
    return NextResponse.json({ error: 'Name, Hotelname und E-Mail sind Pflichtfelder.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' }, { status: 400 });
  }

  // Öffentliches Formular, kein eingeloggter Nutzer -> Service-Role-Key, RLS
  // erlaubt hier bewusst keinerlei Browser-Zugriff (siehe Migration).
  const { error } = await supabaseAdmin.from('contact_requests').insert({
    name,
    hotel_name: hotelName,
    email,
    phone: phone || null,
    message: message || null,
  });

  if (error) {
    console.error('contact: Speichern fehlgeschlagen', error);
    return NextResponse.json({ error: 'Anfrage konnte nicht gespeichert werden.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
