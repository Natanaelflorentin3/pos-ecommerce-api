import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ example: 1, description: 'Id de una dirección del cliente' })
  @IsInt()
  @IsPositive()
  direccionId: number;
}