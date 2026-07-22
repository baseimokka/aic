"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** In-hero search — routes to the tours catalog with the query (design hero spec). */
export function HeroSearch({ locale, placeholder, label }: { locale: string; placeholder: string; label: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/${locale}/tours?q=${encodeURIComponent(query)}` : `/${locale}/tours`);
  }

  return (
    <form onSubmit={submit} className="flex max-w-md items-center gap-2 rounded-[14px] bg-white p-2 shadow-lift">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#6E6A80" strokeWidth={2} className="ms-2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4-4" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="min-w-0 flex-1 border-none bg-transparent px-1 text-sm text-ink outline-none placeholder:text-faint"
      />
      <button type="submit" className="h-11 shrink-0 rounded-xl bg-accent px-5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-accent-deep active:scale-[0.97] motion-reduce:active:scale-100">
        {label}
      </button>
    </form>
  );
}
