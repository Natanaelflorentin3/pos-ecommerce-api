import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioActualPayload } from '../auth/decorators/usuario-actual.decorator';
import { CajasService } from './cajas.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';

@ApiTags('Cajas')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Rol.ADMIN, Rol.CAJERO)
@Controller('cajas')
export class CajasController {
  constructor(private cajasService: CajasService) {}

  @Post('abrir')
  abrir(@UsuarioActual() usuario: UsuarioActualPayload, @Body() dto: AbrirCajaDto) {
    return this.cajasService.abrir(usuario.id, dto);
  }

  @Get('actual')
  actual(@UsuarioActual() usuario: UsuarioActualPayload) {
    return this.cajasService.obtenerCajaAbierta(usuario.id);
  }
}