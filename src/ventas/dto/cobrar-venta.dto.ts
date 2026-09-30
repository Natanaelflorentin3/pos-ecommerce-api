import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MetodoPago } from '../../generated/prisma/client';

export class CobrarVentaDto {
  @ApiProperty({ enum: MetodoPago, example: MetodoPago.EFECTIVO })
  @IsEnum(MetodoPago, { message: 'Método de pago inválido: EFECTIVO, TARJETA o TRANSFERENCIA_QR' })
  metodoPago: MetodoPago;
}