import { EntityList } from "@/components/EntityList";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">DM Tool MVP</p>
        <h1 className="text-4xl font-semibold text-slate-900">Campaign notes, sessions, and tags</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          A lightweight starting point for campaigns, sessions, notes, and tags using Supabase as the backend.
        </p>
      </div>

      <EntityList
        title="Quick links"
        items={[
          { id: "notes", label: "All notes", href: "/notes" },
          { id: "campaigns", label: "Campaigns", href: "/campaigns" },
          { id: "tags", label: "Tags", href: "/tags" },
        ]}
      />
    </main>
  );
}
