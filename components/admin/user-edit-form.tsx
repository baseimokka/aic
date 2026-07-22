"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Field, TextInput, SelectField, FormCard } from "@/components/admin/form";
import { SaveBar } from "@/components/admin/controls";
import { ROLE_OPTIONS, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/rbac/labels";
import { updateUser, resetUserPassword } from "@/app/[locale]/(admin)/dashboard/users/actions";

/**
 * Edit an existing staff user: name + role in one card, a separate password
 * reset in another (each saves independently). Email is immutable after
 * creation. `isSelf` warns before you change your own role.
 */
export function UserEditForm({
  id,
  email,
  isSelf,
  initial,
}: {
  id: string;
  email: string;
  isSelf: boolean;
  initial: { name: string; role: Role };
}) {
  const router = useRouter();

  // Profile (name + role)
  const [v, setV] = useState(initial);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profilePending, startProfile] = useTransition();

  // Password reset
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwPending, startPw] = useTransition();

  function saveProfile() {
    setProfileError(null);
    setProfileSaved(false);
    startProfile(async () => {
      const res = await updateUser(id, { name: v.name, role: v.role });
      if (!res.ok) {
        setProfileError(res.error);
        return;
      }
      setProfileSaved(true);
      router.refresh();
    });
  }

  function savePassword() {
    setPwError(null);
    setPwSaved(false);
    startPw(async () => {
      const res = await resetUserPassword(id, { password });
      if (!res.ok) {
        setPwError(res.error);
        return;
      }
      setPwSaved(true);
      setPassword("");
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard title="Profile" description="Name, sign-in email and role.">
        <Field label="Full name" htmlFor="user-name" required>
          <TextInput
            id="user-name"
            value={v.name}
            onChange={(e) => {
              setV((p) => ({ ...p, name: e.target.value }));
              setProfileSaved(false);
            }}
          />
        </Field>
        <Field label="Email" htmlFor="user-email" hint="Email can't be changed after the account is created.">
          <TextInput id="user-email" value={email} disabled />
        </Field>
        <Field label="Role" htmlFor="user-role" required hint={isSelf ? "This is your own account — changing your role can remove your access." : ROLE_DESCRIPTIONS[v.role]}>
          <SelectField
            id="user-role"
            value={v.role}
            onChange={(e) => {
              setV((p) => ({ ...p, role: e.target.value as Role }));
              setProfileSaved(false);
            }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </SelectField>
        </Field>
        <SaveBar
          pending={profilePending}
          saved={profileSaved}
          error={profileError}
          onSave={saveProfile}
          onCancel={() => router.push("/en/dashboard/users")}
          saveLabel="Save profile"
        />
      </FormCard>

      <FormCard title="Reset password" description="Set a new password for this user. They can change it later.">
        <Field label="New password" htmlFor="user-password" hint="At least 8 characters.">
          <TextInput
            id="user-password"
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPwSaved(false);
            }}
            placeholder="At least 8 characters"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={savePassword}
            disabled={pwPending || password.length === 0}
            className="inline-flex h-11 items-center rounded-[10px] bg-ink px-6 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pwPending ? "Saving…" : "Reset password"}
          </button>
          <span role="status" aria-live="polite" className="text-xs font-semibold">
            {pwError ? <span className="text-danger">{pwError}</span> : null}
            {pwSaved && !pwError ? <span className="text-success-deep">Password updated</span> : null}
          </span>
        </div>
      </FormCard>
    </div>
  );
}
