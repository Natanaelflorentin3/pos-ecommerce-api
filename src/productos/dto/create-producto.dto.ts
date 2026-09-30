import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateProductoDto {
  @ApiProperty({ example: 'Llavero personalizado' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 'Impreso en PLA, 6 cm' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 1200 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  costo: number;

  @ApiProperty({ example: 3000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precioVenta: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  categoriaId: number;
}