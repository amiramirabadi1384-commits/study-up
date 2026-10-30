-- This is an empty migration.
CREATE UNIQUE INDEX "user_plan_all_unique"
ON "userPlans" ("userId", "planId")
WHERE "courseId" IS NULL;