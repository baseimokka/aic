"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/admin/controls";
import { setHomepageSectionEnabled } from "@/app/[locale]/(admin)/dashboard/homepage/actions";

/** Inline show/hide switch on the homepage section list — writes on toggle. */
export function SectionEnableToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setOn(next);
    startTransition(async () => {
      const res = await setHomepageSectionEnabled(id, next);
      if (!res.ok) setOn(!next); // revert on failure
    });
  }

  return <Toggle checked={on} onChange={toggle} label="Section visible on homepage" disabled={pending} />;
}
