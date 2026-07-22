# Phase 2 Migration Report — import

**Generated:** 2026-07-23T08:56:21.748Z
**Execution time:** 64.4s
**Target DB:** postgresql://***@ep-twilight-night-ahx8lyma.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
**Legacy source:** <legacy-server>/aictravelDB (read-only, SELECT-only module)
**Backup:** docs\migration\backups\backup-2026-07-23T08-49-37.json
**Git commit:** d288167d2b88e9e99f79cbfa6c1062390c597f62 (dirty working tree)
**Totals:** imported 316 · updated 0 · skipped 2 · warnings 50 · errors 0

## Per-entity summary

| Entity | Imported | Updated | Skipped | Warnings | Errors | Time |
|---|---|---|---|---|---|---|
| Tour | 50 | 0 | 1 | 12 | 0 | 41062ms |
| Lead | 0 | 0 | 1 | 0 | 0 | — |
| DestinationTranslation | 12 | 0 | 0 | 0 | 0 | — |
| Destination | 4 | 0 | 0 | 0 | 0 | 4550ms |
| CategoryTranslation | 30 | 0 | 0 | 0 | 0 | — |
| Category | 6 | 0 | 0 | 0 | 0 | 6625ms |
| TourTranslation | 183 | 0 | 0 | 37 | 0 | — |
| Faq | 4 | 0 | 0 | 0 | 0 | 4119ms |
| FaqTranslation | 16 | 0 | 0 | 0 | 0 | — |
| BlogPost | 4 | 0 | 0 | 0 | 0 | 2365ms |
| BlogPostTranslation | 4 | 0 | 0 | 0 | 0 | — |
| Vehicle | 3 | 0 | 0 | 0 | 0 | 1369ms |
| HeroBanner | 0 | 0 | 0 | 1 | 0 | — |

## Skipped rows

| Entity | Key | Reason |
|---|---|---|
| Tour | legacy:39 | excluded — confirmed duplicate of Tour 2 (approved decision 2) |
| Lead | O_Request (355 rows) | leads not migrated (approved decision 1) |

## Warnings

| Entity | Key | Warning |
|---|---|---|
| TourTranslation | legacy:4/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:4/ru | included item truncated to 200 chars |
| Tour | legacy:7 | destination left null — category 6 contradicts legacy chain (manual review) |
| TourTranslation | legacy:7/de | custom fact "What to bring" truncated to 200 chars |
| TourTranslation | legacy:9/ru | highlights item truncated to 200 chars |
| Tour | legacy:10 | destination left null — category 5 contradicts legacy chain (manual review) |
| Tour | legacy:11 | destination left null — category 5 contradicts legacy chain (manual review) |
| TourTranslation | legacy:11/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:14/de | custom fact "What to bring" truncated to 200 chars |
| TourTranslation | legacy:15/en | custom fact "What to bring" truncated to 200 chars |
| TourTranslation | legacy:16/ru | included item truncated to 200 chars |
| TourTranslation | legacy:18/ru | highlights item truncated to 200 chars |
| Tour | legacy:20 | destination left null — category 6 contradicts legacy chain (manual review) |
| TourTranslation | legacy:20/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:26/de | custom fact "What to bring" truncated to 200 chars |
| TourTranslation | legacy:26/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:26/fr | custom fact "What to bring" truncated to 200 chars |
| TourTranslation | legacy:27/en | custom fact "What to bring" truncated to 200 chars |
| TourTranslation | legacy:27/de | custom fact "What to bring" truncated to 200 chars |
| TourTranslation | legacy:28/en | highlights item truncated to 200 chars |
| TourTranslation | legacy:28/de | highlights item truncated to 200 chars |
| TourTranslation | legacy:28/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:28/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:28/fr | highlights item truncated to 200 chars |
| TourTranslation | legacy:30/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:30/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:31/en | highlights item truncated to 200 chars |
| TourTranslation | legacy:31/en | highlights item truncated to 200 chars |
| TourTranslation | legacy:31/de | highlights item truncated to 200 chars |
| TourTranslation | legacy:31/de | highlights item truncated to 200 chars |
| TourTranslation | legacy:31/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:31/ru | highlights item truncated to 200 chars |
| Tour | legacy:35 | destination left null — category 6 contradicts legacy chain (manual review) |
| Tour | legacy:37 | destination left null — category 6 contradicts legacy chain (manual review) |
| TourTranslation | legacy:37/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:38/ru | highlights item truncated to 200 chars |
| TourTranslation | legacy:38/ru | included item truncated to 200 chars |
| Tour | legacy:46 | destination left null — category 5 contradicts legacy chain (manual review) |
| Tour | legacy:47 | destination left null — category 6 contradicts legacy chain (manual review) |
| TourTranslation | legacy:47/fr | custom fact "What to bring" truncated to 200 chars |
| TourTranslation | legacy:48/fr | custom fact "What to bring" truncated to 200 chars |
| TourTranslation | legacy:48/fr | highlights item truncated to 200 chars |
| Tour | legacy:49 | destination left null — category 5 contradicts legacy chain (manual review) |
| Tour | legacy:50 | destination left null — Aswan tour misfiled under Sea Trips (manual review) |
| TourTranslation | legacy:50/en | highlights item truncated to 200 chars |
| Tour | legacy:51 | destination left null — Aswan tour misfiled under Sea Trips (manual review) |
| TourTranslation | legacy:51/en | highlights item truncated to 200 chars |
| Tour | legacy:52 | destination left null — Aswan tour misfiled under Sea Trips (manual review) |
| TourTranslation | legacy:52/en | highlights item truncated to 200 chars |
| HeroBanner | legacy:7 | empty English headline — needs content before manual entry |

