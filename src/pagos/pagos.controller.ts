import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioActualPayload } from '../auth/decorators/usuario-actual.decorator';
import type { MockpayWebhook } from './mockpay-webhook.interface';
import { PagosService } from './pagos.service';

@ApiTags('Pagos (MockPay)')
@Controller('pagos')
export class PagosController {
  constructor(private pagosService: PagosService) {}

  @Post('orden/:ordenId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.CLIENTE)
  iniciar(
    @Param('ordenId', ParseIntPipe) ordenId: number,
    @UsuarioActual() usuario: UsuarioActualPayload,
  ) {
    return this.pagosService.iniciarPago(ordenId, usuario.id);
  }

  // Público: lo llama MockPay, no un usuario
  @Post('webhook')
  @HttpCode(200)
  webhook(@Body() evento: MockpayWebhook) {
    return this.pagosService.procesarWebhook(evento);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.ADMIN)
  listar() {
    return this.pagosService.listar();
  }
}