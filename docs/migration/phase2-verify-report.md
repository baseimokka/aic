# Phase 2 Migration Report — verify

**Generated:** 2026-07-23T08:56:44.349Z
**Execution time:** 22.6s
**Target DB:** postgresql://***@ep-twilight-night-ahx8lyma.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
**Legacy source:** <legacy-server>/aictravelDB (read-only, SELECT-only module)
**Backup:** docs\migration\backups\backup-2026-07-23T08-49-37.json
**Git commit:** d288167d2b88e9e99f79cbfa6c1062390c597f62 (dirty working tree)
**Totals:** imported 0 · updated 0 · skipped 0 · warnings 0 · errors 0

## Per-entity summary

| Entity | Imported | Updated | Skipped | Warnings | Errors | Time |
|---|---|---|---|---|---|---|

## Verification checks

| Check | Result | Details |
|---|---|---|
| V1 presence | ✅ pass | all 71 expected entities present |
| V2 tour translations | ✅ pass | expected ≥183, found 183 |
| V3 currency USD | ✅ pass | 50 tours all USD |
| V4 basePrice > 0 | ✅ pass | ok |
| V5 discount sanity | ✅ pass | all FIXED discounts lower the price |
| V6 status split | ✅ pass | expected 11 DISABLED, found 11 |
| V7 destination derivation | ✅ pass | expected ≥38 tours on Hurghada, found 38 (review tours may since be assigned manually) |
| V8 required content | ✅ pass | no empty titles/overviews |
| V9 id-map integrity | ✅ pass | all id-map entries resolve |

## Row-level log

| Entity | Key | Action |
|---|---|---|
