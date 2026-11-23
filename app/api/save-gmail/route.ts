import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { encrypt } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email || !session.accessToken) {
      return NextResponse.json({ error: 'Nicht bei Google angemeldet.' }, { status: 401 });
    }

    // Welchem Hotel dieses Gmail-Konto gehört, ergibt sich aus der eingeloggten
    // Supabase-Session (hotels.id === auth.uid()) – NICHT aus einer festen ID.
    // Die NextAuth/Google-Session (oben) und die Supabase-Session sind zwei
    // unabhängige Logins; wir brauchen hier beide.
    const authHeader = req.headers.get('authorization');
    const supabaseToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    if (!supabaseToken) {
      return NextResponse.json(
        { error: 'Nicht im Dashboard angemeldet. Bitte zuerst über die Login-Seite einloggen.' },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(supabaseToken);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Dashboard-Login ist abgelaufen. Bitte neu einloggen.' }, { status: 401 });
    }
    const hotelId = userData.user.id;

    const encryptedAccessToken = encrypt(session.accessToken);

    const row: Record<string, unknown> = {
      hotel_id: hotelId,
      platform: 'gmail',
      email_address: session.user.email,
      credentials_encrypted: encryptedAccessToken,
      token_expires_at: session.accessTokenExpires
        ? new Date(session.accessTokenExpires).toISOString()
        : null,
      last_synced_at: new Date().toISOString(),
    };

    // Google sendet den refresh_token nur beim allerersten Consent. Ist keiner
    // in der Session (z.B. erneutes "Verbinden" ohne neuen Consent-Screen),
    // darf der bereits gespeicherte Wert NICHT überschrieben/gelöscht werden.
    if (session.refreshToken) {
      row.refresh_token_encrypted = encrypt(session.refreshToken);
    }

    const { error } = await supabaseAdmin
      .from('platform_connections')
      .upsert(row, { onConflict: 'hotel_id,platform' });

    if (error) {
      console.error('save-gmail: Supabase-Fehler', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!session.refreshToken) {
      const { data: existing } = await supabaseAdmin
        .from('platform_connections')
        .select('refresh_token_encrypted')
        .eq('hotel_id', hotelId)
        .eq('platform', 'gmail')
        .single();

      if (!existing?.refresh_token_encrypted) {
        return NextResponse.json({
          success: true,
          warning:
            'Kein refresh_token erhalten. Bitte einmal die Google-Kontoverbindung widerrufen (myaccount.google.com/permissions) und erneut verbinden, damit der automatische E-Mail-Sync funktioniert.',
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('save-gmail: unerwarteter Fehler', e);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
