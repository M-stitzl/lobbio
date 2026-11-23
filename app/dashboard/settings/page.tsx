"use client";

import React, { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Mail, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import HotelSettingsForm from '@/components/pms/HotelSettingsForm';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sobald NextAuth merkt, dass wir eingeloggt sind und einen Token haben, 
  // senden wir diesen automatisch an unser Backend zur Verschlüsselung & Speicherung.
  useEffect(() => {
    async function saveTokenToDatabase() {
      if (status === 'authenticated' && session?.accessToken) {
        setSaving(true);
        try {
          // Die serverseitige Route muss wissen, welchem Hotel (Supabase-Auth-Nutzer)
          // dieses Gmail-Konto zugeordnet wird – daher den Supabase-Access-Token mitschicken.
          const {
            data: { session: supabaseSession },
          } = await supabase.auth.getSession();

          if (!supabaseSession) {
            setStatusMessage({
              type: 'error',
              text: 'Du bist nicht im Dashboard eingeloggt. Bitte zuerst über die Login-Seite anmelden.',
            });
            setSaving(false);
            return;
          }

          const response = await fetch('/api/save-gmail', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${supabaseSession.access_token}`,
            },
          });

          const data = await response.json();

          if (response.ok) {
            setStatusMessage({
              type: 'success',
              text: data.warning ?? 'Postfach erfolgreich verknüpft und sicher in Supabase verschlüsselt!',
            });
          } else {
            setStatusMessage({ type: 'error', text: data.error || 'Fehler beim Speichern.' });
          }
        } catch {
          setStatusMessage({ type: 'error', text: 'Netzwerkfehler beim Speichern.' });
        } finally {
          setSaving(false);
        }
      }
    }

    saveTokenToDatabase();
  }, [status, session]);

  const handleGoogleConnect = () => {
    signIn('google', { 
      callbackUrl: '/dashboard/settings' 
    });
  };

  return (
    <div className="flex flex-col h-full gap-6 overflow-y-auto pb-8 pr-1">
      
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-slate-800">Einstellungen & Integrationen</h1>
        <p className="text-slate-500 mt-1">Verwalte deine verbundenen Konten und Systeme.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shrink-0">
              <Mail size={24} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Gmail Postfach anbinden</h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Verbinde das E-Mail-Postfach deiner Rezeption, damit die KI eingehende Buchungsanfragen 
                automatisch analysieren und beantworten kann.
              </p>
            </div>
          </div>
        </div>

        {/* Status-Feedback */}
        {saving && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2 text-sm text-blue-700">
            <Loader2 size={16} className="animate-spin" />
            <span>Verschlüssele Token und verbinde Postfach...</span>
          </div>
        )}

        {statusMessage && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${statusMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
            {statusMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle size={16} className="text-emerald-500" />
            <span>
              {status === 'authenticated' && session?.user?.email 
                ? `Verbunden als: ${session.user.email}` 
                : 'Nur Leserechte erforderlich'}
            </span>
          </div>
          
          <button 
            onClick={handleGoogleConnect}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              status === 'authenticated' 
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {status === 'authenticated' ? 'Erneut verbinden' : 'Mit Google verbinden'}
          </button>
        </div>
      </div>

      <HotelSettingsForm />
    </div>
  );
}