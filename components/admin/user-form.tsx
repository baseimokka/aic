"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Field, TextInput, SelectField, FormCard } from "@/components/admin/form";
import { SaveBar } from "@/components/admin/controls";
import { ROLE_OPTIONS, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/rbac/labels";
import { createUser } from "@/app/[locale]/(admin)/dashboard/users/actions";

export interface UserFormValues {
  name: string;
  email: string;
  role: Role;
  password: string;
}

export function UserForm({ initial }: { initial: UserFormValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof UserFormValues>(key: K, val: UserFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createUser({ name: v.name, email: v.email, role: v.role, password: v.password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/en/dashboard/users");
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard>
        <Field label="Full name" htmlFor="user-name" required>
          <TextInput id="user-name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Layla Hassan" />
        </Field>
        <Field label="Email" htmlFor="user-email" required hint="Used to sign in. Must be unique.">
          <TextInput id="user-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="layla@aictravel.com" />
        </Field>
        <Field label="Role" htmlFor="user-role" required hint={ROLE_DESCRIPTIONS[v.role]}>
          <SelectField id="user-role" value={v.role} onChange={(e) => set("role", e.target.value as Role)}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </SelectField>
        </Field>
        <Field label="Temporary password" htmlFor="user-password" required hint="At least 8 characters. Share it securely; the user can change it later.">
          <TextInput id="user-password" type="text" autoComplete="off" value={v.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 8 characters" />
        </Field>
      </FormCard>

      <SaveBar
        pending={pending}
        saved={false}
        error={error}
        onSave={submit}
        onCancel={() => router.push("/en/dashboard/users")}
        saveLabel="Create user"
      />
    </div>
  );
}
