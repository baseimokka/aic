"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/admin/controls";
import { setReviewVisible, setReviewFeatured } from "@/app/[locale]/(admin)/dashboard/reviews/actions";

/** Inline show/hide switch on the reviews list — writes on toggle. */
export function ReviewVisibleToggle({ id, visible }: { id: string; visible: boolean }) {
  const [on, setOn] = useState(visible);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setOn(next);
    startTransition(async () => {
      const res = await setReviewVisible(id, next);
      if (!res.ok) setOn(!next); // revert on failure
    });
  }

  return <Toggle checked={on} onChange={toggle} label="Review visible on the public site" disabled={pending} />;
}

/** Inline feature/unfeature star on the reviews list — writes on click. */
export function ReviewFeaturedToggle({ id, featured }: { id: string; featured: boolean }) {
  const [on, setOn] = useState(featured);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await setReviewFeatured(id, next);
      if (!res.ok) setOn(!next); // revert on failure
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={on}
      aria-label={on ? "Unfeature review" : "Feature review"}
      title={on ? "Featured — click to unfeature" : "Not featured — click to feature"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-cream disabled:opacity-50"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill={on ? "#F5A623" : "none"}
        stroke={on ? "#F5A623" : "currentColor"}
        strokeWidth={1.8}
        className={on ? "" : "text-faint"}
        aria-hidden
      >
        <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
      </svg>
    </button>
  );
}
