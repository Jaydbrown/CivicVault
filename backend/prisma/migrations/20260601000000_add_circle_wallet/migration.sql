-- Add Circle Programmable Wallet fields to User
ALTER TABLE "User" ADD COLUMN "circleWalletId" TEXT;
ALTER TABLE "User" ADD COLUMN "circleWalletAddress" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_circleWalletId_key" ON "User"("circleWalletId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_circleWalletAddress_key" ON "User"("circleWalletAddress");
