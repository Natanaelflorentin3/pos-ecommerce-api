/*
  Warnings:

  - A unique constraint covering the columns `[ventaId,productoId]` on the table `DetalleVenta` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('ABIERTA', 'COMPLETADA', 'CANCELADA');

-- DropForeignKey
ALTER TABLE "DetalleVenta" DROP CONSTRAINT "DetalleVenta_ventaId_fkey";

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "estado" "EstadoVenta" NOT NULL DEFAULT 'ABIERTA',
ALTER COLUMN "total" SET DEFAULT 0,
ALTER COLUMN "metodoPago" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DetalleVenta_ventaId_productoId_key" ON "DetalleVenta"("ventaId", "productoId");

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
