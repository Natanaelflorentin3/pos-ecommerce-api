import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioActualPayload } from '../auth/decorators/usuario-actual.decorator';
import { OrdenesService } from './ordenes.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdenManualDto } from './dto/orden-manual.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { FiltroOrdenesDto } from './dto/filtro-ordenes.dto';

@ApiTags('Órdenes y logística')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('ordenes')
export class OrdenesController {
  constructor(private ordenesService: OrdenesService) {}

  @Post('checkout')
  @Roles(Rol.CLIENTE)
  checkout(@UsuarioActual() usuario: UsuarioActualPayload, @Body() dto: CheckoutDto) {
    return this.ordenesService.checkout(usuario.id, dto);
  }

  @Post('manual')
  @Roles(Rol.ADMIN)
  registrarManual(@Body() dto: OrdenManualDto) {
    return this.ordenesService.registrarManual(dto);
  }

  @Get('mis-ordenes')
  @Roles(Rol.CLIENTE)
  misOrdenes(@UsuarioActual() usuario: UsuarioActualPayload) {
    return this.ordenesService.misOrdenes(usuario.id);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.CAJERO)
  listar(@Query() filtro: FiltroOrdenesDto) {
    return this.ordenesService.listar(filtro.estado);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.CAJERO, Rol.CLIENTE)
  ver(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioActualPayload) {
    return this.ordenesService.verOrden(id, usuario);
  }

  @Patch(':id/estado')
  @Roles(Rol.ADMIN)
  cambiarEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: CambiarEstadoDto) {
    return this.ordenesService.cambiarEstado(id, dto.estado);
  }
}