-- DropForeignKey
ALTER TABLE "WebSocketConnection" DROP CONSTRAINT "WebSocketConnection_systemId_fkey";

-- DropForeignKey
ALTER TABLE "websocket_logs" DROP CONSTRAINT "websocket_logs_systemId_fkey";

-- AlterTable
ALTER TABLE "WebSocketConnection" ADD COLUMN     "loggingEnabled" BOOLEAN NOT NULL DEFAULT true;
