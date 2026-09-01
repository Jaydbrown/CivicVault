-- CreateTable
CREATE TABLE "UssdUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pinHash" TEXT,
    "failedPinTries" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "enrolledBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UssdUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CircleTxLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "functionName" TEXT NOT NULL,
    "argsJson" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "challengeId" TEXT,
    "circleTxId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'CREATED',
    "txHash" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CircleTxLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "privyUserId" TEXT,
    "email" TEXT,
    "gmailAccessToken" TEXT,
    "gmailRefreshToken" TEXT,
    "circleWalletId" TEXT,
    "circleWalletAddress" TEXT,
    "walletTier" TEXT NOT NULL DEFAULT 'USER_CONTROLLED',
    "circleUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("circleWalletAddress", "circleWalletId", "createdAt", "email", "gmailAccessToken", "gmailRefreshToken", "id", "walletAddress") SELECT "circleWalletAddress", "circleWalletId", "createdAt", "email", "gmailAccessToken", "gmailRefreshToken", "id", "walletAddress" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
CREATE UNIQUE INDEX "User_privyUserId_key" ON "User"("privyUserId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_circleWalletId_key" ON "User"("circleWalletId");
CREATE UNIQUE INDEX "User_circleWalletAddress_key" ON "User"("circleWalletAddress");
CREATE UNIQUE INDEX "User_circleUserId_key" ON "User"("circleUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UssdUser_phoneNumber_key" ON "UssdUser"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UssdUser_userId_key" ON "UssdUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleTxLog_refId_key" ON "CircleTxLog"("refId");

-- CreateIndex
CREATE INDEX "CircleTxLog_userId_createdAt_idx" ON "CircleTxLog"("userId", "createdAt");

