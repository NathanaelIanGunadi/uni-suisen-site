-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "notifyOnNewSubmission" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnReviewDecision" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("email", "firstName", "id", "lastName", "password", "role") SELECT "email", "firstName", "id", "lastName", "password", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
