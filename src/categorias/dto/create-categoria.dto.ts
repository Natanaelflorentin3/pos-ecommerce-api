import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Llaveros' })
  @IsString()
  @IsNotEmpty()
  nombre: string;
}