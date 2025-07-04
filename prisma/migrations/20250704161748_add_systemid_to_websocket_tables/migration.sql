/*
  Warnings:

  - A unique constraint covering the columns `[type,referenceId,systemId]` on the table `WebSocketConnection` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `systemId` to the `WebSocketConnection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `systemId` to the `websocket_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WebSocketConnection_type_referenceId_key";

-- Step 1: Add systemId columns with default values to handle existing data
ALTER TABLE "WebSocketConnection" ADD COLUMN "systemId" TEXT DEFAULT 'cmcnvo5an0006y2hyyjx951fi';
ALTER TABLE "websocket_logs" ADD COLUMN "systemId" TEXT DEFAULT 'cmcnvo5an0006y2hyyjx951fi';

-- Step 2: Update existing records to use the default systemId
UPDATE "WebSocketConnection" SET "systemId" = 'cmcnvo5an0006y2hyyjx951fi' WHERE "systemId" IS NULL;
UPDATE "websocket_logs" SET "systemId" = 'cmcnvo5an0006y2hyyjx951fi' WHERE "systemId" IS NULL;

-- Step 3: Remove default values and make columns NOT NULL
ALTER TABLE "WebSocketConnection" ALTER COLUMN "systemId" DROP DEFAULT;
ALTER TABLE "WebSocketConnection" ALTER COLUMN "systemId" SET NOT NULL;
ALTER TABLE "websocket_logs" ALTER COLUMN "systemId" DROP DEFAULT;
ALTER TABLE "websocket_logs" ALTER COLUMN "systemId" SET NOT NULL;

-- Step 4: Add foreign key constraints
ALTER TABLE "WebSocketConnection" ADD CONSTRAINT "WebSocketConnection_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "websocket_logs" ADD CONSTRAINT "websocket_logs_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Create indexes
CREATE INDEX "WebSocketConnection_systemId_idx" ON "WebSocketConnection"("systemId");
CREATE INDEX "websocket_logs_systemId_idx" ON "websocket_logs"("systemId");

-- Step 6: Create unique constraint
CREATE UNIQUE INDEX "WebSocketConnection_type_referenceId_systemId_key" ON "WebSocketConnection"("type", "referenceId", "systemId");
