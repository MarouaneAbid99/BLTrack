-- Phase 1 is deliberately additive: legacy BL columns remain available until
-- the mobile and admin clients have migrated to the V2 contract.

ALTER TABLE `BL`
  ADD COLUMN `blDate` DATETIME(3) NULL,
  ADD COLUMN `createdById` VARCHAR(191) NULL,
  MODIFY COLUMN `paymentMethod` ENUM('CASH', 'CHEQUE', 'ACCOUNT') NULL;

UPDATE `BL`
SET
  `blDate` = `deliveryDate`,
  `createdById` = `courierId`
WHERE `blDate` IS NULL OR `createdById` IS NULL;

ALTER TABLE `BL`
  MODIFY COLUMN `blDate` DATETIME(3) NOT NULL,
  MODIFY COLUMN `createdById` VARCHAR(191) NOT NULL,
  ADD INDEX `BL_blDate_idx` (`blDate`),
  ADD INDEX `BL_createdById_idx` (`createdById`),
  ADD CONSTRAINT `BL_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `Avoir` (
  `id` VARCHAR(191) NOT NULL,
  `brReference` VARCHAR(191) NOT NULL,
  `avoirDate` DATETIME(3) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `blId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,

  INDEX `Avoir_brReference_idx` (`brReference`),
  INDEX `Avoir_blId_idx` (`blId`),
  INDEX `Avoir_clientId_idx` (`clientId`),
  INDEX `Avoir_createdById_idx` (`createdById`),
  INDEX `Avoir_avoirDate_idx` (`avoirDate`),
  CONSTRAINT `Avoir_amount_positive` CHECK (`amount` > 0),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Payment` (
  `id` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('PAID', 'UNPAID', 'EN_COMPTE') NOT NULL,
  `method` ENUM('CASH', 'CHEQUE') NULL,
  `paidAt` DATETIME(3) NULL,
  `isLegacyMigrated` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `blId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,

  UNIQUE INDEX `Payment_blId_key` (`blId`),
  INDEX `Payment_createdById_idx` (`createdById`),
  INDEX `Payment_status_idx` (`status`),
  INDEX `Payment_paidAt_idx` (`paidAt`),
  CONSTRAINT `Payment_amount_positive` CHECK (`amount` > 0),
  CONSTRAINT `Payment_state_valid` CHECK (
    (`status` = 'PAID' AND `method` IS NOT NULL AND (`paidAt` IS NOT NULL OR `isLegacyMigrated` = true))
    OR (`status` IN ('UNPAID', 'EN_COMPTE') AND `method` IS NULL AND `paidAt` IS NULL)
  ),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Payment` (
  `id`, `amount`, `status`, `method`, `paidAt`, `isLegacyMigrated`,
  `createdAt`, `updatedAt`, `blId`, `createdById`
)
SELECT
  UUID(),
  `BL`.`amount`,
  CASE
    WHEN `BL`.`paymentStatus` = 'PAID' THEN 'PAID'
    WHEN `BL`.`paymentMethod` = 'ACCOUNT' THEN 'EN_COMPTE'
    ELSE 'UNPAID'
  END,
  CASE
    WHEN `BL`.`paymentStatus` = 'PAID' AND `BL`.`paymentMethod` IN ('CASH', 'CHEQUE')
      THEN `BL`.`paymentMethod`
    ELSE NULL
  END,
  NULL,
  true,
  `BL`.`createdAt`,
  `BL`.`updatedAt`,
  `BL`.`id`,
  `BL`.`createdById`
FROM `BL`
WHERE NOT EXISTS (SELECT 1 FROM `Payment` WHERE `Payment`.`blId` = `BL`.`id`);

ALTER TABLE `Avoir`
  ADD CONSTRAINT `Avoir_blId_fkey`
    FOREIGN KEY (`blId`) REFERENCES `BL` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `Avoir_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `Client` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `Avoir_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Payment`
  ADD CONSTRAINT `Payment_blId_fkey`
    FOREIGN KEY (`blId`) REFERENCES `BL` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `Payment_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
