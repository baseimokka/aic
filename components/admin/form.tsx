import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Presentational form primitives shared across every CMS editor (§10 — one
 * source of truth for admin form chrome). No hooks, so they render inside both
 * server and client forms. Styling matches the approved sandstone system.
 */

export const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted";
export const controlClass =
  "h-12 w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-accent disabled:opacity-60";
export const textareaClass =
  "w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-ink outline-none focus:border-accent disabled:opacity-60";
export const hintClass = "mt-1.5 text-[11px] text-faint";
export const errorClass = "mt-1.5 text-[11px] font-semibold text-danger";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
          {required ? <span className="text-accent"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className={errorClass}>{error}</p> : hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function TextArea({ className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(textareaClass, className)} {...props} />;
}

export function SelectField({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, className)} {...props}>
      {children}
    </select>
  );
}

/** Responsive two-column grid for paired fields. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

/** A titled card section for grouping fields within an editor. */
export function FormCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
      {title ? <h3 className="text-sm font-extrabold text-ink">{title}</h3> : null}
      {description ? <p className="mt-1 text-[13px] text-muted">{description}</p> : null}
      <div className={cn(title || description ? "mt-4" : "", "space-y-4")}>{children}</div>
    </section>
  );
}
