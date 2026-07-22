-- Remove homepage sections that the public homepage never renders. These were
-- editor-only rows (an admin could edit their copy with no effect on the live
-- page). Their translation rows are removed automatically via ON DELETE CASCADE.
DELETE FROM "HomepageSection" WHERE "key" IN ('categories', 'testimonials');
