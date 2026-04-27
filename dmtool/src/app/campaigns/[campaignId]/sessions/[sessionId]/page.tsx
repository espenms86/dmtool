'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSessionById, getSessionsByCampaign, getNotesBySession, createNote, updateNote, deleteNote, getTagsByUser, getNpcsByUser, getNotesByCampaign, getCampaignById, getCampaignCalendar, updateCampaignIngameTime } from '@/lib/queries';
import type { Session, NoteWithTags, Tag, Npc, Campaign, CampaignCalendar } from '@/lib/types';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notes, setNotes] = useState<NoteWithTags[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [newTag, setNewTag] = useState('');
  const [npcInput, setNpcInput] = useState('');
  const [selectedNpcs, setSelectedNpcs] = useState<string[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingTags, setEditingTags] = useState('');
  const [editingNewTag, setEditingNewTag] = useState('');
  const [editingNpcInput, setEditingNpcInput] = useState('');
  const [editingNpcs, setEditingNpcs] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableNpcs, setAvailableNpcs] = useState<Npc[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'free' | 'text' | 'tags' | 'npcs'>('free');
  const [searchScope, setSearchScope] = useState<'session' | 'campaign'>('session');
  const [campaignNotes, setCampaignNotes] = useState<NoteWithTags[]>([]);
  const [campaignCalendar, setCampaignCalendar] = useState<CampaignCalendar | null>(null);
  const [manualHour, setManualHour] = useState('');
  const [manualMinute, setManualMinute] = useState('');
  const [passYears, setPassYears] = useState('');
  const [passDays, setPassDays] = useState('');
  const [passHours, setPassHours] = useState('');
  const [passMinutes, setPassMinutes] = useState('');

  const sortNotesNewestFirst = (notesToSort: NoteWithTags[]) => {
    return [...notesToSort].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const hasSearchQuery = searchQuery.trim().length > 0;
  const filteredNotes = (searchScope === 'campaign' && hasSearchQuery ? campaignNotes : notes).filter((note) => {
    if (!hasSearchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (searchMode === 'free') {
      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = note.content?.toLowerCase().includes(query);
      const tagMatch = note.note_tags.some((nt) => nt.tags.name.toLowerCase().includes(query));
      const npcMatch = (note.note_npcs ?? []).some((nn) => nn.npcs.name.toLowerCase().includes(query));
      return titleMatch || contentMatch || tagMatch || npcMatch;
    } else if (searchMode === 'text') {
      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = note.content?.toLowerCase().includes(query);
      return titleMatch || contentMatch;
    } else if (searchMode === 'tags') {
      const tagMatch = note.note_tags.some((nt) => nt.tags.name.toLowerCase().includes(query));
      return tagMatch;
    } else if (searchMode === 'npcs') {
      const npcMatch = (note.note_npcs ?? []).some((nn) => nn.npcs.name.toLowerCase().includes(query));
      return npcMatch;
    }
    return true;
  });

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const startEditNote = (note: NoteWithTags) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content || '');
    setEditingTags(note.note_tags.map(nt => nt.tags.name).join(', '));
    setEditingNewTag('');
    setEditingNpcInput('');
    setEditingNpcs((note.note_npcs ?? []).map(nn => nn.npcs.name));
  };

  const saveEditNote = async () => {
    if (!editingNoteId) return;
    const tagNames = editingTags.split(',').map(t => t.trim()).filter(t => t);
    const updatedNote = await updateNote(editingNoteId, editingContent, tagNames, editingNpcs);
    if (updatedNote) {
      // Reload notes, tags, and NPCs
      const [notesData, tagsData, npcsData] = await Promise.all([
        getNotesBySession(sessionId),
        getTagsByUser(),
        getNpcsByUser(),
      ]);
      setNotes(sortNotesNewestFirst(notesData));
      setAvailableTags(tagsData);
      setAvailableNpcs(npcsData);
    }
    setEditingNoteId(null);
    setEditingContent('');
    setEditingTags('');
    setEditingNewTag('');
    setEditingNpcInput('');
    setEditingNpcs([]);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingContent('');
    setEditingTags('');
    setEditingNewTag('');
    setEditingNpcInput('');
    setEditingNpcs([]);
  };

  const deleteNoteHandler = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      const success = await deleteNote(noteId);
      if (success) {
        // Reload notes, tags, and NPCs
        const [notesData, tagsData, npcsData] = await Promise.all([
          getNotesBySession(sessionId),
          getTagsByUser(),
          getNpcsByUser(),
        ]);
        setNotes(sortNotesNewestFirst(notesData));
        setAvailableTags(tagsData);
        setAvailableNpcs(npcsData);
      }
    }
  };

  const addTagToInput = (tagName: string, currentTags: string, setTags: (value: string) => void) => {
    const tagList = currentTags.split(',').map(t => t.trim()).filter(t => t);
    if (!tagList.includes(tagName)) {
      tagList.push(tagName);
      setTags(tagList.join(', '));
    }
  };

  const removeTagFromInput = (tagName: string, currentTags: string, setTags: (value: string) => void) => {
    const tagList = currentTags.split(',').map(t => t.trim()).filter(t => t);
    const filtered = tagList.filter(t => t !== tagName);
    setTags(filtered.join(', '));
  };

  const getTagList = (tags: string) => {
    return tags.split(',').map(t => t.trim()).filter(t => t);
  };

  const handleAddTag = (newTag: string, currentTags: string, setTags: (value: string) => void, setNewTag: (value: string) => void) => {
    if (newTag.trim()) {
      addTagToInput(newTag.trim(), currentTags, setTags);
      setNewTag('');
    }
  };

  const getFilteredTagSuggestions = (inputValue: string, currentTags: string) => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return [];

    const selectedTags = new Set(getTagList(currentTags).map((tag) => tag.toLowerCase()));
    return availableTags.filter((tag) => {
      const normalizedTagName = tag.name.toLowerCase();
      return normalizedTagName.includes(query) && !selectedTags.has(normalizedTagName);
    });
  };

  const addNpcToInput = (npcName: string, currentNpcs: string[], setNpcs: (value: string[]) => void) => {
    if (!currentNpcs.includes(npcName)) {
      setNpcs([...currentNpcs, npcName]);
    }
  };

  const removeNpcFromInput = (npcName: string, currentNpcs: string[], setNpcs: (value: string[]) => void) => {
    setNpcs(currentNpcs.filter((name) => name !== npcName));
  };

  const handleAddNpc = (newNpc: string, currentNpcs: string[], setNpcs: (value: string[]) => void, setNewNpc: (value: string) => void) => {
    if (newNpc.trim()) {
      addNpcToInput(newNpc.trim(), currentNpcs, setNpcs);
      setNewNpc('');
    }
  };

  const getFilteredNpcSuggestions = (inputValue: string, currentNpcs: string[]) => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return [];

    const selectedNpcNames = new Set(currentNpcs.map((npc) => npc.toLowerCase()));
    return availableNpcs.filter((npc) => {
      const normalizedNpcName = npc.name.toLowerCase();
      return normalizedNpcName.includes(query) && !selectedNpcNames.has(normalizedNpcName);
    });
  };

  const formatIngameTimestamp = (note: NoteWithTags) => {
    if (note.ingame_day == null || note.ingame_hour == null || note.ingame_minute == null) {
      return null;
    }

    const startTime = `${String(note.ingame_hour).padStart(2, '0')}:${String(note.ingame_minute).padStart(2, '0')}`;

    if (note.ingame_end_day == null || note.ingame_end_hour == null || note.ingame_end_minute == null) {
      return `Day ${note.ingame_day} ${startTime}`;
    }

    const endTime = `${String(note.ingame_end_hour).padStart(2, '0')}:${String(note.ingame_end_minute).padStart(2, '0')}`;

    if (note.ingame_day === note.ingame_end_day) {
      return `Day ${note.ingame_day} from ${startTime} to ${endTime}`;
    }

    return `Day ${note.ingame_day} ${startTime} to Day ${note.ingame_end_day} ${endTime}`;
  };

  const deriveCalendarState = () => {
    if (!campaign || !campaignCalendar || campaign.ingame_day == null) {
      return null;
    }

    const months = campaignCalendar.campaign_calendar_months;
    const weekdays = campaignCalendar.campaign_calendar_weekdays;
    if (months.length === 0 || weekdays.length === 0) {
      return null;
    }

    const deltaDays = campaign.ingame_day - campaignCalendar.epoch_day_number;
    if (deltaDays < 0) {
      return null;
    }

    let year = campaignCalendar.epoch_year;
    let monthIndex = campaignCalendar.epoch_month_index - 1;
    let dayOfMonth = campaignCalendar.epoch_day_of_month;

    for (let i = 0; i < deltaDays; i += 1) {
      dayOfMonth += 1;
      const currentMonthDays = months[monthIndex]?.days;
      if (!currentMonthDays) {
        return null;
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

    const weekdayIndex = (campaignCalendar.epoch_weekday_index - 1 + deltaDays) % weekdays.length;
    const weekdayName = weekdays[weekdayIndex]?.name;
    const monthName = months[monthIndex]?.name;

    if (!weekdayName || !monthName) {
      return null;
    }

    return {
      year,
      monthIndex: monthIndex + 1,
      dayOfMonth,
      weekdayIndex: weekdayIndex + 1,
      formatted: `${weekdayName}, Day ${dayOfMonth} of ${monthName}, Year ${year}`,
    };
  };

  const refreshNotesState = async () => {
    const notesData = await getNotesBySession(sessionId);
    setNotes(sortNotesNewestFirst(notesData));

    if (searchScope === 'campaign') {
      const campaignNotesData = await getNotesByCampaign(campaignId);
      setCampaignNotes(sortNotesNewestFirst(campaignNotesData));
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startDay = campaign?.ingame_day ?? 1;
    const startHour = campaign?.ingame_hour ?? 0;
    const startMinute = campaign?.ingame_minute ?? 0;
    const daysPerYear = campaignCalendar?.campaign_calendar_months?.reduce((sum, month) => sum + month.days, 0) ?? 0;
    const parsedPassYears = Number.parseInt(passYears, 10);
    const parsedPassDays = Number.parseInt(passDays, 10);
    const parsedPassHours = Number.parseInt(passHours, 10);
    const parsedPassMinutes = Number.parseInt(passMinutes, 10);
    const nextPassYears = Number.isNaN(parsedPassYears) || daysPerYear <= 0 ? 0 : Math.max(0, parsedPassYears);
    const nextPassDays = Number.isNaN(parsedPassDays) ? 0 : Math.max(0, parsedPassDays);
    const nextPassHours = Number.isNaN(parsedPassHours) ? 0 : Math.max(0, parsedPassHours);
    const nextPassMinutes = Number.isNaN(parsedPassMinutes) ? 0 : Math.max(0, parsedPassMinutes);
    const totalPassDays = nextPassYears * daysPerYear + nextPassDays;
    const shouldPassTime = totalPassDays > 0 || nextPassHours > 0 || nextPassMinutes > 0;
    const totalStartMinutes = startDay * 24 * 60 + startHour * 60 + startMinute;
    const totalEndMinutes = totalStartMinutes + totalPassDays * 24 * 60 + nextPassHours * 60 + nextPassMinutes;
    const endDay = Math.floor(totalEndMinutes / (24 * 60));
    const endHour = Math.floor((totalEndMinutes % (24 * 60)) / 60);
    const endMinute = totalEndMinutes % 60;
    const tagNames = tags.split(',').map(t => t.trim()).filter(t => t);
    const newNote = await createNote(
      campaignId,
      sessionId,
      title.trim(),
      content.trim() || undefined,
      tagNames,
      {
        ingame_day: startDay,
        ingame_hour: startHour,
        ingame_minute: startMinute,
        ingame_end_day: shouldPassTime ? endDay : null,
        ingame_end_hour: shouldPassTime ? endHour : null,
        ingame_end_minute: shouldPassTime ? endMinute : null,
      },
      selectedNpcs
    );
    if (newNote) {
      if (shouldPassTime) {
        await updateCampaignIngameTime(campaignId, endHour, endMinute, endDay);
        await refreshCampaignState();
      }
      // Reload notes, tags, and NPCs
      const [tagsData, npcsData] = await Promise.all([
        getTagsByUser(),
        getNpcsByUser(),
      ]);
      await refreshNotesState();
      setAvailableTags(tagsData);
      setAvailableNpcs(npcsData);
      // Clear form
      setTitle('');
      setContent('');
      setTags('');
      setNewTag('');
      setNpcInput('');
      setSelectedNpcs([]);
      setPassYears('');
      setPassDays('');
      setPassHours('');
      setPassMinutes('');
    }
  };

  const refreshCampaignState = async () => {
    const campaignData = await getCampaignById(campaignId);
    setCampaign(campaignData);
    if (campaignData) {
      setManualHour(String(campaignData.ingame_hour ?? 0));
      setManualMinute(String(campaignData.ingame_minute ?? 0));
    }
  };

  useEffect(() => {
    async function loadData() {
      const [campaignData, campaignCalendarData, sessionData, sessionsData, notesData, tagsData, npcsData] = await Promise.all([
        getCampaignById(campaignId),
        getCampaignCalendar(campaignId),
        getSessionById(sessionId),
        getSessionsByCampaign(campaignId),
        getNotesBySession(sessionId),
        getTagsByUser(),
        getNpcsByUser(),
      ]);
      setCampaign(campaignData);
      setCampaignCalendar(campaignCalendarData);
      setSession(sessionData);
      setSessions(sessionsData);
      setNotes(sortNotesNewestFirst(notesData));
      setAvailableTags(tagsData);
      setAvailableNpcs(npcsData);
      if (campaignData) {
        setManualHour(String(campaignData.ingame_hour ?? 0));
        setManualMinute(String(campaignData.ingame_minute ?? 0));
      }
    }
    loadData();
  }, [campaignId, sessionId]);

  useEffect(() => {
    const loadCampaignNotes = async () => {
      if (searchScope === 'campaign') {
        const notesData = await getNotesByCampaign(campaignId);
        setCampaignNotes(sortNotesNewestFirst(notesData));
      }
    };
    loadCampaignNotes();
  }, [searchScope, campaignId]);

  const calendarState = deriveCalendarState();
  const createTagSuggestions = getFilteredTagSuggestions(newTag, tags);
  const createNpcSuggestions = getFilteredNpcSuggestions(npcInput, selectedNpcs);
  const editTagSuggestions = getFilteredTagSuggestions(editingNewTag, editingTags);
  const editNpcSuggestions = getFilteredNpcSuggestions(editingNpcInput, editingNpcs);

  const setManualTime = async () => {
    if (!campaign) return;

    const currentHour = campaign.ingame_hour ?? 0;
    const currentMinute = campaign.ingame_minute ?? 0;
    const parsedHour = Number.parseInt(manualHour, 10);
    const parsedMinute = Number.parseInt(manualMinute, 10);
    const nextHour = Number.isNaN(parsedHour) ? currentHour : Math.min(23, Math.max(0, parsedHour));
    const nextMinute = Number.isNaN(parsedMinute) ? currentMinute : Math.min(59, Math.max(0, parsedMinute));

    const success = await updateCampaignIngameTime(campaignId, nextHour, nextMinute, campaign.ingame_day);
    if (success) {
      await refreshCampaignState();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href={`/campaigns/${campaignId}`}
          className="inline-block text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to campaign
        </Link>
        <header className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Session workspace</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">{session?.name || `Session ${sessionId}`}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Workspace layout for note search, session creation, and helpers.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:max-w-md lg:w-96">
              <input
                type="search"
                placeholder="Search notes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex gap-2">
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value as 'free' | 'text' | 'tags' | 'npcs')}
                  className="flex-1 rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="free">Free</option>
                  <option value="text">Text</option>
                  <option value="tags">Tags</option>
                  <option value="npcs">NPCs</option>
                </select>
                <select
                  value={searchScope}
                  onChange={(e) => setSearchScope(e.target.value as 'session' | 'campaign')}
                  className="flex-1 rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="session">Session</option>
                  <option value="campaign">Campaign</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[260px_1fr_260px]">
          <aside className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Sessions</h2>
            <p className="mt-2 text-sm text-slate-600">Current campaign sessions.</p>
            <ul className="mt-5 space-y-3">
              {sessions.map((s) => {
                const sessionDate = new Date(s.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit'
                });
                return (
                  <li
                    key={s.id}
                    onClick={() => router.push(`/campaigns/${campaignId}/sessions/${s.id}`)}
                    className={`rounded-xl border p-4 text-sm cursor-pointer ${
                      s.id === sessionId
                        ? 'border-blue-400 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-slate-600 mt-1">{sessionDate}</div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="space-y-6">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Create new note</h2>
              <p className="mt-1 text-sm text-slate-600">Quick note capture for this session.</p>
              <form onSubmit={handleCreateNote} className="mt-4 space-y-4">
                <input
                  type="text"
                  placeholder="Note title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  required
                />
                <textarea
                  placeholder="Start typing your note..."
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {getTagList(tags).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {getTagList(tags).map((tagName) => (
                        <span key={tagName} className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                          {tagName}
                          <button
                            type="button"
                            onClick={() => removeTagFromInput(tagName, tags, setTags)}
                            className="ml-2 text-blue-500 hover:text-blue-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddTag(newTag, tags, setTags, setNewTag);
                        }
                      }}
                      className="flex-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  {createTagSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {createTagSuggestions.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => addTagToInput(tag.name, tags, setTags)}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedNpcs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedNpcs.map((npcName) => (
                        <span key={npcName} className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
                          {npcName}
                          <button
                            type="button"
                            onClick={() => removeNpcFromInput(npcName, selectedNpcs, setSelectedNpcs)}
                            className="ml-2 text-amber-600 hover:text-amber-800"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add NPC"
                      value={npcInput}
                      onChange={(e) => setNpcInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddNpc(npcInput, selectedNpcs, setSelectedNpcs, setNpcInput);
                        }
                      }}
                      className="flex-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  {createNpcSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {createNpcSuggestions.map((npc) => (
                        <button
                          key={npc.id}
                          type="button"
                          onClick={() => {
                            addNpcToInput(npc.name, selectedNpcs, setSelectedNpcs);
                            setNpcInput('');
                          }}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                        >
                          {npc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    className="rounded bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Create note
                  </button>
                  <span className="text-xs text-slate-500">Pass time:</span>
                  <div className="flex items-center gap-1">
                    <label htmlFor="pass-years" className="text-xs text-slate-500">
                      Years
                    </label>
                    <input
                      id="pass-years"
                      type="number"
                      min={0}
                      value={passYears}
                      onChange={(e) => setPassYears(e.target.value)}
                      disabled={!campaignCalendar || campaignCalendar.campaign_calendar_months.length === 0}
                      title={!campaignCalendar || campaignCalendar.campaign_calendar_months.length === 0 ? 'Requires calendar' : undefined}
                      className="w-16 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label htmlFor="pass-days" className="text-xs text-slate-500">
                      Days
                    </label>
                    <input
                      id="pass-days"
                      type="number"
                      min={0}
                      value={passDays}
                      onChange={(e) => setPassDays(e.target.value)}
                      className="w-16 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label htmlFor="pass-hours" className="text-xs text-slate-500">
                      Hours
                    </label>
                    <input
                      id="pass-hours"
                      type="number"
                      min={0}
                      value={passHours}
                      onChange={(e) => setPassHours(e.target.value)}
                      className="w-16 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label htmlFor="pass-minutes" className="text-xs text-slate-500">
                      Minutes
                    </label>
                    <input
                      id="pass-minutes"
                      type="number"
                      min={0}
                      value={passMinutes}
                      onChange={(e) => setPassMinutes(e.target.value)}
                      className="w-16 rounded border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  {filteredNotes.length} notes
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">Notes for this session will appear here.</p>

              <div className="mt-6 space-y-4">
                {notes.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-semibold text-slate-900">No notes yet</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Notes for this session will appear here.</p>
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const isExpanded = expandedNotes.has(note.id);
                    const isEditing = editingNoteId === note.id;
                    const isFromDifferentSession = searchScope === 'campaign' && note.session_id !== sessionId;
                    const noteSession = sessions.find(s => s.id === note.session_id);
                    const ingameTimestamp = formatIngameTimestamp(note);
                    return (
                      <div
                        key={note.id}
                        className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${
                          isEditing ? '' : 'cursor-pointer hover:bg-slate-100'
                        } transition-colors`}
                        onClick={isEditing ? undefined : () => toggleNoteExpansion(note.id)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-sm font-semibold ${isFromDifferentSession ? 'text-blue-600' : 'text-slate-900'}`}>
                                {note.title}
                              </h3>
                              {ingameTimestamp && (
                                <span className="text-sm font-bold text-slate-900">
                                  {ingameTimestamp}
                                </span>
                              )}
                              {isFromDifferentSession && noteSession && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/campaigns/${campaignId}/sessions/${note.session_id}`);
                                  }}
                                  className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
                                >
                                  From: {noteSession.name}
                                </button>
                              )}
                            </div>
                            <span className="text-xs text-slate-600">
                              {new Date(note.created_at).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {note.note_tags.map((nt) => (
                              <span key={nt.tags.id} className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                {nt.tags.name}
                              </span>
                            ))}
                            {(note.note_npcs ?? []).map((nn) => (
                              <span key={nn.npcs.id} className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                {nn.npcs.name}
                              </span>
                            ))}
                            {!isEditing && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditNote(note);
                                  }}
                                  className="text-xs text-slate-500 hover:text-slate-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNoteHandler(note.id);
                                  }}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                  e.preventDefault();
                                  saveEditNote();
                                }
                              }}
                              rows={4}
                              className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                            <div className="space-y-2">
                              {getTagList(editingTags).length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {getTagList(editingTags).map((tagName) => (
                                    <span key={tagName} className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                                      {tagName}
                                      <button
                                        type="button"
                                        onClick={() => removeTagFromInput(tagName, editingTags, setEditingTags)}
                                        className="ml-2 text-blue-500 hover:text-blue-700"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Add tag"
                                  value={editingNewTag}
                                  onChange={(e) => setEditingNewTag(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                      e.preventDefault();
                                      handleAddTag(editingNewTag, editingTags, setEditingTags, setEditingNewTag);
                                    }
                                  }}
                                  className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                              </div>
                              {editTagSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editTagSuggestions.map((tag) => (
                                    <button
                                      key={tag.id}
                                      type="button"
                                      onClick={() => addTagToInput(tag.name, editingTags, setEditingTags)}
                                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                                    >
                                      {tag.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              {editingNpcs.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editingNpcs.map((npcName) => (
                                    <span key={npcName} className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
                                      {npcName}
                                      <button
                                        type="button"
                                        onClick={() => removeNpcFromInput(npcName, editingNpcs, setEditingNpcs)}
                                        className="ml-2 text-amber-600 hover:text-amber-800"
                                      >
                                        x
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Add NPC"
                                  value={editingNpcInput}
                                  onChange={(e) => setEditingNpcInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                      e.preventDefault();
                                      handleAddNpc(editingNpcInput, editingNpcs, setEditingNpcs, setEditingNpcInput);
                                    }
                                  }}
                                  className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                              </div>
                              {editNpcSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editNpcSuggestions.map((npc) => (
                                    <button
                                      key={npc.id}
                                      type="button"
                                      onClick={() => {
                                        addNpcToInput(npc.name, editingNpcs, setEditingNpcs);
                                        setEditingNpcInput('');
                                      }}
                                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                                    >
                                      {npc.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditNote}
                                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditNote}
                                className="rounded border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          note.content && (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {isExpanded ? note.content : `${note.content.slice(0, 100)}${note.content.length > 100 ? '...' : ''}`}
                            </p>
                          )
                        )}
                        {isExpanded && !isEditing && (
                          <p className="mt-2 text-xs text-slate-500">Click to collapse</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <aside className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Campaign Clock</h2>
            <p className="mt-2 text-sm text-slate-600">Current in-game time</p>
            <div className="mt-4 space-y-3">
              {campaign ? (
                <>
                  {campaign.ingame_year && campaign.ingame_month && campaign.ingame_day ? (
                    <div className="text-center">
                      <div className="text-2xl font-mono font-bold text-slate-900">
                        {campaign.ingame_year}-{String(campaign.ingame_month).padStart(2, '0')}-{String(campaign.ingame_day).padStart(2, '0')}
                      </div>
                      <div className="text-sm text-slate-600">Date</div>
                    </div>
                  ) : campaign.ingame_month && campaign.ingame_day ? (
                    <div className="text-center">
                      <div className="text-2xl font-mono font-bold text-slate-900">
                        Month {campaign.ingame_month}, Day {campaign.ingame_day}
                      </div>
                      <div className="text-sm text-slate-600">Date</div>
                    </div>
                  ) : campaign.ingame_day ? (
                    <div className="text-center">
                      <div className="text-2xl font-mono font-bold text-slate-900">
                        Day {campaign.ingame_day}
                      </div>
                      <div className="text-sm text-slate-600">Date</div>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-slate-500">No date set</div>
                  )}
                  {campaign.ingame_hour != null && campaign.ingame_minute != null ? (
                    <div className="text-center">
                      <div className="text-2xl font-mono font-bold text-slate-900">
                        {String(campaign.ingame_hour).padStart(2, '0')}:{String(campaign.ingame_minute).padStart(2, '0')}
                      </div>
                      <div className="text-sm text-slate-600">Time</div>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-slate-500">No time set</div>
                  )}
                  {calendarState && (
                    <div className="text-center text-sm text-slate-600">
                      {calendarState.formatted}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-sm text-slate-500">Loading campaign clock...</div>
              )}
            </div>
            <div className="mt-4 flex items-end justify-center gap-2">
              <div className="flex flex-col">
                <label htmlFor="manual-hour" className="text-xs text-slate-500">
                  Hour
                </label>
                <input
                  id="manual-hour"
                  type="number"
                  min={0}
                  max={23}
                  value={manualHour}
                  onChange={(e) => setManualHour(e.target.value)}
                  className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="manual-minute" className="text-xs text-slate-500">
                  Minute
                </label>
                <input
                  id="manual-minute"
                  type="number"
                  min={0}
                  max={59}
                  value={manualMinute}
                  onChange={(e) => setManualMinute(e.target.value)}
                  className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                onClick={setManualTime}
                className="rounded border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                Set time
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
