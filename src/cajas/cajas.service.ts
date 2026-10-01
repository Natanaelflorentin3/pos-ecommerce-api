import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoCaja, EstadoVenta, MetodoPago, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';

@Injectable()
export class CajasService {
  constructor(private prisma: PrismaService) {}

  async abrir(usuarioId: number, dto: AbrirCajaDto) {
    const abierta = await this.prisma.caja.findFirst({
      where: { usuarioId, estado: EstadoCaja.ABIERTA },
    });
    if (abierta) throw new ConflictException('Ya tenés una caja abierta');

    return this.prisma.caja.create({
      data: { usuarioId, montoInicial: dto.montoInicial },
    });
  }

  async obtenerCajaAbierta(usuarioId: number) {
    const caja = await this.prisma.caja.findFirst({
      where: { usuarioId, estado: EstadoCaja.ABIERTA },
    });
    if (!caja) {
      throw new NotFoundException('No tenés una caja abierta. Abrí una antes de vender.');
    }
    return caja;
  }


  async cerrar(usuarioId: number, dto: CerrarCajaDto) {
    const caja = await this.obtenerCajaAbierta(usuarioId);

    // No se cierra con ventas a medio hacer
    const pendientes = await this.prisma.venta.count({
      where: { cajaId: caja.id, estado: EstadoVenta.ABIERTA },
    });
    if (pendientes > 0) {
      throw new BadRequestException(
        `Hay ${pendientes} venta(s) sin cobrar ni cancelar en esta caja`,
      );
    }

    await this.prisma.caja.update({
      where: { id: caja.id },
      data: {
        estado: EstadoCaja.CERRADA,
        cerradaEn: new Date(),
        montoFinalDeclarado: dto.montoFinalDeclarado,
      },
    });

    return this.conciliacion(caja.id);
  }

  async conciliacion(cajaId: number) {
    const caja = await this.prisma.caja.findUnique({
      where: { id: cajaId },
      include: { usuario: { select: { id: true, nombre: true, apellido: true } } },
    });
    if (!caja) throw new NotFoundException('Caja no encontrada');

    // Ventas completadas de esta caja, agrupadas por método de pago
    const porMetodo = await this.prisma.venta.groupBy({
      by: ['metodoPago'],
      where: { cajaId, estado: EstadoVenta.COMPLETADA },
      _sum: { total: true },
      _count: { _all: true },
    });

    const totalEfectivo =
      porMetodo.find((p) => p.metodoPago === MetodoPago.EFECTIVO)?._sum.total ??
      new Prisma.Decimal(0);

    const totalVentas = porMetodo.reduce(
      (acc, p) => acc.plus(p._sum.total ?? 0),
      new Prisma.Decimal(0),
    );

    const efectivoEsperado = caja.montoInicial.plus(totalEfectivo);
    const diferencia = caja.montoFinalDeclarado
      ? caja.montoFinalDeclarado.minus(efectivoEsperado)
      : null;

    let resultado = 'CAJA ABIERTA';
    if (diferencia) {
      if (diferencia.isZero()) resultado = 'CUADRA';
      else if (diferencia.isPositive()) resultado = 'SOBRANTE';
      else resultado = 'FALTANTE';
    }

    return {
      cajaId: caja.id,
      estado: caja.estado,
      cajero: caja.usuario,
      abiertaEn: caja.abiertaEn,
      cerradaEn: caja.cerradaEn,
      montoInicial: caja.montoInicial,
      ventasPorMetodo: porMetodo.map((p) => ({
        metodoPago: p.metodoPago,
        cantidad: p._count._all,
        total: p._sum.total,
      })),
      totalVentas,
      efectivoEsperado,
      montoFinalDeclarado: caja.montoFinalDeclarado,
      diferencia,
      resultado,
    };
  }

  listar() {
    return this.prisma.caja.findMany({
      include: { usuario: { select: { id: true, nombre: true, apellido: true } } },
      orderBy: { abiertaEn: 'desc' },
    });
  }
}