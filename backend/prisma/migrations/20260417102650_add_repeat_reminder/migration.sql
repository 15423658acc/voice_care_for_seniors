-- AlterTable
ALTER TABLE `reminders` ADD COLUMN `next_remind_at` DATETIME(3) NULL,
    ADD COLUMN `repeat_type` VARCHAR(191) NULL DEFAULT 'none';
