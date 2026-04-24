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
