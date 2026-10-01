import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EstadoOrden } from '../../generated/prisma/client';

export class CambiarEstadoDto {
  @ApiProperty({ enum: EstadoOrden, example: EstadoOrden.PAGADO })
  @IsEnum(EstadoOrden)
  estado: EstadoOrden;
}