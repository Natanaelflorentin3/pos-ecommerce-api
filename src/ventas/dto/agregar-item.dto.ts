import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AgregarItemDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @IsPositive()
  productoId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  cantidad: number;
}