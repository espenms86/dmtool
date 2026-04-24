export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  ingame_day: number | null;
  ingame_month: number | null;
  ingame_year: number | null;
  ingame_hour: number | null;
  ingame_minute: number | null;
  created_at: string;
  updated_at: string;
};

export type CampaignCalendarMonth = {
  id: string;
  user_id: string;
  calendar_id: string;
  sort_order: number;
  name: string;
  days: number;
  created_at: string;
};

export type CampaignCalendarWeekday = {
  id: string;
  user_id: string;
  calendar_id: string;
  sort_order: number;
  name: string;
  created_at: string;
};

export type CampaignCalendar = {
  id: string;
  user_id: string;
  campaign_id: string;
  name: string;
  epoch_day_number: number;
  epoch_year: number;
  epoch_month_index: number;
  epoch_day_of_month: number;
  epoch_weekday_index: number;
  created_at: string;
  updated_at: string;
  campaign_calendar_months: CampaignCalendarMonth[];
  campaign_calendar_weekdays: CampaignCalendarWeekday[];
};

export type Session = {
  id: string;
  user_id: string;
  campaign_id: string;
  name: string;
  in_game_date: string | null;
  in_game_time: string | null;
  in_game_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  campaign_id: string;
  session_id: string | null;
  title: string;
  content: string | null;
  ingame_day: number | null;
  ingame_hour: number | null;
  ingame_minute: number | null;
  ingame_end_day: number | null;
  ingame_end_hour: number | null;
  ingame_end_minute: number | null;
  in_game_date: string | null;
  in_game_time: string | null;
  in_game_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type NoteTag = {
  note_id: string;
  tag_id: string;
};

export type NoteWithTags = Note & {
  note_tags: Array<{
    tags: Tag;
  }>;
};
