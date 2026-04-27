"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { createPlayerCharacter, createSession, getCampaignById, getCampaignCalendar, getPlayerCharactersByCampaign, getSessionsByCampaign, updateCampaignCalendarEpoch, updateCampaignIngameTime, updatePlayerCharacter } from "@/lib/queries";
import type { Campaign, CampaignCalendar, PlayerCharacter, Session } from "@/lib/types";

type PlayerCharacterStatus = "active" | "dead" | "retired";

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.campaignId as string | undefined;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignCalendar, setCampaignCalendar] = useState<CampaignCalendar | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [playerCharacters, setPlayerCharacters] = useState<PlayerCharacter[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterPlayerName, setCharacterPlayerName] = useState("");
  const [characterColor, setCharacterColor] = useState("#64748b");
  const [characterNotes, setCharacterNotes] = useState("");
  const [characterError, setCharacterError] = useState<string | null>(null);
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [showInactiveCharacters, setShowInactiveCharacters] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [editingCharacterName, setEditingCharacterName] = useState("");
  const [editingCharacterPlayerName, setEditingCharacterPlayerName] = useState("");
  const [editingCharacterColor, setEditingCharacterColor] = useState("#64748b");
  const [editingCharacterNotes, setEditingCharacterNotes] = useState("");
  const [editingCharacterStatus, setEditingCharacterStatus] = useState<PlayerCharacterStatus>("active");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startYear, setStartYear] = useState("");
  const [startMonthIndex, setStartMonthIndex] = useState("");
  const [startDay, setStartDay] = useState("");
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");

  const applyCampaignStartFormDefaults = (
    campaignData: Campaign | null,
    campaignCalendarData: CampaignCalendar | null
  ) => {
    if (!campaignCalendarData) return;

    const months = campaignCalendarData.campaign_calendar_months;
    if (months.length === 0) return;

    const fallbackMonthIndex = String(Number(months[0].sort_order));
    if (!campaignData || campaignData.ingame_day == null) {
      setStartMonthIndex(fallbackMonthIndex);
      return;
    }

    const weekdays = campaignCalendarData.campaign_calendar_weekdays;
    if (weekdays.length === 0) {
      setStartMonthIndex(fallbackMonthIndex);
      return;
    }

    const deltaDays = campaignData.ingame_day - campaignCalendarData.epoch_day_number;
    if (deltaDays < 0) {
      setStartMonthIndex(fallbackMonthIndex);
      return;
    }

    let year = campaignCalendarData.epoch_year;
    let monthIndex = campaignCalendarData.epoch_month_index - 1;
    let dayOfMonth = campaignCalendarData.epoch_day_of_month;

    for (let i = 0; i < deltaDays; i += 1) {
      dayOfMonth += 1;
      const currentMonthDays = months[monthIndex]?.days;
      if (!currentMonthDays) {
        setStartMonthIndex(fallbackMonthIndex);
        return;
      }
      if (dayOfMonth > currentMonthDays) {
        dayOfMonth = 1;
        monthIndex += 1;
        if (monthIndex >= months.length) {
          monthIndex = 0;
          year += 1;
        }
      }
    }

    setStartYear(String(Number(year)));
    setStartMonthIndex(String(Number(months[monthIndex]?.sort_order ?? fallbackMonthIndex)));
    setStartDay(String(dayOfMonth));
    setStartHour(String(campaignData.ingame_hour ?? 0));
    setStartMinute(String(campaignData.ingame_minute ?? 0));
  };

  const deriveWeekdayFromStartDate = () => {
    if (!campaignCalendar) return null;

    const months = campaignCalendar.campaign_calendar_months;
    const weekdays = campaignCalendar.campaign_calendar_weekdays;
    const parsedYear = Number.parseInt(startYear, 10);
    const parsedMonthIndex = Number.parseInt(startMonthIndex, 10);
    const parsedDay = Number.parseInt(startDay, 10);

    if (
      months.length === 0 ||
      weekdays.length === 0 ||
      Number.isNaN(parsedYear) ||
      Number.isNaN(parsedMonthIndex) ||
      Number.isNaN(parsedDay)
    ) {
      return null;
    }

    const selectedMonth = months.find((month) => Number(month.sort_order) === parsedMonthIndex);
    if (!selectedMonth || parsedDay < 1 || parsedDay > Number(selectedMonth.days)) {
      return null;
    }

    const totalDaysPerYear = months.reduce((sum, month) => sum + Number(month.days), 0);
    if (totalDaysPerYear < 1) {
      return null;
    }

    const epochYear = Number(campaignCalendar.epoch_year);
    const epochMonthIndex = Number(campaignCalendar.epoch_month_index);
    const epochDayOfMonth = Number(campaignCalendar.epoch_day_of_month);
    const epochWeekdayIndex = Number(campaignCalendar.epoch_weekday_index);

    const daysBeforeSelectedMonth = months
      .filter((month) => Number(month.sort_order) < parsedMonthIndex)
      .reduce((sum, month) => sum + Number(month.days), 0);
    const daysBeforeEpochMonth = months
      .filter((month) => Number(month.sort_order) < epochMonthIndex)
      .reduce((sum, month) => sum + Number(month.days), 0);

    const selectedAbsoluteDay =
      (parsedYear - 1) * totalDaysPerYear + daysBeforeSelectedMonth + parsedDay;
    const epochAbsoluteDay =
      (epochYear - 1) * totalDaysPerYear +
      daysBeforeEpochMonth +
      epochDayOfMonth;

    const dayOffset = selectedAbsoluteDay - epochAbsoluteDay;
    const normalizedIndex =
      ((epochWeekdayIndex - 1 + dayOffset) % weekdays.length + weekdays.length) %
      weekdays.length;
    const weekday = weekdays[normalizedIndex];

    if (!weekday) {
      return null;
    }

    return {
      weekdayIndex: weekday.sort_order,
      weekdayName: weekday.name,
    };
  };

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

      const [campaignData, campaignCalendarData, sessionList, characterList] = await Promise.all([
        getCampaignById(campaignId),
        getCampaignCalendar(campaignId),
        getSessionsByCampaign(campaignId),
        getPlayerCharactersByCampaign(campaignId),
      ]);

      if (!campaignData) {
        setMessage("Campaign not found or you do not have access.");
      } else {
        setCampaign(campaignData);
        setCampaignCalendar(campaignCalendarData);
        applyCampaignStartFormDefaults(campaignData, campaignCalendarData);
        setSessions(sessionList);
        setPlayerCharacters(characterList);
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

  const handleCreatePlayerCharacter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!campaignId || !characterName.trim()) {
      setCharacterError("Character name is required.");
      return;
    }

    setCharacterError(null);
    const character = await createPlayerCharacter(campaignId, {
      name: characterName.trim(),
      player_name: characterPlayerName.trim() || null,
      color: characterColor || "#64748b",
      notes: characterNotes.trim() || null,
      status: "active",
    });

    if (!character) {
      setCharacterError("Unable to create player character.");
      return;
    }

    const characterList = await getPlayerCharactersByCampaign(campaignId);
    setPlayerCharacters(characterList);
    setCharacterName("");
    setCharacterPlayerName("");
    setCharacterColor("#64748b");
    setCharacterNotes("");
    setIsCreatingCharacter(false);
    router.refresh();
  };

  const handlePlayerCharacterStatusChange = async (
    characterId: string,
    status: PlayerCharacterStatus
  ) => {
    if (!campaignId) return;

    setCharacterError(null);
    const character = await updatePlayerCharacter(characterId, { status });
    if (!character) {
      setCharacterError("Unable to update player character status.");
      return;
    }

    const characterList = await getPlayerCharactersByCampaign(campaignId);
    setPlayerCharacters(characterList);
    router.refresh();
  };

  const startEditingPlayerCharacter = (character: PlayerCharacter) => {
    setCharacterError(null);
    setEditingCharacterId(character.id);
    setEditingCharacterName(character.name);
    setEditingCharacterPlayerName(character.player_name ?? "");
    setEditingCharacterColor(character.color);
    setEditingCharacterNotes(character.notes ?? "");
    setEditingCharacterStatus(character.status as PlayerCharacterStatus);
  };

  const cancelEditingPlayerCharacter = () => {
    setEditingCharacterId(null);
    setEditingCharacterName("");
    setEditingCharacterPlayerName("");
    setEditingCharacterColor("#64748b");
    setEditingCharacterNotes("");
    setEditingCharacterStatus("active");
  };

  const handleSavePlayerCharacter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!campaignId || !editingCharacterId || !editingCharacterName.trim()) {
      setCharacterError("Character name is required.");
      return;
    }

    setCharacterError(null);
    const character = await updatePlayerCharacter(editingCharacterId, {
      name: editingCharacterName.trim(),
      player_name: editingCharacterPlayerName.trim() || null,
      color: editingCharacterColor || "#64748b",
      notes: editingCharacterNotes.trim() || null,
      status: editingCharacterStatus,
    });

    if (!character) {
      setCharacterError("Unable to save player character.");
      return;
    }

    const characterList = await getPlayerCharactersByCampaign(campaignId);
    setPlayerCharacters(characterList);
    cancelEditingPlayerCharacter();
    router.refresh();
  };

  const handleSetCampaignStartDate = async () => {
    if (!campaignId || !campaign || !campaignCalendar) return;
    const selectedMonth = campaignCalendar.campaign_calendar_months.find((month) => month.sort_order === Number.parseInt(startMonthIndex, 10));
    const parsedYear = Number.parseInt(startYear, 10);
    const parsedDay = Number.parseInt(startDay, 10);
    const parsedHour = Number.parseInt(startHour, 10);
    const parsedMinute = Number.parseInt(startMinute, 10);
    const derivedWeekday = deriveWeekdayFromStartDate();

    if (
      Number.isNaN(parsedYear) ||
      !selectedMonth ||
      Number.isNaN(parsedDay) ||
      parsedDay < 1 ||
      parsedDay > selectedMonth.days ||
      !derivedWeekday ||
      Number.isNaN(parsedHour) ||
      parsedHour < 0 ||
      parsedHour > 23 ||
      Number.isNaN(parsedMinute) ||
      parsedMinute < 0 ||
      parsedMinute > 59
    ) {
      return;
    }

    const confirmed = confirm("This will reset the campaign day to 1 and set the current calendar date as the campaign start date. Continue?");
    if (!confirmed) return;

    const timeUpdated = await updateCampaignIngameTime(
      campaignId,
      parsedHour,
      parsedMinute,
      1
    );

    if (!timeUpdated) return;

    const epochUpdated = await updateCampaignCalendarEpoch(campaignCalendar.id, {
      epoch_day_number: 1,
      epoch_year: parsedYear,
      epoch_month_index: selectedMonth.sort_order,
      epoch_day_of_month: parsedDay,
      epoch_weekday_index: derivedWeekday.weekdayIndex,
    });

    if (!epochUpdated) return;

    const [campaignData, campaignCalendarData] = await Promise.all([
      getCampaignById(campaignId),
      getCampaignCalendar(campaignId),
    ]);
    setCampaign(campaignData);
    setCampaignCalendar(campaignCalendarData);
    applyCampaignStartFormDefaults(campaignData, campaignCalendarData);
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
        <p className="text-sm text-slate-500">Loading campaign…</p>
      </main>
    );
  }

  if (message) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
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

  const derivedWeekday = deriveWeekdayFromStartDate();
  const activePlayerCharacters = playerCharacters.filter((character) => character.status === "active");
  const inactivePlayerCharacters = playerCharacters.filter((character) => character.status !== "active");
  const campaignDateLabel = campaign?.ingame_day != null
    ? `Day ${campaign.ingame_day}${campaign.ingame_hour != null && campaign.ingame_minute != null ? `, ${String(campaign.ingame_hour).padStart(2, "0")}:${String(campaign.ingame_minute).padStart(2, "0")}` : ""}`
    : null;
  const renderPlayerCharacterRow = (character: PlayerCharacter, muted = false) => {
    if (editingCharacterId === character.id) {
      return (
        <li key={character.id} className={muted ? "opacity-80" : undefined}>
          <form className="space-y-3 rounded border border-slate-200 bg-slate-50 p-3" onSubmit={handleSavePlayerCharacter}>
            <label className="block text-sm font-medium text-slate-700">
              Character name
              <input
                className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={editingCharacterName}
                onChange={(event) => setEditingCharacterName(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Player
              <input
                className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={editingCharacterPlayerName}
                onChange={(event) => setEditingCharacterPlayerName(event.target.value)}
                placeholder="Optional"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Color
                <input
                  className="mt-1 h-10 w-full rounded border border-slate-200 bg-white px-2 py-1 outline-none focus:border-blue-400"
                  type="color"
                  value={editingCharacterColor}
                  onChange={(event) => setEditingCharacterColor(event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Status
                <select
                  className="mt-1 h-10 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  value={editingCharacterStatus}
                  onChange={(event) => setEditingCharacterStatus(event.target.value as PlayerCharacterStatus)}
                >
                  <option value="active">Active</option>
                  <option value="dead">Dead</option>
                  <option value="retired">Retired</option>
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                className="mt-1 min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                value={editingCharacterNotes}
                onChange={(event) => setEditingCharacterNotes(event.target.value)}
                placeholder="Optional"
              />
            </label>
            <div className="flex gap-2">
              <button
                className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                type="submit"
              >
                Save
              </button>
              <button
                className="inline-flex items-center justify-center rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={cancelEditingPlayerCharacter}
              >
                Cancel
              </button>
            </div>
          </form>
        </li>
      );
    }

    return (
      <li key={character.id} className={`flex items-start gap-3 ${muted ? "opacity-60" : ""}`}>
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full border border-slate-200"
          style={{ backgroundColor: character.color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="truncate text-sm font-medium text-slate-900">{character.name}</p>
            {character.status !== "active" ? (
              <span className="shrink-0 text-xs capitalize text-slate-500">{character.status}</span>
            ) : null}
          </div>
          {character.player_name ? (
            <p className="truncate text-xs text-slate-500">{character.player_name}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400"
            value={character.status}
            onChange={(event) => handlePlayerCharacterStatusChange(character.id, event.target.value as PlayerCharacterStatus)}
          >
            <option value="active">Active</option>
            <option value="dead">Dead</option>
            <option value="retired">Retired</option>
          </select>
          <button
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={() => startEditingPlayerCharacter(character)}
          >
            Edit
          </button>
        </div>
      </li>
    );
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Campaign detail</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline">
            <h1 className="shrink-0 text-2xl font-medium text-slate-900">{campaign?.name}</h1>
            <p className="min-w-0 truncate text-sm text-slate-500">
              {campaign?.description || "No description provided."}
            </p>
          </div>
          {campaignDateLabel ? <p className="text-sm font-medium text-slate-500">{campaignDateLabel}</p> : null}
        </div>
      </div>

      <section className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px_320px]">
        <div className="rounded border border-slate-200 bg-white p-6 shadow-sm lg:row-span-2">
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

        <div className="grid gap-8 lg:col-span-2 lg:grid-cols-2">
          <div className="rounded border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
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

          <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Player Characters</h2>
              <button
                className="shrink-0 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => setIsCreatingCharacter((current) => !current)}
              >
                {isCreatingCharacter ? "Cancel" : "+ Add character"}
              </button>
            </div>
            {isCreatingCharacter ? (
              <form className="mb-5 space-y-3 rounded border border-slate-200 bg-slate-50 p-3" onSubmit={handleCreatePlayerCharacter}>
                <label className="block text-sm font-medium text-slate-700">
                  Character name
                  <input
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={characterName}
                    onChange={(event) => setCharacterName(event.target.value)}
                    placeholder="Character name"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Player
                  <input
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={characterPlayerName}
                    onChange={(event) => setCharacterPlayerName(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <div className="flex items-end gap-3">
                  <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
                    Color
                    <input
                      className="mt-1 h-10 w-full rounded border border-slate-200 bg-white px-2 py-1 outline-none focus:border-blue-400"
                      type="color"
                      value={characterColor}
                      onChange={(event) => setCharacterColor(event.target.value)}
                    />
                  </label>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                    type="submit"
                  >
                    Add
                  </button>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Notes
                  <textarea
                    className="mt-1 min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={characterNotes}
                    onChange={(event) => setCharacterNotes(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                {characterError ? <p className="text-sm text-red-600">{characterError}</p> : null}
              </form>
            ) : characterError ? (
              <p className="mb-4 text-sm text-red-600">{characterError}</p>
            ) : null}
            {playerCharacters.length === 0 ? (
              <p className="text-sm text-slate-500">No player characters yet.</p>
            ) : (
              <div className="space-y-4">
                {activePlayerCharacters.length > 0 && (
                  <ul className="space-y-3">
                    {activePlayerCharacters.map((character) => renderPlayerCharacterRow(character))}
                  </ul>
                )}

                {inactivePlayerCharacters.length > 0 && (
                  <button
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                    type="button"
                    onClick={() => setShowInactiveCharacters((current) => !current)}
                  >
                    {showInactiveCharacters ? "Hide inactive characters" : `Show inactive characters (${inactivePlayerCharacters.length})`}
                  </button>
                )}

                {showInactiveCharacters && inactivePlayerCharacters.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Inactive</p>
                    <ul className="space-y-3">
                      {inactivePlayerCharacters.map((character) => renderPlayerCharacterRow(character, true))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Campaign setup</h2>
            <div className="space-y-3">
              <Link
                href={`/campaigns/${campaignId}/calendar`}
                className="inline-flex items-center justify-center rounded border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Edit calendar
              </Link>
              {campaignCalendar && (
                <div className="space-y-3 rounded border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-900">Campaign start</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-sm text-slate-700">
                      Year
                      <input
                        type="number"
                        value={startYear}
                        onChange={(event) => setStartYear(event.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Month
                      <select
                        value={startMonthIndex}
                        onChange={(event) => setStartMonthIndex(event.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      >
                        {campaignCalendar.campaign_calendar_months.map((month) => (
                          <option key={month.id} value={String(month.sort_order)}>
                            {month.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-700">
                      Day
                      <input
                        type="number"
                        min={1}
                        value={startDay}
                        onChange={(event) => setStartDay(event.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Weekday
                      <input
                        type="text"
                        value={derivedWeekday?.weekdayName ?? "Invalid date"}
                        readOnly
                        className="mt-1 w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Hour
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={startHour}
                        onChange={(event) => setStartHour(event.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Minute
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={startMinute}
                        onChange={(event) => setStartMinute(event.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </label>
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={handleSetCampaignStartDate}
                  >
                    Save campaign start
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
