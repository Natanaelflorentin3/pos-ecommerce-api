import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioActualPayload } from '../auth/decorators/usuario-actual.decorator';
import { ClientesService } from './clientes.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Rol.CLIENTE)
@Controller('clientes/me')
export class ClientesController {
  constructor(private clientesService: ClientesService) {}

  @Post('direcciones')
  agregarDireccion(@UsuarioActual() usuario: UsuarioActualPayload, @Body() dto: CreateDireccionDto) {
    return this.clientesService.agregarDireccion(usuario.id, dto);
  }

  @Get('direcciones')
  listarDirecciones(@UsuarioActual() usuario: UsuarioActualPayload) {
    return this.clientesService.listarDirecciones(usuario.id);
  }
}