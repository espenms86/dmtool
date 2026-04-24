import Link from "next/link";
import type { Note } from "@/lib/types";

type NoteCardProps = {
  note: Note;
  href?: string;
};

export function NoteCard({ note, href }: NoteCardProps) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">
        {href ? <Link href={href}>{note.title}</Link> : note.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {note.content || "No note content yet."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        {note.in_game_date && <span>Date: {note.in_game_date}</span>}
        {note.in_game_time && <span>Time: {note.in_game_time}</span>}
      </div>
    </article>
  );
}
