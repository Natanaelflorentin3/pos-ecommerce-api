import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDireccionDto {
  @ApiProperty({ example: 'Córdoba 1234' })
  @IsString()
  @IsNotEmpty()
  calle: string;

  @ApiProperty({ example: 'Rosario' })
  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @ApiPropertyOptional({ example: 'Portón negro, timbre 2B' })
  @IsOptional()
  @IsString()
  referencias?: string;
}