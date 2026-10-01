import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

export class ItemOrdenDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @IsPositive()
  productoId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  cantidad: number;
}

export class OrdenManualDto {
  @ApiProperty({ example: 'Carlos Ruiz' })
  @IsString()
  @IsNotEmpty()
  nombreContacto: string;

  @ApiProperty({ example: '3415556677' })
  @IsString()
  @IsNotEmpty()
  telefonoContacto: string;

  @ApiProperty({ example: 'San Martín 500, Rosario' })
  @IsString()
  @IsNotEmpty()
  direccionEnvio: string;

  @ApiPropertyOptional({ example: 'Local de ropa, preguntar por Carlos' })
  @IsOptional()
  @IsString()
  referencias?: string;

  @ApiProperty({ type: [ItemOrdenDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'La orden necesita al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenDto)
  items: ItemOrdenDto[];
}