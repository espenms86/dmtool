"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { createSession, getCampaignById, getSessionsByCampaign } from "@/lib/queries";
import type { Campaign, Session } from "@/lib/types";

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.campaignId as string | undefined;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      setLoading(true);
      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult.data.session;

      if (!session || !campaignId) {
        setMessage("You are not logged in.");
        setLoading(false);
        return;
      }

      const [campaignData, sessionList] = await Promise.all([
        getCampaignById(campaignId),
        getSessionsByCampaign(campaignId),
      ]);

      if (!campaignData) {
        setMessage("Campaign not found or you do not have access.");
      } else {
        setCampaign(campaignData);
        setSessions(sessionList);
      }
      setLoading(false);
    }

    loadCampaign();
  }, [campaignId]);

  const handleCreateSession = async () => {
    if (!sessionName.trim() || !campaignId) {
      setError("Session name is required.");
      return;
    }

    setError(null);
    const session = await createSession(campaignId, sessionName.trim());
    if (!session) {
      setError("Unable to create session. Please make sure you are signed in.");
      return;
    }

    setSessions((current) => [session, ...current]);
    setSessionName("");
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
        <p className="text-sm text-slate-500">Loading campaign…</p>
      </main>
    );
  }

  if (message) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Campaign detail</p>
          <h1 className="text-3xl font-semibold text-slate-900">Unable to load campaign</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">{message}</p>
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
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Campaign detail</p>
        <h1 className="text-3xl font-semibold text-slate-900">{campaign?.name}</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          {campaign?.description || "No description provided."}
        </p>
      </div>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Sessions</h2>
            <Link href="/campaigns" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Back to campaigns
            </Link>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No sessions yet. Create one to start.</p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((session) => (
                <li key={session.id} className="rounded border border-slate-200 p-4 hover:border-blue-300">
                  <Link href={`/campaigns/${campaignId}/sessions/${session.id}`} className="block text-inherit">
                    <h3 className="text-lg font-medium text-slate-900">{session.name}</h3>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Create session</h2>
          <label className="block text-sm font-medium text-slate-700">
            Session name
            <input
              className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
              placeholder="New session name"
            />
          </label>
          <button
            className="mt-4 inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={handleCreateSession}
          >
            Create session
          </button>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
