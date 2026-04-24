"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCampaign, getCampaigns } from "@/lib/queries";
import { supabase } from "@/lib/supabaseClient";
import type { Campaign } from "@/lib/types";

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true);
      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult.data.session;

      if (!session) {
        setAuthError("You are not logged in.");
        setLoading(false);
        return;
      }

      const data = await getCampaigns();
      setCampaigns(data);
      setLoading(false);
    }

    loadCampaigns();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    setError(null);
    const campaign = await createCampaign(name.trim(), description.trim() || undefined);
    if (!campaign) {
      setError("Unable to create campaign. Please make sure you are signed in.");
      return;
    }

    setCampaigns((current) => [campaign, ...current]);
    setName("");
    setDescription("");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authError) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Campaigns</p>
          <h1 className="text-3xl font-semibold text-slate-900">Not signed in</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            You need to sign in to view and create campaigns.
          </p>
          <button
            className="mt-6 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => router.push("/login")}
          >
            Go to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Campaigns</p>
        <h1 className="text-3xl font-semibold text-slate-900">Campaign list</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          Campaigns are the top-level workspace for your DM notes, sessions, and tags.
        </p>
      </div>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Your campaigns</h2>
            <button
              className="rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading campaigns…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-slate-500">No campaigns found. Create one to get started.</p>
          ) : (
            <ul className="space-y-3">
              {campaigns.map((campaign) => (
                <li key={campaign.id} className="rounded border border-slate-200 p-4 hover:border-blue-300">
                  <Link href={`/campaigns/${campaign.id}`} className="block text-inherit">
                    <h3 className="text-lg font-medium text-slate-900">{campaign.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{campaign.description || "No description."}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Create campaign</h2>
          <label className="block text-sm font-medium text-slate-700">
            Name
            <input
              className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Campaign name"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Description
            <textarea
              className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
              rows={4}
            />
          </label>
          <button
            className="mt-4 inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={handleCreate}
          >
            Create campaign
          </button>
        </div>
      </section>
    </main>
  );
}
