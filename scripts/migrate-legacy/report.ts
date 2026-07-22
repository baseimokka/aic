/**
 * Migration report accumulator — every row disposition, warning, and error is
 * recorded here and rendered as both a console summary and a Markdown report
 * (docs/migration/phase2-<mode>-report.md).
 */

import fs from "node:fs";
import path from "node:path";

export type Mode = "dry-run" | "import" | "verify";
export type RowAction = "imported" | "updated" | "skipped";

interface RowLog {
  entity: string;
  key: string;
  action: RowAction;
  reason?: string;
}

interface Issue {
  entity: string;
  key: string;
  message: string;
}

interface VerifyCheck {
  name: string;
  passed: boolean;
  details: string;
}

export class MigrationReport {
  readonly mode: Mode;
  private readonly startedAt = Date.now();
  private readonly rows: RowLog[] = [];
  private readonly warnings: Issue[] = [];
  private readonly errors: Issue[] = [];
  private readonly checks: VerifyCheck[] = [];
  private readonly entityTimes: { entity: string; ms: number }[] = [];
  private readonly meta: [string, string][] = [];

  constructor(mode: Mode) {
    this.mode = mode;
  }

  addMeta(key: string, value: string): void {
    this.meta.push([key, value]);
  }

  row(entity: string, key: string, action: RowAction, reason?: string): void {
    this.rows.push({ entity, key, action, reason });
  }

  warn(entity: string, key: string, message: string): void {
    this.warnings.push({ entity, key, message });
  }

  error(entity: string, key: string, message: string): void {
    this.errors.push({ entity, key, message });
  }

  check(name: string, passed: boolean, details: string): void {
    this.checks.push({ name, passed, details });
  }

  time(entity: string, ms: number): void {
    this.entityTimes.push({ entity, ms });
  }

  get errorCount(): number {
    return this.errors.length;
  }

  get failedCheckCount(): number {
    return this.checks.filter((c) => !c.passed).length;
  }

  private countsByEntity(): Map<string, { imported: number; updated: number; skipped: number; warnings: number; errors: number }> {
    const out = new Map<string, { imported: number; updated: number; skipped: number; warnings: number; errors: number }>();
    const bucket = (entity: string) => {
      let b = out.get(entity);
      if (!b) {
        b = { imported: 0, updated: 0, skipped: 0, warnings: 0, errors: 0 };
        out.set(entity, b);
      }
      return b;
    };
    for (const r of this.rows) bucket(r.entity)[r.action]++;
    for (const w of this.warnings) bucket(w.entity).warnings++;
    for (const e of this.errors) bucket(e.entity).errors++;
    return out;
  }

  private elapsed(): string {
    const ms = Date.now() - this.startedAt;
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  }

  consoleSummary(): string {
    const lines: string[] = [];
    const verb = this.mode === "dry-run" ? "would be" : "";
    lines.push("");
    lines.push(`Migration ${this.mode} summary (${this.elapsed()})`);
    for (const [k, v] of this.meta) lines.push(`${k}: ${v}`);
    lines.push("─".repeat(72));
    const header = ["entity".padEnd(22), "imported", "updated", "skipped", "warn", "error"].join("  ");
    lines.push(header);
    for (const [entity, c] of this.countsByEntity()) {
      lines.push(
        [
          entity.padEnd(22),
          String(c.imported).padStart(8),
          String(c.updated).padStart(7),
          String(c.skipped).padStart(7),
          String(c.warnings).padStart(4),
          String(c.errors).padStart(5),
        ].join("  "),
      );
    }
    if (this.checks.length > 0) {
      lines.push("─".repeat(72));
      for (const c of this.checks) lines.push(`${c.passed ? "PASS" : "FAIL"}  ${c.name} — ${c.details}`);
    }
    lines.push("─".repeat(72));
    const totals = this.totals();
    lines.push(
      `total: ${totals.imported} ${verb} imported, ${totals.updated} ${verb} updated, ` +
        `${totals.skipped} skipped, ${this.warnings.length} warnings, ${this.errors.length} errors`,
    );
    return lines.join("\n");
  }

