type FilterPanelProps = {
  title: string;
  children: React.ReactNode;
};

export function FilterPanel({ title, children }: FilterPanelProps) {
  return (
    <section className="rounded border border-slate-200 bg-slate-50 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-700">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
