"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Fehler beim Login: E-Mail oder Passwort inkorrekt.');
      setLoading(false);
    } else {
      // Sanfte Weiterleitung, damit der Token sicher gespeichert wird
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-emerald-800">Lobbio</h1>
          <p className="text-slate-500 mt-2">Anmelden bei Ihrem Hotel Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail Adresse</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors" placeholder="name@ihr-hotel.de" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Passwort</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors" placeholder="••••••••" />
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

          <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-70">
            {loading ? 'Wird angemeldet...' : <><LogIn size={18} /> Anmelden</>}
          </button>
        </form>
      </div>
    </div>
  );
}
