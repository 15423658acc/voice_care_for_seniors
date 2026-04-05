-- AlterTable
ALTER TABLE `users` ADD COLUMN `age` INTEGER NULL,
    ADD COLUMN `full_name` VARCHAR(191) NULL,
    ADD COLUMN `parent_id` INTEGER NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
