import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioActualPayload } from '../auth/decorators/usuario-actual.decorator';
import { CarritoService } from './carrito.service';
import { AgregarItemCarritoDto } from './dto/agregar-item-carrito.dto';

@ApiTags('Carrito (tienda online)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Rol.CLIENTE)
@Controller('carrito')
export class CarritoController {
  constructor(private carritoService: CarritoService) {}

  @Get()
  ver(@UsuarioActual() usuario: UsuarioActualPayload) {
    return this.carritoService.ver(usuario.id);
  }

  @Post('items')
  agregarItem(@UsuarioActual() usuario: UsuarioActualPayload, @Body() dto: AgregarItemCarritoDto) {
    return this.carritoService.agregarItem(usuario.id, dto);
  }

  @Delete('items/:productoId')
  quitarItem(
    @UsuarioActual() usuario: UsuarioActualPayload,
    @Param('productoId', ParseIntPipe) productoId: number,
  ) {
    return this.carritoService.quitarItem(usuario.id, productoId);
  }
}