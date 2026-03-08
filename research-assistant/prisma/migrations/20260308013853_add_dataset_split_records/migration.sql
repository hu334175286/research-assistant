-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN "metricsJson" TEXT;

-- CreateTable
CREATE TABLE "DatasetSplit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "datasetId" TEXT NOT NULL,
    "split" TEXT NOT NULL,
    "count" INTEGER,
    "ratio" REAL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DatasetSplit_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DatasetSplit_datasetId_idx" ON "DatasetSplit"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetSplit_datasetId_split_key" ON "DatasetSplit"("datasetId", "split");
