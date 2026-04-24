"use client";

import { ChangeEvent } from "react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = "Search..." }: SearchBarProps) {
  return (
    <div className="mb-4 w-full">
      <input
        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-400"
        type="search"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
