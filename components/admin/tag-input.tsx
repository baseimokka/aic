"use client";

import { useState, type KeyboardEvent } from "react";
import { controlClass } from "@/components/admin/form";
import { IconClose } from "@/components/admin/icons";

/**
 * Chip-list editor for string arrays (tour included/excluded, guide languages).
 * Enter or comma commits an entry; each chip has a remove button. Fully
 * keyboard-operable (WCAG AA). The parent owns the value (controlled).
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      {value.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag, i) => (
            <li
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 py-1 ps-2.5 pe-1 text-[13px] font-semibold text-ink"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-white hover:text-ink"
              >
                <IconClose width={13} height={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        type="text"
        aria-label={ariaLabel}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        className={controlClass}
      />
    </div>
  );
}
