import Link from "next/link";

type EntityListProps = {
  title: string;
  items: Array<{ id: string; label: string; href?: string }>;
};

export function EntityList({ title, items }: EntityListProps) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      <ul className="space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="font-medium text-slate-900 hover:text-slate-700">
                {item.label}
              </Link>
            ) : (
              item.label
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
