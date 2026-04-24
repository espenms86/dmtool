import { supabase } from "./supabaseClient";
import type { Campaign, CampaignCalendar, Note, Session, Tag, NoteWithTags } from "./types";

const DEFAULT_CALENDAR = {
  name: "Realm Calendar",
  months: [
    "Dawnrise",
    "Suncrest",
    "Bloomtide",
    "Emberwake",
    "Highsun",
    "Goldleaf",
    "Harvestfall",
    "Mistmere",
    "Stormcall",
    "Frostveil",
    "Nightwane",
    "Starfire",
  ],
  weekdays: [
    "Moonday",
    "Earthday",
    "Windday",
    "Fireday",
    "Starday",
    "Seaday",
    "Sundawn",
  ],
};

export async function getCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase.from("campaigns").select("*");
  if (error) {
    console.error("getCampaigns error", error);
    return [];
  }
  return data ?? [];
}

export async function createCampaign(name: string, description?: string): Promise<Campaign | null> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("createCampaign error: not signed in");
    return null;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({ name, description, user_id: user.id })
    .select("*")
    .single();

  if (error) {
    console.error("createCampaign error", error);
    return null;
  }

  await createDefaultCampaignCalendar(data.id, user.id);

  return data;
}

async function createDefaultCampaignCalendar(campaignId: string, userId: string): Promise<void> {
  const { data: existingCalendar, error: existingCalendarError } = await supabase
    .from("campaign_calendars")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingCalendarError) {
    console.error("createDefaultCampaignCalendar existing calendar error", existingCalendarError, { campaignId, userId });
    return;
  }

  if (existingCalendar) {
    return;
  }

  const { data: calendar, error: calendarError } = await supabase
    .from("campaign_calendars")
    .insert({
      campaign_id: campaignId,
      user_id: userId,
      name: DEFAULT_CALENDAR.name,
      epoch_day_number: 1,
      epoch_year: 1,
      epoch_month_index: 1,
      epoch_day_of_month: 1,
      epoch_weekday_index: 1,
    })
    .select("id")
    .single();

  if (calendarError || !calendar) {
    console.error("createDefaultCampaignCalendar calendar error", calendarError, { campaignId, userId });
    return;
  }

  const { error: monthsError } = await supabase
    .from("campaign_calendar_months")
    .insert(
      DEFAULT_CALENDAR.months.map((monthName, index) => ({
        user_id: userId,
        calendar_id: calendar.id,
        sort_order: index + 1,
        name: monthName,
        days: 30,
      }))
    );

  if (monthsError) {
    console.error("createDefaultCampaignCalendar months error", monthsError, { campaignId, userId, calendarId: calendar.id });
  }

  const { error: weekdaysError } = await supabase
    .from("campaign_calendar_weekdays")
    .insert(
      DEFAULT_CALENDAR.weekdays.map((weekdayName, index) => ({
        user_id: userId,
        calendar_id: calendar.id,
        sort_order: index + 1,
        name: weekdayName,
      }))
    );

  if (weekdaysError) {
    console.error("createDefaultCampaignCalendar weekdays error", weekdaysError, { campaignId, userId, calendarId: calendar.id });
  }
}

export async function createSession(campaignId: string, name: string): Promise<Session | null> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("createSession error: not signed in");
    return null;
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({ campaign_id: campaignId, user_id: user.id, name })
    .select("*")
    .single();

  if (error) {
    console.error("createSession error", error);
    return null;
  }

  return data;
}

export async function getCampaignById(campaignId: string): Promise<Campaign | null> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("getCampaignById error: not signed in", { campaignId });
    return null;
  }

  console.debug("getCampaignById", { campaignId, userId: user.id });

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("getCampaignById error", error, { campaignId, userId: user.id });
    return null;
  }
  return data;
}

