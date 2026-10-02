import {
  BadGatewayException, BadRequestException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstadoOrden, EstadoPago } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientesService } from '../clientes/clientes.service';
import type { MockpayWebhook } from './mockpay-webhook.interface';

@Injectable()
export class PagosService {
  constructor(
    private prisma: PrismaService,
    private clientesService: ClientesService,
    private config: ConfigService,
  ) {}

  // 1. El cliente inicia el pago de SU orden pendiente
  async iniciarPago(ordenId: number, usuarioId: number) {
    const cliente = await this.clientesService.obtenerPorUsuario(usuarioId);
    const orden = await this.prisma.orden.findUnique({ where: { id: ordenId } });
    if (!orden) throw new NotFoundException('Orden no encontrada');
    if (orden.clienteId !== cliente.id) throw new ForbiddenException('Esta orden no te pertenece');
    if (orden.estado !== EstadoOrden.PENDIENTE) {
      throw new BadRequestException(`La orden está ${orden.estado}, no se puede pagar`);
    }

    const respuesta = await fetch(
      `${this.config.getOrThrow<string>('MOCKPAY_API_URL')}/api/v1/payments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.getOrThrow<string>('MOCKPAY_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: orden.total.toNumber(),
          currency: 'USD',
          metadata: { orden_id: orden.id },
        }),
      },
    );
    if (!respuesta.ok) {
      throw new BadGatewayException('La pasarela de pagos no respondió correctamente');
    }

    const data = (await respuesta.json()) as {
      id?: string;
      transaction_id?: string;
      checkout_url: string;
    };
    const transaccionId = data.id ?? data.transaction_id;
    if (!transaccionId || !data.checkout_url) {
      throw new BadGatewayException('Respuesta inesperada de la pasarela');
    }

    const pago = await this.prisma.pago.create({
      data: {
        transaccionId,
        monto: orden.total,
        checkoutUrl: data.checkout_url,
        ordenId: orden.id,
      },
    });
    return { pagoId: pago.id, ordenId: orden.id, checkoutUrl: pago.checkoutUrl };
  }

  // 2. MockPay avisa el resultado (servidor a servidor)
  async procesarWebhook(evento: MockpayWebhook) {
    const pago = await this.prisma.pago.findUnique({
      where: { transaccionId: evento.id },
    });
    if (!pago) throw new NotFoundException('Transacción desconocida');

    // Idempotencia: si ya se procesó, no se repite
    if (pago.estado !== EstadoPago.PENDIENTE) {
      return { recibido: true, duplicado: true };
    }
    // El monto tiene que coincidir con lo que pedimos
    if (!pago.monto.equals(evento.amount)) {
      throw new BadRequestException('El monto no coincide');
    }

    await this.prisma.$transaction(async (tx) => {
      if (evento.status === 'SUCCEEDED') {
        await tx.pago.update({
          where: { id: pago.id },
          data: { estado: EstadoPago.APROBADO },
        });
        await tx.orden.updateMany({
          where: { id: pago.ordenId, estado: EstadoOrden.PENDIENTE },
          data: { estado: EstadoOrden.PAGADO },
        });
      } else {
        await tx.pago.update({
          where: { id: pago.id },
          data: { estado: EstadoPago.RECHAZADO, motivoFallo: evento.failure_reason },
        });
      }
    });
    return { recibido: true };
  }

  listar() {
    return this.prisma.pago.findMany({ orderBy: { creadoEn: 'desc' } });
  }
}