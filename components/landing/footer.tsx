import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="border-t border-stone-200 py-6 px-4 md:px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-stone-500">
        <span className="font-semibold text-stone-700">Lobbio</span>
        <div className="flex items-center gap-4">
          <Link href="/impressum" className="hover:text-stone-700 transition-colors">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-stone-700 transition-colors">
            Datenschutz
          </Link>
        </div>
      </div>
    </footer>
  );
}