export async function getCampaignCalendar(campaignId: string): Promise<CampaignCalendar | null> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("getCampaignCalendar error: not signed in", { campaignId });
    return null;
  }

  const { data, error } = await supabase
    .from("campaign_calendars")
    .select("*, campaign_calendar_months(*), campaign_calendar_weekdays(*)")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getCampaignCalendar error", error, { campaignId, userId: user.id });
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    campaign_calendar_months: [...(data.campaign_calendar_months ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    campaign_calendar_weekdays: [...(data.campaign_calendar_weekdays ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function updateCampaignIngameTime(campaignId: string, ingame_hour: number | null, ingame_minute: number | null, ingame_day: number | null): Promise<boolean> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("updateCampaignIngameTime error: not signed in", { campaignId });
    return false;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update({ ingame_hour, ingame_minute, ingame_day })
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .select();

  if (error) {
    console.error("updateCampaignIngameTime error", error, { campaignId, userId: user.id, data });
    return false;
  }
  return true;
}

export async function updateCampaignCalendarEpoch(
  calendarId: string,
  fields: {
    epoch_day_number: number;
    epoch_year: number;
    epoch_month_index: number;
    epoch_day_of_month: number;
    epoch_weekday_index: number;
  }
): Promise<boolean> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("updateCampaignCalendarEpoch error: not signed in", { calendarId });
    return false;
  }

  const { data, error } = await supabase
    .from("campaign_calendars")
    .update(fields)
    .eq("id", calendarId)
    .eq("user_id", user.id)
    .select();

  if (error) {
    console.error("updateCampaignCalendarEpoch error", error, { calendarId, userId: user.id, data });
    return false;
  }
  return true;
}

export async function updateCampaignCalendarMonth(
  monthId: string,
  fields: {
    name: string;
    days: number;
  }
): Promise<boolean> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("updateCampaignCalendarMonth error: not signed in", { monthId });
    return false;
  }

  const { data, error } = await supabase
    .from("campaign_calendar_months")
    .update(fields)
    .eq("id", monthId)
    .eq("user_id", user.id)
    .select();

  if (error) {
    console.error("updateCampaignCalendarMonth error", error, { monthId, userId: user.id, data });
    return false;
  }
  return true;
}

export async function updateCampaignCalendarWeekday(
  weekdayId: string,
  fields: {
    name: string;
  }
): Promise<boolean> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("updateCampaignCalendarWeekday error: not signed in", { weekdayId });
    return false;
  }

  const { data, error } = await supabase
    .from("campaign_calendar_weekdays")
    .update(fields)
    .eq("id", weekdayId)
    .eq("user_id", user.id)
    .select();

  if (error) {
    console.error("updateCampaignCalendarWeekday error", error, { weekdayId, userId: user.id, data });
    return false;
  }
  return true;
}

export async function getSessionsByCampaign(campaignId: string): Promise<Session[]> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("getSessionsByCampaign error: not signed in");
    return [];
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getSessionsByCampaign error", error);
    return [];
  }
  return data ?? [];
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("getSessionById error: not signed in", { sessionId });
    return null;
  }

  console.debug("getSessionById", { sessionId, userId: user.id });

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("getSessionById error", error, { sessionId, userId: user.id });
    return null;
  }
  return data;
}

export async function getNotesBySession(sessionId: string): Promise<NoteWithTags[]> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("getNotesBySession error: not signed in", { sessionId });
    return [];
  }

  const { data, error } = await supabase
    .from("notes")
    .select("*, note_tags(tags(*))")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("getNotesBySession error", error, { sessionId, userId: user.id });
    return [];
  }
  return data ?? [];
}

