-- CreateEnum
CREATE TYPE "ShippingType" AS ENUM ('mensajeria', 'rutas_propias');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "shippingType" "ShippingType";
