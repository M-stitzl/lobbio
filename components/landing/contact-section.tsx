"use client";

import React, { useState } from 'react';
import { Mail, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import { StaggerGroup, StaggerItem } from './motion';

type FormErrors = { name?: string; hotelName?: string; email?: string };

export default function ContactSection() {
  const [name, setName] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = 'Bitte geben Sie Ihren Namen an.';
    if (!hotelName.trim()) nextErrors.hotelName = 'Bitte geben Sie den Namen Ihres Hotels an.';
    if (!email.trim()) nextErrors.email = 'Bitte geben Sie Ihre E-Mail-Adresse an.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, hotelName, email, phone, message }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setSubmitError(data.error ?? 'Anfrage konnte nicht gesendet werden.');
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="kontakt" className="py-20 md:py-28 px-4 md:px-6 bg-stone-100/60">
      <StaggerGroup className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_240px] gap-8">
        <StaggerItem className="bg-stone-50 p-6 md:p-8 rounded-xl border border-stone-200 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-800 mb-6">Kontakt aufnehmen</h2>

          {submitted ? (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
              <p>Vielen Dank! Ich melde mich in Kürze bei Ihnen.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Hotelname</label>
                <input
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                />
                {errors.hotelName && <p className="text-xs text-red-600 mt-1">{errors.hotelName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Telefon (optional)</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nachricht</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
                />
              </div>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:translate-y-px text-white font-medium transition-colors disabled:opacity-70"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Wird gesendet...' : 'Absenden'}
              </button>
            </form>
          )}
        </StaggerItem>

        <StaggerItem className="space-y-4">
          <h3 className="font-semibold text-stone-800">Oder direkt erreichen</h3>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Mail size={16} className="text-emerald-600 shrink-0" />
            {/* TODO: echte Kontakt-E-Mail eintragen */}
            <span>kontakt@lobbio.de</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Phone size={16} className="text-emerald-600 shrink-0" />
            {/* TODO: echte Telefonnummer eintragen */}
            <span>+49 000 00000000</span>
          </div>
        </StaggerItem>
      </StaggerGroup>
    </section>
  );
}
