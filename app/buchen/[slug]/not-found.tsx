export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center bg-[#e9ecea] px-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold text-slate-800">Online-Buchung nicht verfügbar</h1>
        <p className="text-slate-600">
          Für dieses Hotel ist die Online-Buchung gerade nicht freigeschaltet. Bitte wenden Sie sich direkt an das Haus per Telefon oder E-Mail.
        </p>
      </div>
    </main>
  );
}
