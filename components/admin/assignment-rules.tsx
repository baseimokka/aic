"use client";

import { useState, useTransition } from "react";
import {
  createAssignmentRule,
  deleteAssignmentRule,
  moveAssignmentRule,
  toggleAssignmentRule,
  updateAssignmentRule,
} from "@/app/[locale]/(admin)/dashboard/settings/actions";
import type { AssignmentRuleInput } from "@/lib/validation/settings";
import { Avatar } from "@/components/admin/avatar";
import { Toggle } from "@/components/admin/controls";
import { IconNote, IconPlus } from "@/components/admin/icons";

/**
 * Auto-routing rules table (Addendum §2): evaluated top-down, first match
 * wins; the fallback (from General settings) catches the rest. Manual
 * reassignment on a lead always overrides.
 */
export interface RuleRow {
  id: string;
  name: string;
  field: string;
  operator: string;
  value: string;
  enabled: boolean;
  assignee: { id: string; name: string };
}

const FIELD_LABELS: Record<string, string> = {
  country: "Country",
  language: "Language",
  tour: "Tour",
  estValue: "Est. value",
};

const OPERATOR_LABELS: Record<string, string> = {
  in: "is one of",
  eq: "equals",
  contains: "contains",
  gte: "≥",
};

const VALUE_HINTS: Record<string, string> = {
  country: "Saudi Arabia, United Arab Emirates, Kuwait…",
  language: "de — locale code the visitor browsed in",
  tour: "Cruise — matches the tour title or slug",
  estValue: "3000 — base price × travellers",
};

type EditorState = { id: string | null } & AssignmentRuleInput;

const EMPTY: EditorState = {
  id: null,
  name: "",
  field: "country",
  operator: "in",
  value: "",
  assigneeId: "",
  enabled: true,
};

