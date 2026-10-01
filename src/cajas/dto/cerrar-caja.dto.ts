import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class CerrarCajaDto {
  @ApiProperty({ example: 20000, description: 'Efectivo contado en el cajón al cerrar' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoFinalDeclarado: number;
}