import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioActualPayload } from '../auth/decorators/usuario-actual.decorator';
import { VentasService } from './ventas.service';
import { AgregarItemDto } from './dto/agregar-item.dto';
import { CobrarVentaDto } from './dto/cobrar-venta.dto';
import { FiltroVentasDto } from './dto/filtro-ventas.dto';

@ApiTags('Ventas (POS)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Rol.ADMIN, Rol.CAJERO)
@Controller('ventas')
export class VentasController {
  constructor(private ventasService: VentasService) {}

  @Post()
  abrir(@UsuarioActual() usuario: UsuarioActualPayload) {
    return this.ventasService.abrir(usuario.id);
  }

  @Get()
  historial(@Query() filtro: FiltroVentasDto) {
    return this.ventasService.historialDelDia(filtro.fecha);
  }

  @Get(':id')
  comprobante(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.obtenerComprobante(id);
  }

  @Post(':id/items')
  agregarItem(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() usuario: UsuarioActualPayload,
    @Body() dto: AgregarItemDto,
  ) {
    return this.ventasService.agregarItem(id, usuario.id, dto);
  }

  @Delete(':id/items/:productoId')
  quitarItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('productoId', ParseIntPipe) productoId: number,
    @UsuarioActual() usuario: UsuarioActualPayload,
  ) {
    return this.ventasService.quitarItem(id, productoId, usuario.id);
  }

  @Post(':id/cobrar')
  @HttpCode(200)
  cobrar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() usuario: UsuarioActualPayload,
    @Body() dto: CobrarVentaDto,
  ) {
    return this.ventasService.cobrar(id, usuario.id, dto.metodoPago);
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() usuario: UsuarioActualPayload,
  ) {
    return this.ventasService.cancelar(id, usuario.id);
  }
}