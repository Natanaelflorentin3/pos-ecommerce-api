import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';

export class FiltroVentasDto {
  @ApiProperty({ example: '2026-09-30' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  @IsDateString({ strict: true }, { message: 'La fecha no es válida' })
  fecha: string;
}