import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Rol } from '../../generated/prisma/client';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Gómez' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiProperty({ example: 'ana@pos.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'cajero123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: [Rol.ADMIN, Rol.CAJERO] })
  @IsIn([Rol.ADMIN, Rol.CAJERO], { message: 'El rol debe ser ADMIN o CAJERO' })
  rol: Rol;
}