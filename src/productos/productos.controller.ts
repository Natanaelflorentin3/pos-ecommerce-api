import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioActualPayload } from '../auth/decorators/usuario-actual.decorator';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { FiltroProductosDto } from './dto/filtro-productos.dto';

@ApiTags('Productos')
@Controller('productos')
export class ProductosController {
  constructor(private productosService: ProductosService) {}

  // ─── Públicos ───
  @Get()
  catalogo(@Query() filtro: FiltroProductosDto) {
    return this.productosService.catalogoPublico(filtro.categoriaId);
  }

  @Get('inventario')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.ADMIN, Rol.CAJERO)
  inventario(
    @UsuarioActual() usuario: UsuarioActualPayload,
    @Query() filtro: FiltroProductosDto,
  ) {
    return this.productosService.inventario(usuario.rol, filtro.categoriaId);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.detallePublico(id);
  }

  // ─── Solo ADMIN ───
  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.ADMIN)
  crear(@Body() dto: CreateProductoDto) {
    return this.productosService.crear(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.ADMIN)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductoDto) {
    return this.productosService.actualizar(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.ADMIN)
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.desactivar(id);
  }
}