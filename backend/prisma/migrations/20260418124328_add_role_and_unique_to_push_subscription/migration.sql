/*
  Warnings:

  - A unique constraint covering the columns `[endpoint,userId]` on the table `push_subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `role` to the `push_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `push_subscriptions_endpoint_key` ON `push_subscriptions`;

-- AlterTable
ALTER TABLE `push_subscriptions` ADD COLUMN `role` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `push_subscriptions_endpoint_userId_key` ON `push_subscriptions`(`endpoint`, `userId`);