  private totals(): { imported: number; updated: number; skipped: number } {
    return {
      imported: this.rows.filter((r) => r.action === "imported").length,
      updated: this.rows.filter((r) => r.action === "updated").length,
      skipped: this.rows.filter((r) => r.action === "skipped").length,
    };
  }

  toMarkdown(): string {
    const now = new Date().toISOString();
    const totals = this.totals();
    const md: string[] = [];
    md.push(`# Phase 2 Migration Report — ${this.mode}`);
    md.push("");
    md.push(`**Generated:** ${now}`);
    md.push(`**Execution time:** ${this.elapsed()}`);
    for (const [k, v] of this.meta) md.push(`**${k}:** ${v}`);
    md.push(
      `**Totals:** imported ${totals.imported} · updated ${totals.updated} · skipped ${totals.skipped} · ` +
        `warnings ${this.warnings.length} · errors ${this.errors.length}`,
    );
    if (this.mode === "dry-run") md.push("", "> Dry run — no database writes were performed. Counts show what `--import` would do.");
    md.push("");

    md.push("## Per-entity summary");
    md.push("");
    md.push("| Entity | Imported | Updated | Skipped | Warnings | Errors | Time |");
    md.push("|---|---|---|---|---|---|---|");
    const times = new Map(this.entityTimes.map((t) => [t.entity, t.ms]));
    for (const [entity, c] of this.countsByEntity()) {
      const ms = times.get(entity);
      md.push(
        `| ${entity} | ${c.imported} | ${c.updated} | ${c.skipped} | ${c.warnings} | ${c.errors} | ${ms != null ? `${ms}ms` : "—"} |`,
      );
    }
    md.push("");

    if (this.checks.length > 0) {
      md.push("## Verification checks");
      md.push("");
      md.push("| Check | Result | Details |");
      md.push("|---|---|---|");
      for (const c of this.checks) md.push(`| ${c.name} | ${c.passed ? "✅ pass" : "❌ FAIL"} | ${c.details} |`);
      md.push("");
    }

    const skippedWithReason = this.rows.filter((r) => r.action === "skipped" && r.reason);
    if (skippedWithReason.length > 0) {
      md.push("## Skipped rows");
      md.push("");
      md.push("| Entity | Key | Reason |");
      md.push("|---|---|---|");
      for (const r of skippedWithReason) md.push(`| ${r.entity} | ${r.key} | ${r.reason} |`);
      md.push("");
    }

    if (this.warnings.length > 0) {
      md.push("## Warnings");
      md.push("");
      md.push("| Entity | Key | Warning |");
      md.push("|---|---|---|");
      for (const w of this.warnings) md.push(`| ${w.entity} | ${w.key} | ${w.message} |`);
      md.push("");
    }

    if (this.errors.length > 0) {
      md.push("## Errors");
      md.push("");
      md.push("| Entity | Key | Error |");
      md.push("|---|---|---|");
      for (const e of this.errors) md.push(`| ${e.entity} | ${e.key} | ${e.message} |`);
      md.push("");
    }

    md.push("## Row-level log");
    md.push("");
    md.push("| Entity | Key | Action |");
    md.push("|---|---|---|");
    for (const r of this.rows) md.push(`| ${r.entity} | ${r.key} | ${r.action}${r.reason ? ` (${r.reason})` : ""} |`);
    md.push("");

    return md.join("\n");
  }

  writeMarkdown(projectRoot: string): string {
    const dir = path.join(projectRoot, "docs", "migration");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `phase2-${this.mode === "dry-run" ? "dryrun" : this.mode}-report.md`);
    fs.writeFileSync(file, this.toMarkdown(), "utf8");
    return file;
  }
}
