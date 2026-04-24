export default function CampaignNoteDetailPage({ params }: { params: { campaignId: string; noteId: string } }) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Note detail</p>
        <h1 className="text-3xl font-semibold text-slate-900">Note {params.noteId}</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          Core note detail page inside campaign context. Notes remain the central entity for the MVP.
        </p>
      </div>
    </main>
  );
}