export async function createNote(
  campaignId: string,
  sessionId: string,
  title: string,
  content?: string,
  tagNames?: string[],
  ingameSnapshot?: {
    ingame_day: number | null;
    ingame_hour: number | null;
    ingame_minute: number | null;
    ingame_end_day?: number | null;
    ingame_end_hour?: number | null;
    ingame_end_minute?: number | null;
  }
): Promise<Note | null> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("createNote error: not signed in");
    return null;
  }

  // Create the note
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .insert({
      campaign_id: campaignId,
      session_id: sessionId,
      user_id: user.id,
      title,
      content,
      ingame_day: ingameSnapshot?.ingame_day ?? null,
      ingame_hour: ingameSnapshot?.ingame_hour ?? null,
      ingame_minute: ingameSnapshot?.ingame_minute ?? null,
      ingame_end_day: ingameSnapshot?.ingame_end_day ?? null,
      ingame_end_hour: ingameSnapshot?.ingame_end_hour ?? null,
      ingame_end_minute: ingameSnapshot?.ingame_end_minute ?? null,
    })
    .select("*")
    .single();

  if (noteError) {
    console.error("createNote error", noteError);
    return null;
  }

  // Handle tags if provided
  if (tagNames && tagNames.length > 0) {
    const uniqueTagNames = [...new Set(tagNames.map(name => name.trim()).filter(name => name))];
    if (uniqueTagNames.length > 0) {
      // Get or create tags
      const tagIds = await getOrCreateTags(uniqueTagNames, user.id);
      // Create note_tags
      if (tagIds.length > 0) {
        const noteTags = tagIds.map(tagId => ({ note_id: note.id, tag_id: tagId }));
        const { error: ntError } = await supabase.from("note_tags").insert(noteTags);
        if (ntError) {
          console.error("createNote note_tags error", ntError);
          // Note: note is still created, just without tags
        }
      }
    }
  }

  return note;
}

export async function updateNote(noteId: string, content: string, tagNames?: string[]): Promise<Note | null> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("updateNote error: not signed in");
    return null;
  }

  const { data, error } = await supabase
    .from("notes")
    .update({ content })
    .eq("id", noteId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("updateNote error", error);
    return null;
  }

  // Handle tags if provided
  if (tagNames !== undefined) {
    const uniqueTagNames = [...new Set(tagNames.map(name => name.trim()).filter(name => name))];
    // Get or create tags
    const tagIds = await getOrCreateTags(uniqueTagNames, user.id);
    // Delete existing note_tags
    await supabase.from("note_tags").delete().eq("note_id", noteId);
    // Create new note_tags
    if (tagIds.length > 0) {
      const noteTags = tagIds.map(tagId => ({ note_id: noteId, tag_id: tagId }));
      const { error: ntError } = await supabase.from("note_tags").insert(noteTags);
      if (ntError) {
        console.error("updateNote note_tags error", ntError);
      }
    }
  }

  return data;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("deleteNote error: not signed in");
    return false;
  }

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) {
    console.error("deleteNote error", error);
    return false;
  }

  return true;
}

async function getOrCreateTags(tagNames: string[], userId: string): Promise<string[]> {
  // First, get existing tags
  const { data: existingTags, error: getError } = await supabase
    .from("tags")
    .select("id, name")
    .eq("user_id", userId)
    .in("name", tagNames);

  if (getError) {
    console.error("getOrCreateTags get error", getError);
    return [];
  }

  const existingMap = new Map(existingTags?.map(tag => [tag.name, tag.id]) || []);
  const existingNames = new Set(existingMap.keys());
  const newNames = tagNames.filter(name => !existingNames.has(name));

  if (newNames.length > 0) {
    // Create new tags
    const newTags = newNames.map(name => ({ name, user_id: userId }));
    const { data: createdTags, error: createError } = await supabase
      .from("tags")
      .insert(newTags)
      .select("id, name");

    if (createError) {
      console.error("getOrCreateTags create error", createError);
    } else {
      createdTags?.forEach(tag => existingMap.set(tag.name, tag.id));
    }
  }

  return tagNames.map(name => existingMap.get(name)!).filter(Boolean);
}

export async function getNotesByCampaign(campaignId: string): Promise<NoteWithTags[]> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("getNotesByCampaign error: not signed in", { campaignId });
    return [];
  }

  const { data, error } = await supabase
    .from("notes")
    .select("*, note_tags(tags(*))")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id);

  if (error) {
    console.error("getNotesByCampaign error", error, { campaignId, userId: user.id });
    return [];
  }
  return data ?? [];
}

export async function getTagsByUser(): Promise<Tag[]> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    console.error("getTagsByUser error: not signed in");
    return [];
  }

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("getTagsByUser error", error);
    return [];
  }
  return data ?? [];
}
