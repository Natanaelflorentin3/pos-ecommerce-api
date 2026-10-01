import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EstadoOrden } from '../../generated/prisma/client';

export class FiltroOrdenesDto {
  @ApiPropertyOptional({ enum: EstadoOrden })
  @IsOptional()
  @IsEnum(EstadoOrden)
  estado?: EstadoOrden;
}