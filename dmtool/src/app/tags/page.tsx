export default function TagsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Tags</p>
        <h1 className="text-3xl font-semibold text-zinc-900">Tag management</h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-600">
          Tag filtering is important for note search. This page will show all tags and allow filtering notes by tag.
        </p>
      </div>
    </main>
  );
}
