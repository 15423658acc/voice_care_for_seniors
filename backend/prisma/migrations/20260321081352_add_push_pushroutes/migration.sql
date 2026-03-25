/*
  Warnings:

  - Added the required column `medicine` to the `reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `reminders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `reminders` ADD COLUMN `medicine` VARCHAR(191) NOT NULL,
    ADD COLUMN `taken` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `time` VARCHAR(191) NOT NULL;
