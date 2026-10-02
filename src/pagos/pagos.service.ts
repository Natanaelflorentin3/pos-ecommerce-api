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

    const cuerpo = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
    console.log('MockPay respuesta:', respuesta.status, JSON.stringify(cuerpo));

    if (!respuesta.ok) {
      throw new BadGatewayException('La pasarela de pagos no respondió correctamente');
    }

    // La info puede venir directa o dentro de "data" / "payment"
    const datos = (cuerpo.data ?? cuerpo.payment ?? cuerpo) as Record<string, unknown>;
    const transaccionId = String(
      datos.id ?? datos.transaction_id ?? datos.transactionId ??
      datos.payment_id ?? datos.paymentId ?? '',
    );
    const checkoutUrl = String(
      datos.checkout_url ?? datos.checkoutUrl ?? datos.url ??
      cuerpo.checkout_url ?? cuerpo.checkoutUrl ?? '',
    );

    if (!transaccionId || !checkoutUrl) {
      throw new BadGatewayException('Respuesta inesperada de la pasarela');
    }

    const pago = await this.prisma.pago.create({
      data: {
        transaccionId,
        monto: orden.total,
        checkoutUrl,
        ordenId: orden.id,
      },
    });
    return { pagoId: pago.id, ordenId: orden.id, checkoutUrl: pago.checkoutUrl };
  }

  // 2. MockPay avisa el resultado (servidor a servidor)
  async procesarWebhook(evento: MockpayWebhook) {
    console.log('MockPay webhook:', JSON.stringify(evento));

    const extra = evento as unknown as Record<string, unknown>;
    const idEvento = String(evento.id ?? extra.transaction_id ?? extra.transactionId ?? '');

    // Buscar el pago por id de transacción; si no, por la orden del metadata
    let pago = idEvento
      ? await this.prisma.pago.findUnique({ where: { transaccionId: idEvento } })
      : null;
    if (!pago && evento.metadata?.orden_id) {
      pago = await this.prisma.pago.findFirst({
        where: { ordenId: Number(evento.metadata.orden_id), estado: EstadoPago.PENDIENTE },
        orderBy: { creadoEn: 'desc' },
      });
    }
    if (!pago) throw new NotFoundException('Transacción desconocida');

    // Idempotencia: si ya se procesó, no se repite
    if (pago.estado !== EstadoPago.PENDIENTE) {
      return { recibido: true, duplicado: true };
    }
    // El monto tiene que coincidir con lo que pedimos
    if (!pago.monto.equals(evento.amount)) {
      throw new BadRequestException('El monto no coincide');
    }

    const pagoId = pago.id;
    const ordenId = pago.ordenId;

    await this.prisma.$transaction(async (tx) => {
      if (evento.status === 'SUCCEEDED') {
        await tx.pago.update({
          where: { id: pagoId },
          data: { estado: EstadoPago.APROBADO },
        });
        await tx.orden.updateMany({
          where: { id: ordenId, estado: EstadoOrden.PENDIENTE },
          data: { estado: EstadoOrden.PAGADO },
        });
      } else {
        await tx.pago.update({
          where: { id: pagoId },
          data: { estado: EstadoPago.RECHAZADO, motivoFallo: evento.failure_reason ?? null },
        });
      }
    });
    return { recibido: true };
  }

  listar() {
    return this.prisma.pago.findMany({ orderBy: { creadoEn: 'desc' } });
  }
}