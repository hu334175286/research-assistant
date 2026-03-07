-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "source" TEXT,
    "license" TEXT,
    "tags" TEXT,
    "storagePath" TEXT,
    "version" TEXT,
    "sizeBytes" INTEGER,
    "fileHash" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hypothesis" TEXT,
    "configJson" TEXT,
    "metricsJson" TEXT,
    "conclusion" TEXT,
    "datasetId" TEXT,
    "datasetVersionSnapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Experiment_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Experiment" ("conclusion", "configJson", "createdAt", "hypothesis", "id", "metricsJson", "name", "updatedAt") SELECT "conclusion", "configJson", "createdAt", "hypothesis", "id", "metricsJson", "name", "updatedAt" FROM "Experiment";
DROP TABLE "Experiment";
ALTER TABLE "new_Experiment" RENAME TO "Experiment";
CREATE INDEX "Experiment_datasetId_idx" ON "Experiment"("datasetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
