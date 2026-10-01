import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioActualPayload } from '../auth/decorators/usuario-actual.decorator';
import { CajasService } from './cajas.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';

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


  @Post('cerrar')
  cerrar(@UsuarioActual() usuario: UsuarioActualPayload, @Body() dto: CerrarCajaDto) {
    return this.cajasService.cerrar(usuario.id, dto);
  }

  @Get()
  @Roles(Rol.ADMIN)
  listar() {
    return this.cajasService.listar();
  }

  @Get(':id/conciliacion')
  @Roles(Rol.ADMIN)
  conciliacion(@Param('id', ParseIntPipe) id: number) {
    return this.cajasService.conciliacion(id);
  }

}