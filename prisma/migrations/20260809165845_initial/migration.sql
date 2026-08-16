-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'COURIER') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isAccountClient` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Client_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BL` (
    `id` VARCHAR(191) NOT NULL,
    `blNumber` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paymentMethod` ENUM('CASH', 'CHEQUE', 'ACCOUNT') NOT NULL,
    `paymentStatus` ENUM('PENDING', 'PAID') NOT NULL,
    `deliveryDate` DATETIME(3) NOT NULL,
    `comments` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `courierId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `BL_blNumber_key`(`blNumber`),
    INDEX `BL_blNumber_idx`(`blNumber`),
    INDEX `BL_clientId_idx`(`clientId`),
    INDEX `BL_courierId_idx`(`courierId`),
    INDEX `BL_deliveryDate_idx`(`deliveryDate`),
    INDEX `BL_paymentStatus_idx`(`paymentStatus`),
    INDEX `BL_paymentMethod_idx`(`paymentMethod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BL` ADD CONSTRAINT `BL_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BL` ADD CONSTRAINT `BL_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
