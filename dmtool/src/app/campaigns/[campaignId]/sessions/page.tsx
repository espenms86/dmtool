export default function CampaignSessionsPage({ params }: { params: { campaignId: string } }) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Sessions</p>
        <h1 className="text-3xl font-semibold text-slate-900">Campaign {params.campaignId} sessions</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          Session records let you track game sessions and lightweight in-game time details.
        </p>
      </div>

      <div className="mt-8 rounded border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-700">This page will show session cards, session metadata, and session-linked notes.</p>
      </div>
    </main>
  );
}
