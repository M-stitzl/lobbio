// Leichtgewichtiger Mechanismus, um Client-Components ohne gemeinsamen State
// (z.B. Sidebar-Badges und die Tasks-/Messages-Seiten) darüber zu informieren,
// dass sich badge-relevante Daten geändert haben. router.refresh() greift hier
// nicht, da alle Beteiligten reine "use client"-Components mit eigenem
// useState/useEffect sind (kein Next.js Server-Component-Caching im Spiel).
export const BADGES_CHANGED_EVENT = 'hotel-dashboard:badges-changed';

export function notifyBadgesChanged() {
  window.dispatchEvent(new Event(BADGES_CHANGED_EVENT));
}
