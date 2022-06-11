/*
  Warnings:

  - The primary key for the `GameUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_winnerId_fkey";

-- DropForeignKey
ALTER TABLE "GameUser" DROP CONSTRAINT "GameUser_userId_fkey";

-- AlterTable
ALTER TABLE "Game" ALTER COLUMN "winnerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "GameUser" DROP CONSTRAINT "GameUser_pkey",
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "GameUser_pkey" PRIMARY KEY ("gameId", "userId");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(200),
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameUser" ADD CONSTRAINT "GameUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