## Row-level log

| Entity | Key | Action |
|---|---|---|
| Tour | legacy:39 | skipped (excluded — confirmed duplicate of Tour 2 (approved decision 2)) |
| Lead | O_Request (355 rows) | skipped (leads not migrated (approved decision 1)) |
| DestinationTranslation | legacy:2 (hurghada)/en | imported |
| DestinationTranslation | legacy:2 (hurghada)/de | imported |
| DestinationTranslation | legacy:2 (hurghada)/ru | imported |
| DestinationTranslation | legacy:2 (hurghada)/fr | imported |
| Destination | legacy:2 (hurghada) | imported |
| DestinationTranslation | legacy:3 (sharm-el-sheikh)/en | imported |
| DestinationTranslation | legacy:3 (sharm-el-sheikh)/de | imported |
| DestinationTranslation | legacy:3 (sharm-el-sheikh)/ru | imported |
| DestinationTranslation | legacy:3 (sharm-el-sheikh)/fr | imported |
| Destination | legacy:3 (sharm-el-sheikh) | imported |
| DestinationTranslation | legacy:4 (marsa-alam)/en | imported |
| DestinationTranslation | legacy:4 (marsa-alam)/de | imported |
| DestinationTranslation | legacy:4 (marsa-alam)/fr | imported |
| Destination | legacy:4 (marsa-alam) | imported |
| DestinationTranslation | legacy:5 (cairo)/en | imported |
| Destination | legacy:5 (cairo) | imported |
| CategoryTranslation | legacy:6 (cairo)/en | imported |
| CategoryTranslation | legacy:6 (cairo)/de | imported |
| CategoryTranslation | legacy:6 (cairo)/ru | imported |
| CategoryTranslation | legacy:6 (cairo)/fr | imported |
| CategoryTranslation | legacy:6 (cairo)/it | imported |
| Category | legacy:6 (cairo) | imported |
| CategoryTranslation | legacy:5 (luxor)/en | imported |
| CategoryTranslation | legacy:5 (luxor)/de | imported |
| CategoryTranslation | legacy:5 (luxor)/ru | imported |
| CategoryTranslation | legacy:5 (luxor)/fr | imported |
| CategoryTranslation | legacy:5 (luxor)/it | imported |
| Category | legacy:5 (luxor) | imported |
| CategoryTranslation | legacy:4 (seatrip)/en | imported |
| CategoryTranslation | legacy:4 (seatrip)/de | imported |
| CategoryTranslation | legacy:4 (seatrip)/ru | imported |
| CategoryTranslation | legacy:4 (seatrip)/fr | imported |
| CategoryTranslation | legacy:4 (seatrip)/it | imported |
| Category | legacy:4 (seatrip) | imported |
| CategoryTranslation | legacy:8 (nilecruise)/en | imported |
| CategoryTranslation | legacy:8 (nilecruise)/de | imported |
| CategoryTranslation | legacy:8 (nilecruise)/ru | imported |
| CategoryTranslation | legacy:8 (nilecruise)/fr | imported |
| CategoryTranslation | legacy:8 (nilecruise)/it | imported |
| Category | legacy:8 (nilecruise) | imported |
| CategoryTranslation | legacy:7 (safari)/en | imported |
| CategoryTranslation | legacy:7 (safari)/de | imported |
| CategoryTranslation | legacy:7 (safari)/ru | imported |
| CategoryTranslation | legacy:7 (safari)/fr | imported |
| CategoryTranslation | legacy:7 (safari)/it | imported |
| Category | legacy:7 (safari) | imported |
| CategoryTranslation | legacy:9 (entertainment)/en | imported |
| CategoryTranslation | legacy:9 (entertainment)/de | imported |
| CategoryTranslation | legacy:9 (entertainment)/ru | imported |
| CategoryTranslation | legacy:9 (entertainment)/fr | imported |
| CategoryTranslation | legacy:9 (entertainment)/it | imported |
| Category | legacy:9 (entertainment) | imported |
| Tour | legacy:2 (3-day-padi-open-water-diving-course) | imported |
| TourTranslation | legacy:2 (3-day-padi-open-water-diving-course)/en | imported |
| TourTranslation | legacy:2 (3-day-padi-open-water-diving-course)/de | imported |
| TourTranslation | legacy:2 (3-day-padi-open-water-diving-course)/ru | imported |
| TourTranslation | legacy:2 (3-day-padi-open-water-diving-course)/fr | imported |
| Tour | legacy:3 (turkish-bath-and-massage) | imported |
| TourTranslation | legacy:3 (turkish-bath-and-massage)/en | imported |
| TourTranslation | legacy:3 (turkish-bath-and-massage)/de | imported |
| TourTranslation | legacy:3 (turkish-bath-and-massage)/ru | imported |
| TourTranslation | legacy:3 (turkish-bath-and-massage)/fr | imported |
| Tour | legacy:4 (utopia-island-snorkeling-tour) | imported |
| TourTranslation | legacy:4 (utopia-island-snorkeling-tour)/en | imported |
| TourTranslation | legacy:4 (utopia-island-snorkeling-tour)/de | imported |
| TourTranslation | legacy:4 (utopia-island-snorkeling-tour)/ru | imported |
| TourTranslation | legacy:4 (utopia-island-snorkeling-tour)/fr | imported |
| Tour | legacy:5 (quad-bike-safari-saharapark) | imported |
| TourTranslation | legacy:5 (quad-bike-safari-saharapark)/en | imported |
| TourTranslation | legacy:5 (quad-bike-safari-saharapark)/de | imported |
| TourTranslation | legacy:5 (quad-bike-safari-saharapark)/ru | imported |
| TourTranslation | legacy:5 (quad-bike-safari-saharapark)/fr | imported |
| Tour | legacy:6 (parasailing-hurghada) | imported |
| TourTranslation | legacy:6 (parasailing-hurghada)/en | imported |
| TourTranslation | legacy:6 (parasailing-hurghada)/de | imported |
| TourTranslation | legacy:6 (parasailing-hurghada)/ru | imported |
| TourTranslation | legacy:6 (parasailing-hurghada)/fr | imported |
| Tour | legacy:7 (cairo-by-plane-from-hurghada) | imported |
| TourTranslation | legacy:7 (cairo-by-plane-from-hurghada)/en | imported |
| TourTranslation | legacy:7 (cairo-by-plane-from-hurghada)/de | imported |
| TourTranslation | legacy:7 (cairo-by-plane-from-hurghada)/ru | imported |
| TourTranslation | legacy:7 (cairo-by-plane-from-hurghada)/fr | imported |
| Tour | legacy:9 (giftun-island-snorkeling-trip) | imported |
| TourTranslation | legacy:9 (giftun-island-snorkeling-trip)/en | imported |
| TourTranslation | legacy:9 (giftun-island-snorkeling-trip)/de | imported |
| TourTranslation | legacy:9 (giftun-island-snorkeling-trip)/ru | imported |
| TourTranslation | legacy:9 (giftun-island-snorkeling-trip)/fr | imported |
| Tour | legacy:10 (luxor-by-bus) | imported |
| TourTranslation | legacy:10 (luxor-by-bus)/en | imported |
| TourTranslation | legacy:10 (luxor-by-bus)/de | imported |
| TourTranslation | legacy:10 (luxor-by-bus)/ru | imported |
| TourTranslation | legacy:10 (luxor-by-bus)/fr | imported |
| Tour | legacy:11 (luxor-private-tour) | imported |
| TourTranslation | legacy:11 (luxor-private-tour)/en | imported |
| TourTranslation | legacy:11 (luxor-private-tour)/de | imported |
| TourTranslation | legacy:11 (luxor-private-tour)/ru | imported |
| TourTranslation | legacy:11 (luxor-private-tour)/fr | imported |
| Tour | legacy:12 (sindbad-submarine) | imported |
| TourTranslation | legacy:12 (sindbad-submarine)/en | imported |
| TourTranslation | legacy:12 (sindbad-submarine)/de | imported |
| TourTranslation | legacy:12 (sindbad-submarine)/ru | imported |
| TourTranslation | legacy:12 (sindbad-submarine)/fr | imported |
| Tour | legacy:13 (hurghada-full-day-desert-safari-adventure-tour) | imported |
| TourTranslation | legacy:13 (hurghada-full-day-desert-safari-adventure-tour)/en | imported |
| TourTranslation | legacy:13 (hurghada-full-day-desert-safari-adventure-tour)/de | imported |
| Tour | legacy:14 (super-safari-discovery) | imported |
| TourTranslation | legacy:14 (super-safari-discovery)/en | imported |
| TourTranslation | legacy:14 (super-safari-discovery)/de | imported |
| TourTranslation | legacy:14 (super-safari-discovery)/ru | imported |
| Tour | legacy:15 (quad-atv) | imported |
| TourTranslation | legacy:15 (quad-atv)/en | imported |
| TourTranslation | legacy:15 (quad-atv)/de | imported |
| TourTranslation | legacy:15 (quad-atv)/ru | imported |
| TourTranslation | legacy:15 (quad-atv)/fr | imported |
| Tour | legacy:16 (dolphin-house-vip) | imported |
| TourTranslation | legacy:16 (dolphin-house-vip)/en | imported |
| TourTranslation | legacy:16 (dolphin-house-vip)/de | imported |
| TourTranslation | legacy:16 (dolphin-house-vip)/ru | imported |
| TourTranslation | legacy:16 (dolphin-house-vip)/fr | imported |
| Tour | legacy:17 (hurghada-city-tour) | imported |
| TourTranslation | legacy:17 (hurghada-city-tour)/en | imported |
| TourTranslation | legacy:17 (hurghada-city-tour)/de | imported |
| TourTranslation | legacy:17 (hurghada-city-tour)/ru | imported |
| TourTranslation | legacy:17 (hurghada-city-tour)/fr | imported |
| Tour | legacy:18 (orange-bay) | imported |
| TourTranslation | legacy:18 (orange-bay)/en | imported |
| TourTranslation | legacy:18 (orange-bay)/de | imported |
| TourTranslation | legacy:18 (orange-bay)/ru | imported |
| TourTranslation | legacy:18 (orange-bay)/fr | imported |
| Tour | legacy:19 (sea-scope-submarine-tour) | imported |
| TourTranslation | legacy:19 (sea-scope-submarine-tour)/en | imported |
| TourTranslation | legacy:19 (sea-scope-submarine-tour)/de | imported |
| TourTranslation | legacy:19 (sea-scope-submarine-tour)/fr | imported |
| Tour | legacy:20 (cairo-by-bus) | imported |
| TourTranslation | legacy:20 (cairo-by-bus)/en | imported |
| TourTranslation | legacy:20 (cairo-by-bus)/de | imported |
| TourTranslation | legacy:20 (cairo-by-bus)/ru | imported |
| TourTranslation | legacy:20 (cairo-by-bus)/fr | imported |
| Tour | legacy:21 (hurghada-grand-aquarium) | imported |
| TourTranslation | legacy:21 (hurghada-grand-aquarium)/en | imported |
| TourTranslation | legacy:21 (hurghada-grand-aquarium)/de | imported |
| TourTranslation | legacy:21 (hurghada-grand-aquarium)/ru | imported |
| TourTranslation | legacy:21 (hurghada-grand-aquarium)/fr | imported |
| Tour | legacy:24 (hurghada-dolphin-show) | imported |
| TourTranslation | legacy:24 (hurghada-dolphin-show)/en | imported |
| TourTranslation | legacy:24 (hurghada-dolphin-show)/de | imported |
| TourTranslation | legacy:24 (hurghada-dolphin-show)/ru | imported |
| TourTranslation | legacy:24 (hurghada-dolphin-show)/fr | imported |
| Tour | legacy:25 (alf-leila-wa-leila-fantasia) | imported |
| TourTranslation | legacy:25 (alf-leila-wa-leila-fantasia)/en | imported |
| TourTranslation | legacy:25 (alf-leila-wa-leila-fantasia)/de | imported |
| TourTranslation | legacy:25 (alf-leila-wa-leila-fantasia)/ru | imported |
| TourTranslation | legacy:25 (alf-leila-wa-leila-fantasia)/fr | imported |
| Tour | legacy:26 (sharm-el-naga) | imported |
| TourTranslation | legacy:26 (sharm-el-naga)/en | imported |
| TourTranslation | legacy:26 (sharm-el-naga)/de | imported |
| TourTranslation | legacy:26 (sharm-el-naga)/ru | imported |
| TourTranslation | legacy:26 (sharm-el-naga)/fr | imported |
| Tour | legacy:27 (quad-sunset-programe) | imported |
| TourTranslation | legacy:27 (quad-sunset-programe)/en | imported |
| TourTranslation | legacy:27 (quad-sunset-programe)/de | imported |
| TourTranslation | legacy:27 (quad-sunset-programe)/ru | imported |
| TourTranslation | legacy:27 (quad-sunset-programe)/fr | imported |
| Tour | legacy:28 (jeep-safari) | imported |
| TourTranslation | legacy:28 (jeep-safari)/en | imported |
| TourTranslation | legacy:28 (jeep-safari)/de | imported |
| TourTranslation | legacy:28 (jeep-safari)/ru | imported |
| TourTranslation | legacy:28 (jeep-safari)/fr | imported |
| Tour | legacy:29 (paradise-island) | imported |
| TourTranslation | legacy:29 (paradise-island)/en | imported |
| TourTranslation | legacy:29 (paradise-island)/de | imported |
| TourTranslation | legacy:29 (paradise-island)/fr | imported |
| Tour | legacy:30 (semi-submarine) | imported |
| TourTranslation | legacy:30 (semi-submarine)/en | imported |
| TourTranslation | legacy:30 (semi-submarine)/de | imported |
| TourTranslation | legacy:30 (semi-submarine)/ru | imported |
| TourTranslation | legacy:30 (semi-submarine)/fr | imported |
| Tour | legacy:31 (paradise-class-semi-submarine) | imported |
| TourTranslation | legacy:31 (paradise-class-semi-submarine)/en | imported |
| TourTranslation | legacy:31 (paradise-class-semi-submarine)/de | imported |
| TourTranslation | legacy:31 (paradise-class-semi-submarine)/ru | imported |
| Tour | legacy:32 (makadi-water-world-with-lunch-transfers) | imported |
| TourTranslation | legacy:32 (makadi-water-world-with-lunch-transfers)/en | imported |
| TourTranslation | legacy:32 (makadi-water-world-with-lunch-transfers)/de | imported |
| TourTranslation | legacy:32 (makadi-water-world-with-lunch-transfers)/ru | imported |
| TourTranslation | legacy:32 (makadi-water-world-with-lunch-transfers)/fr | imported |
| Tour | legacy:33 (luxury-yacht-trip-with-personal-crew-and-chef) | imported |
| TourTranslation | legacy:33 (luxury-yacht-trip-with-personal-crew-and-chef)/en | imported |
| TourTranslation | legacy:33 (luxury-yacht-trip-with-personal-crew-and-chef)/de | imported |
| TourTranslation | legacy:33 (luxury-yacht-trip-with-personal-crew-and-chef)/fr | imported |
| Tour | legacy:34 (paradise-speedboat-w-optional-snorkeling-lunch) | imported |
| TourTranslation | legacy:34 (paradise-speedboat-w-optional-snorkeling-lunch)/en | imported |
| TourTranslation | legacy:34 (paradise-speedboat-w-optional-snorkeling-lunch)/de | imported |
| TourTranslation | legacy:34 (paradise-speedboat-w-optional-snorkeling-lunch)/fr | imported |
| Tour | legacy:35 (cairo-private-tour) | imported |
| TourTranslation | legacy:35 (cairo-private-tour)/en | imported |
| TourTranslation | legacy:35 (cairo-private-tour)/de | imported |
| TourTranslation | legacy:35 (cairo-private-tour)/ru | imported |
| TourTranslation | legacy:35 (cairo-private-tour)/fr | imported |
| Tour | legacy:36 (black-white-desert) | imported |
| TourTranslation | legacy:36 (black-white-desert)/en | imported |
| TourTranslation | legacy:36 (black-white-desert)/de | imported |
| Tour | legacy:37 (cairo-2-days-by-bus) | imported |
| TourTranslation | legacy:37 (cairo-2-days-by-bus)/en | imported |
| TourTranslation | legacy:37 (cairo-2-days-by-bus)/de | imported |
| TourTranslation | legacy:37 (cairo-2-days-by-bus)/ru | imported |
| Tour | legacy:38 (private-half-day-sightseeing-tour-to-el-gouna-from-hurghada) | imported |
| TourTranslation | legacy:38 (private-half-day-sightseeing-tour-to-el-gouna-from-hurghada)/en | imported |
| TourTranslation | legacy:38 (private-half-day-sightseeing-tour-to-el-gouna-from-hurghada)/de | imported |
| TourTranslation | legacy:38 (private-half-day-sightseeing-tour-to-el-gouna-from-hurghada)/ru | imported |
| TourTranslation | legacy:38 (private-half-day-sightseeing-tour-to-el-gouna-from-hurghada)/fr | imported |
| Tour | legacy:40 (full-day-scuba-diving-discovery) | imported |
| TourTranslation | legacy:40 (full-day-scuba-diving-discovery)/en | imported |
| TourTranslation | legacy:40 (full-day-scuba-diving-discovery)/de | imported |
| TourTranslation | legacy:40 (full-day-scuba-diving-discovery)/ru | imported |
| TourTranslation | legacy:40 (full-day-scuba-diving-discovery)/fr | imported |
| Tour | legacy:41 (intro-diving-snorkeling-tour-with-lunch-drinks) | imported |
| TourTranslation | legacy:41 (intro-diving-snorkeling-tour-with-lunch-drinks)/en | imported |
| TourTranslation | legacy:41 (intro-diving-snorkeling-tour-with-lunch-drinks)/de | imported |
| TourTranslation | legacy:41 (intro-diving-snorkeling-tour-with-lunch-drinks)/ru | imported |
| TourTranslation | legacy:41 (intro-diving-snorkeling-tour-with-lunch-drinks)/fr | imported |
| Tour | legacy:42 (shore-diving-with-hotel-transfers) | imported |
| TourTranslation | legacy:42 (shore-diving-with-hotel-transfers)/en | imported |
| TourTranslation | legacy:42 (shore-diving-with-hotel-transfers)/de | imported |
| TourTranslation | legacy:42 (shore-diving-with-hotel-transfers)/ru | imported |
| TourTranslation | legacy:42 (shore-diving-with-hotel-transfers)/fr | imported |
| Tour | legacy:43 (half-day-professionals-diving-in-open-water-tour-with-lunch) | imported |
| TourTranslation | legacy:43 (half-day-professionals-diving-in-open-water-tour-with-lunch)/en | imported |
| TourTranslation | legacy:43 (half-day-professionals-diving-in-open-water-tour-with-lunch)/de | imported |
| TourTranslation | legacy:43 (half-day-professionals-diving-in-open-water-tour-with-lunch)/ru | imported |
| TourTranslation | legacy:43 (half-day-professionals-diving-in-open-water-tour-with-lunch)/fr | imported |
| Tour | legacy:44 (el-gouna-diving-or-snorkeling-2-spots-boat-trip-with-lunch) | imported |
| TourTranslation | legacy:44 (el-gouna-diving-or-snorkeling-2-spots-boat-trip-with-lunch)/en | imported |
| TourTranslation | legacy:44 (el-gouna-diving-or-snorkeling-2-spots-boat-trip-with-lunch)/de | imported |
| TourTranslation | legacy:44 (el-gouna-diving-or-snorkeling-2-spots-boat-trip-with-lunch)/ru | imported |
| TourTranslation | legacy:44 (el-gouna-diving-or-snorkeling-2-spots-boat-trip-with-lunch)/fr | imported |
| Tour | legacy:45 (desert-and-sea-horseback-riding-tour-with-transfer) | imported |
| TourTranslation | legacy:45 (desert-and-sea-horseback-riding-tour-with-transfer)/en | imported |
| TourTranslation | legacy:45 (desert-and-sea-horseback-riding-tour-with-transfer)/de | imported |
| TourTranslation | legacy:45 (desert-and-sea-horseback-riding-tour-with-transfer)/ru | imported |
| TourTranslation | legacy:45 (desert-and-sea-horseback-riding-tour-with-transfer)/fr | imported |
| Tour | legacy:46 (2-day-luxor-tour-with-hotel-balloon-boat-ride) | imported |
| TourTranslation | legacy:46 (2-day-luxor-tour-with-hotel-balloon-boat-ride)/en | imported |
| TourTranslation | legacy:46 (2-day-luxor-tour-with-hotel-balloon-boat-ride)/de | imported |
| TourTranslation | legacy:46 (2-day-luxor-tour-with-hotel-balloon-boat-ride)/ru | imported |
| TourTranslation | legacy:46 (2-day-luxor-tour-with-hotel-balloon-boat-ride)/fr | imported |
| Tour | legacy:47 (anthony-and-st-paul-monasteries-tour-from-hurghada-private-day-tour) | imported |
| TourTranslation | legacy:47 (anthony-and-st-paul-monasteries-tour-from-hurghada-private-day-tour)/en | imported |
| TourTranslation | legacy:47 (anthony-and-st-paul-monasteries-tour-from-hurghada-private-day-tour)/de | imported |
| TourTranslation | legacy:47 (anthony-and-st-paul-monasteries-tour-from-hurghada-private-day-tour)/ru | imported |
| TourTranslation | legacy:47 (anthony-and-st-paul-monasteries-tour-from-hurghada-private-day-tour)/fr | imported |
| Tour | legacy:48 (private-turtle-excursion-abu-dabbab-snorkeling-tour) | imported |
| TourTranslation | legacy:48 (private-turtle-excursion-abu-dabbab-snorkeling-tour)/en | imported |
| TourTranslation | legacy:48 (private-turtle-excursion-abu-dabbab-snorkeling-tour)/de | imported |
| TourTranslation | legacy:48 (private-turtle-excursion-abu-dabbab-snorkeling-tour)/ru | imported |
| TourTranslation | legacy:48 (private-turtle-excursion-abu-dabbab-snorkeling-tour)/fr | imported |
| Tour | legacy:49 (abydos-osireion-and-dendera-day-tour) | imported |
| TourTranslation | legacy:49 (abydos-osireion-and-dendera-day-tour)/en | imported |
| TourTranslation | legacy:49 (abydos-osireion-and-dendera-day-tour)/de | imported |
| TourTranslation | legacy:49 (abydos-osireion-and-dendera-day-tour)/ru | imported |
| TourTranslation | legacy:49 (abydos-osireion-and-dendera-day-tour)/fr | imported |
| Tour | legacy:50 (aswan-day-tour) | imported |
| TourTranslation | legacy:50 (aswan-day-tour)/en | imported |
| TourTranslation | legacy:50 (aswan-day-tour)/de | imported |
| TourTranslation | legacy:50 (aswan-day-tour)/ru | imported |
| Tour | legacy:51 (aswan-abu-simbel-two-days-tour) | imported |
| TourTranslation | legacy:51 (aswan-abu-simbel-two-days-tour)/en | imported |
| TourTranslation | legacy:51 (aswan-abu-simbel-two-days-tour)/de | imported |
| TourTranslation | legacy:51 (aswan-abu-simbel-two-days-tour)/ru | imported |
| Tour | legacy:52 (3-days-tour-aswan-and-abu-simbel) | imported |
| TourTranslation | legacy:52 (3-days-tour-aswan-and-abu-simbel)/en | imported |
| TourTranslation | legacy:52 (3-days-tour-aswan-and-abu-simbel)/de | imported |
| TourTranslation | legacy:52 (3-days-tour-aswan-and-abu-simbel)/ru | imported |
| Tour | legacy:69 (mini-egypt-park-entry-ticket-tour-and-transfers) | imported |
| TourTranslation | legacy:69 (mini-egypt-park-entry-ticket-tour-and-transfers)/en | imported |
| TourTranslation | legacy:69 (mini-egypt-park-entry-ticket-tour-and-transfers)/de | imported |
| TourTranslation | legacy:69 (mini-egypt-park-entry-ticket-tour-and-transfers)/fr | imported |
| Tour | legacy:108 (hurghada-hula-hula-island-boat-trip-with-snorkeling-lunch) | imported |
| TourTranslation | legacy:108 (hurghada-hula-hula-island-boat-trip-with-snorkeling-lunch)/en | imported |
| TourTranslation | legacy:108 (hurghada-hula-hula-island-boat-trip-with-snorkeling-lunch)/de | imported |
| TourTranslation | legacy:108 (hurghada-hula-hula-island-boat-trip-with-snorkeling-lunch)/fr | imported |
| Tour | legacy:109 (hurghada-makadi-water-world-ticket-lunch-hotel-transfer) | imported |
| TourTranslation | legacy:109 (hurghada-makadi-water-world-ticket-lunch-hotel-transfer)/en | imported |
| TourTranslation | legacy:109 (hurghada-makadi-water-world-ticket-lunch-hotel-transfer)/de | imported |
| TourTranslation | legacy:109 (hurghada-makadi-water-world-ticket-lunch-hotel-transfer)/fr | imported |
| Faq | legacy:6 | imported |
| FaqTranslation | legacy:6/en | imported |
| FaqTranslation | legacy:6/de | imported |
| FaqTranslation | legacy:6/ru | imported |
| FaqTranslation | legacy:6/fr | imported |
| Faq | legacy:8 | imported |
| FaqTranslation | legacy:8/en | imported |
| FaqTranslation | legacy:8/de | imported |
| FaqTranslation | legacy:8/ru | imported |
| FaqTranslation | legacy:8/fr | imported |
| Faq | legacy:9 | imported |
| FaqTranslation | legacy:9/en | imported |
| FaqTranslation | legacy:9/de | imported |
| FaqTranslation | legacy:9/ru | imported |
| FaqTranslation | legacy:9/fr | imported |
| Faq | legacy:10 | imported |
| FaqTranslation | legacy:10/en | imported |
| FaqTranslation | legacy:10/de | imported |
| FaqTranslation | legacy:10/ru | imported |
| FaqTranslation | legacy:10/fr | imported |
| BlogPost | legacy:1 (top-sea-trips-for-kids) | imported |
| BlogPostTranslation | legacy:1 (top-sea-trips-for-kids)/en | imported |
| BlogPost | legacy:2 (traditional-food-to-try-while-visiting-egypt) | imported |
| BlogPostTranslation | legacy:2 (traditional-food-to-try-while-visiting-egypt)/en | imported |
| BlogPost | legacy:3 (hurghada-red-sea-egypt) | imported |
| BlogPostTranslation | legacy:3 (hurghada-red-sea-egypt)/en | imported |
| BlogPost | legacy:4 (5-best-places-to-visit-in-egypt) | imported |
| BlogPostTranslation | legacy:4 (5-best-places-to-visit-in-egypt)/en | imported |
| Vehicle | legacy:1 (Kia Sportage 2022) | imported |
| Vehicle | legacy:2 (Mini Bus) | imported |
| Vehicle | legacy:3 (Toyota HiAce 2024) | imported |