export function AssignmentRules({
  rules,
  staff,
  fallbackName,
}: {
  rules: RuleRow[];
  staff: Array<{ id: string; name: string }>;
  fallbackName: string | null;
}) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean } | { ok: false; error: string }>, closeEditor = false) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError((result as { error: string }).error);
      else if (closeEditor) setEditor(null);
    });
  }

  function saveEditor() {
    if (!editor) return;
    const input: AssignmentRuleInput = {
      name: editor.name,
      field: editor.field,
      operator: editor.operator,
      value: editor.value,
      assigneeId: editor.assigneeId,
      enabled: editor.enabled,
    };
    run(
      () => (editor.id ? updateAssignmentRule(editor.id, input) : createAssignmentRule(input)),
      true,
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-extrabold text-ink">Auto-assignment rules</span>
          <span className="rounded-full border border-[#bfe3ce] bg-[#e4f3eb] px-2.5 py-0.5 text-xs font-bold text-[#0f6b43]">
            Top-down · first match wins
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditor({ ...EMPTY, assigneeId: staff[0]?.id ?? "" });
            setError(null);
          }}
          className="inline-flex h-11 items-center gap-1.5 rounded-[9px] bg-ink px-4 text-[13px] font-bold text-white hover:opacity-90"
        >
          <IconPlus width={15} height={15} />
          New rule
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[40px_1.2fr_1.6fr_1fr_150px] items-center gap-3.5 bg-cream px-5 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.05em] text-muted">
            <span>#</span>
            <span>Rule name</span>
            <span>Condition</span>
            <span>Assign to</span>
            <span className="text-end">Enabled · actions</span>
          </div>

          {rules.length === 0 && !editor ? (
            <p className="px-5 py-8 text-sm text-muted">
              No rules yet — every lead goes to the fallback assignee.
            </p>
          ) : null}

          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className="grid grid-cols-[40px_1.2fr_1.6fr_1fr_150px] items-center gap-3.5 border-t border-line-soft px-5 py-3.5"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-[7px] bg-purple-soft font-serif text-xs font-extrabold text-purple">
                {index + 1}
              </span>
              <span className="truncate text-[13.5px] font-bold text-ink">{rule.name}</span>
              <span className="min-w-0 truncate text-[12.5px] text-ink-soft">
                <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-semibold">
                  {FIELD_LABELS[rule.field] ?? rule.field}
                </span>{" "}
                <span className="text-faint">{OPERATOR_LABELS[rule.operator] ?? rule.operator}</span>{" "}
                <span className="font-bold text-ink">{rule.value}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={rule.assignee.name} seed={rule.assignee.id} size={26} />
                <span className="truncate text-[13px] font-semibold text-ink">{rule.assignee.name}</span>
              </span>
              <span className="flex items-center justify-end gap-1.5">
                <Toggle
                  checked={rule.enabled}
                  disabled={pending}
                  onChange={(next) => run(() => toggleAssignmentRule(rule.id, next))}
                  label={`Rule ${rule.name} enabled`}
                />
                <RowButton
                  label={`Move ${rule.name} up`}
                  disabled={pending || index === 0}
                  onClick={() => run(() => moveAssignmentRule(rule.id, "up"))}
                >
                  ↑
                </RowButton>
                <RowButton
                  label={`Move ${rule.name} down`}
                  disabled={pending || index === rules.length - 1}
                  onClick={() => run(() => moveAssignmentRule(rule.id, "down"))}
                >
                  ↓
                </RowButton>
                <RowButton
                  label={`Edit ${rule.name}`}
                  disabled={pending}
                  onClick={() => {
                    setEditor({
                      id: rule.id,
                      name: rule.name,
                      field: rule.field as EditorState["field"],
                      operator: rule.operator as EditorState["operator"],
                      value: rule.value,
                      assigneeId: rule.assignee.id,
                      enabled: rule.enabled,
                    });
                    setError(null);
                  }}
                >
                  <IconNote width={14} height={14} />
                </RowButton>
                {armedDelete === rule.id ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setArmedDelete(null);
                      run(() => deleteAssignmentRule(rule.id));
                    }}
                    className="h-9 rounded-[7px] bg-danger px-2 text-[11px] font-bold text-white"
                  >
                    Confirm
                  </button>
                ) : (
                  <RowButton label={`Delete ${rule.name}`} disabled={pending} onClick={() => setArmedDelete(rule.id)}>
                    ✕
                  </RowButton>
                )}
              </span>
            </div>
          ))}

          {editor ? (
            <div className="border-t-2 border-line bg-cream px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <label className="block xl:col-span-1">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Name</span>
                  <input
                    value={editor.name}
                    onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                    placeholder="High-value leads"
                    className="h-11 w-full rounded-[9px] border-[1.5px] border-line-input bg-white px-3 text-[13px] text-ink outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Field</span>
                  <select
                    value={editor.field}
                    onChange={(e) => {
                      const field = e.target.value as EditorState["field"];
                      setEditor({ ...editor, field, operator: field === "estValue" ? "gte" : "in" });
                    }}
                    className="h-11 w-full rounded-[9px] border-[1.5px] border-line-input bg-white px-2.5 text-[13px] font-semibold text-ink outline-none focus:border-accent"
                  >
                    {Object.entries(FIELD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Operator</span>
                  <select
                    value={editor.operator}
                    onChange={(e) => setEditor({ ...editor, operator: e.target.value as EditorState["operator"] })}
                    className="h-11 w-full rounded-[9px] border-[1.5px] border-line-input bg-white px-2.5 text-[13px] font-semibold text-ink outline-none focus:border-accent"
                  >
                    {(editor.field === "estValue" ? ["gte"] : ["in", "eq", "contains"]).map((op) => (
                      <option key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Value</span>
                  <input
                    value={editor.value}
                    onChange={(e) => setEditor({ ...editor, value: e.target.value })}
                    placeholder={VALUE_HINTS[editor.field]}
                    className="h-11 w-full rounded-[9px] border-[1.5px] border-line-input bg-white px-3 text-[13px] text-ink outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Assign to</span>
                  <select
                    value={editor.assigneeId}
                    onChange={(e) => setEditor({ ...editor, assigneeId: e.target.value })}
                    className="h-11 w-full rounded-[9px] border-[1.5px] border-line-input bg-white px-2.5 text-[13px] font-semibold text-ink outline-none focus:border-accent"
                  >
                    <option value="">Choose…</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-[11px] text-faint">{VALUE_HINTS[editor.field]}</p>
              <div className="mt-3 flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={saveEditor}
                  className="inline-flex h-11 items-center rounded-[9px] bg-ink px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "Saving…" : editor.id ? "Save rule" : "Add rule"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  className="inline-flex h-11 items-center rounded-[9px] border-[1.5px] border-line-input bg-white px-4 text-[13px] font-bold text-ink-soft hover:bg-cream"
                >
                  Cancel
                </button>
                {error ? (
                  <span role="alert" className="text-xs font-semibold text-danger">
                    {error}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {error && !editor ? (
            <p role="alert" className="border-t border-line-soft px-5 py-2.5 text-xs font-semibold text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-line bg-cream px-5 py-3.5 text-[13px]">
            <span className="rounded-md border border-[#f0deb0] bg-warning-soft px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#9a5a00]">
              Fallback
            </span>
            <span className="text-ink-soft">If no rule matches → assign to</span>
            <span className="font-bold text-ink">{fallbackName ?? "no one (stays unassigned)"}</span>
            <span className="text-faint">· set under General</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[7px] border border-line-input bg-white text-[13px] font-bold text-muted hover:bg-cream hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}
