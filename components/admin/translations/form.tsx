"use client";

import { Field, TextInput, TextArea } from "@/components/admin/form";
import { TagInput } from "@/components/admin/tag-input";
import type { FieldValue, FieldValues, TranslatableEntityConfig } from "@/lib/translation/registry";

/**
 * Editable form for ONE locale, generated from the registry so every content
 * type reuses it. The parent owns the values (controlled) and persists them via
 * the generalized upsertTranslation action.
 */
export function TranslationForm({
  config,
  values,
  disabled = false,
  onChange,
}: {
  config: TranslatableEntityConfig;
  values: FieldValues;
  disabled?: boolean;
  onChange: (name: string, value: FieldValue) => void;
}) {
  return (
    <div className="space-y-4">
      {config.fields.map((f) => {
        const raw = values[f.name];
        const text = typeof raw === "string" ? raw : "";
        const list = Array.isArray(raw) ? raw : [];
        const id = `tr-${f.name}`;
        return (
          <Field key={f.name} label={f.label} htmlFor={id} required={f.required} hint={f.hint}>
            {f.kind === "list" ? (
              <TagInput
                value={list}
                onChange={(next) => onChange(f.name, next)}
                ariaLabel={f.label}
                placeholder="Type and press Enter"
              />
            ) : f.kind === "textarea" ? (
              <TextArea
                id={id}
                value={text}
                disabled={disabled}
                maxLength={f.max}
                rows={f.max > 2000 ? 6 : 3}
                onChange={(e) => onChange(f.name, e.target.value)}
              />
            ) : (
              <TextInput
                id={id}
                value={text}
                disabled={disabled}
                maxLength={f.max}
                onChange={(e) => onChange(f.name, e.target.value)}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}
