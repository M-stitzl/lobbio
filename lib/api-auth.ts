import 'server-only';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Verifiziert den mitgeschickten Supabase-Access-Token (Authorization: Bearer)
 * und liefert die hotel_id (hotels.id === auth.uid(), wie in den RLS-Policies).
 */
export async function getAuthenticatedHotelId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
