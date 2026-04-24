'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSessionById, getSessionsByCampaign, getNotesBySession, createNote, updateNote, deleteNote, getTagsByUser, getNotesByCampaign, getCampaignById, updateCampaignIngameTime } from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import type { Session, NoteWithTags, Tag, Campaign } from '@/lib/types';

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
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingTags, setEditingTags] = useState('');
  const [editingNewTag, setEditingNewTag] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'free' | 'text' | 'tags'>('free');
  const [searchScope, setSearchScope] = useState<'session' | 'campaign'>('session');
  const [campaignNotes, setCampaignNotes] = useState<NoteWithTags[]>([]);

  const filteredNotes = (searchScope === 'session' ? notes : campaignNotes).filter((note) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (searchMode === 'free') {
      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = note.content?.toLowerCase().includes(query);
      const tagMatch = note.note_tags.some((nt) => nt.tags.name.toLowerCase().includes(query));
      return titleMatch || contentMatch || tagMatch;
    } else if (searchMode === 'text') {
      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = note.content?.toLowerCase().includes(query);
      return titleMatch || contentMatch;
    } else if (searchMode === 'tags') {
      const tagMatch = note.note_tags.some((nt) => nt.tags.name.toLowerCase().includes(query));
      return tagMatch;
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
  };

  const saveEditNote = async () => {
    if (!editingNoteId) return;
    const tagNames = editingTags.split(',').map(t => t.trim()).filter(t => t);
    const updatedNote = await updateNote(editingNoteId, editingContent, tagNames);
    if (updatedNote) {
      // Reload notes and tags
      const [notesData, tagsData] = await Promise.all([
        getNotesBySession(sessionId),
        getTagsByUser(),
      ]);
      setNotes(notesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setAvailableTags(tagsData);
    }
    setEditingNoteId(null);
    setEditingContent('');
    setEditingTags('');
    setEditingNewTag('');
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingContent('');
    setEditingTags('');
    setEditingNewTag('');
  };

  const deleteNoteHandler = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      const success = await deleteNote(noteId);
      if (success) {
        // Reload notes and tags
        const [notesData, tagsData] = await Promise.all([
          getNotesBySession(sessionId),
          getTagsByUser(),
        ]);
        setNotes(notesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setAvailableTags(tagsData);
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

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagNames = tags.split(',').map(t => t.trim()).filter(t => t);
    const newNote = await createNote(campaignId, sessionId, title.trim(), content.trim() || undefined, tagNames);
    if (newNote) {
      // Reload notes and tags
      const [notesData, tagsData] = await Promise.all([
        getNotesBySession(sessionId),
        getTagsByUser(),
      ]);
      setNotes(notesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setAvailableTags(tagsData);
      // Clear form
      setTitle('');
      setContent('');
      setTags('');
      setNewTag('');
    }
  };

  useEffect(() => {
    async function loadData() {
      const [campaignData, sessionData, sessionsData, notesData, tagsData] = await Promise.all([
        getCampaignById(campaignId),
        getSessionById(sessionId),
        getSessionsByCampaign(campaignId),
        getNotesBySession(sessionId),
        getTagsByUser(),
      ]);
      setCampaign(campaignData);
      setSession(sessionData);
      setSessions(sessionsData);
      setNotes(notesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setAvailableTags(tagsData);
    }
    loadData();
  }, [campaignId, sessionId]);

  useEffect(() => {
    const loadCampaignNotes = async () => {
      if (searchScope === 'campaign') {
        const notesData = await getNotesByCampaign(campaignId);
        setCampaignNotes(notesData);
      }
    };
    loadCampaignNotes();
  }, [searchScope, campaignId]);

  const addMinutes = async (minutes: number) => {
    if (!campaign) return;
    const currentHour = campaign.ingame_hour ?? 0;
    const currentMinute = campaign.ingame_minute ?? 0;
    const totalMinutes = currentHour * 60 + currentMinute + minutes;
    const newHour = Math.floor(totalMinutes / 60) % 24;
    const newMinute = totalMinutes % 60;
    const success = await updateCampaignIngameTime(campaignId, newHour, newMinute, campaign.ingame_day);
    if (success) {
      setCampaign({ ...campaign, ingame_hour: newHour, ingame_minute: newMinute });
    }
  };

  const addHours = async (hours: number) => {
    if (!campaign) return;
    const currentHour = campaign.ingame_hour ?? 0;
    const newHour = (currentHour + hours) % 24;
    const success = await updateCampaignIngameTime(campaignId, newHour, campaign.ingame_minute ?? 0, campaign.ingame_day);
    if (success) {
      setCampaign({ ...campaign, ingame_hour: newHour });
    }
  };

  const addDays = async (days: number) => {
    if (!campaign) return;
    const currentDay = campaign.ingame_day ?? 1;
    const newDay = currentDay + days;
    const success = await updateCampaignIngameTime(campaignId, campaign.ingame_hour, campaign.ingame_minute, newDay);
    if (success) {
      setCampaign({ ...campaign, ingame_day: newDay });
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
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
                  onChange={(e) => setSearchMode(e.target.value as 'free' | 'text' | 'tags')}
                  className="flex-1 rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="free">Free</option>
                  <option value="text">Text</option>
                  <option value="tags">Tags</option>
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
                  {availableTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
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
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create note
                </button>
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
                              {availableTags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {availableTags.map((tag) => (
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
                </>
              ) : (
                <div className="text-center text-sm text-slate-500">Loading campaign clock...</div>
              )}
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => addMinutes(10)}
                className="rounded border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                +10 min
              </button>
              <button
                onClick={() => addHours(1)}
                className="rounded border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                +1 hour
              </button>
              <button
                onClick={() => addDays(1)}
                className="rounded border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                +1 day
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
