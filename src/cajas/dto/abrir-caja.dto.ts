import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class AbrirCajaDto {
  @ApiProperty({ example: 5000, description: 'Efectivo con el que arranca el cajón' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoInicial: number;
}