export default function NotesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Notes</p>
        <h1 className="text-3xl font-semibold text-slate-900">All notes</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          Notes are the central entity in the MVP. This page will provide search and filtering across all notes.
        </p>
      </div>

      <div className="mt-8 rounded border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-700">This page will display a searchable note list and default filters for campaign, session, and tags.</p>
      </div>
    </main>
  );
}
