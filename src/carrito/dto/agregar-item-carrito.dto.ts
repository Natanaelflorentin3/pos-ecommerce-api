import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AgregarItemCarritoDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @IsPositive()
  productoId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  cantidad: number;
}