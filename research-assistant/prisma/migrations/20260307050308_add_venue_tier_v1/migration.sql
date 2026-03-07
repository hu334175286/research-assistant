-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Paper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "source" TEXT,
    "tags" TEXT,
    "summaryJson" TEXT,
    "venueTier" TEXT NOT NULL DEFAULT 'unknown',
    "venueMatchedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Paper" ("createdAt", "id", "source", "summaryJson", "tags", "title", "updatedAt", "year") SELECT "createdAt", "id", "source", "summaryJson", "tags", "title", "updatedAt", "year" FROM "Paper";
DROP TABLE "Paper";
ALTER TABLE "new_Paper" RENAME TO "Paper";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
