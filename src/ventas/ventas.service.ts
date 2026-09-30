import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoVenta, MetodoPago, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CajasService } from '../cajas/cajas.service';
import { ProductosService } from '../productos/productos.service';
import { AgregarItemDto } from './dto/agregar-item.dto';

const includeComprobante = {
  cajero: { select: { id: true, nombre: true, apellido: true } },
  detalles: {
    include: { producto: { select: { id: true, nombre: true } } },
  },
} satisfies Prisma.VentaInclude;

@Injectable()
export class VentasService {
  constructor(
    private prisma: PrismaService,
    private cajasService: CajasService,
    private productosService: ProductosService,
  ) {}

  // 1. Abrir venta: requiere caja abierta
  async abrir(usuarioId: number) {
    const caja = await this.cajasService.obtenerCajaAbierta(usuarioId);
    return this.prisma.venta.create({
      data: { cajaId: caja.id, cajeroId: usuarioId },
    });
  }

  // 2. Agregar producto al carrito interno
  async agregarItem(ventaId: number, usuarioId: number, dto: AgregarItemDto) {
    await this.obtenerVentaAbierta(ventaId, usuarioId);

    const producto = await this.productosService.buscarPorId(dto.productoId);
    if (!producto.activo) throw new BadRequestException('El producto no está disponible');

    const existente = await this.prisma.detalleVenta.findUnique({
      where: { ventaId_productoId: { ventaId, productoId: dto.productoId } },
    });
    const cantidadTotal = (existente?.cantidad ?? 0) + dto.cantidad;

    // Chequeo "amable": avisa temprano. El chequeo definitivo es al cobrar.
    if (cantidadTotal > producto.stock) {
      throw new BadRequestException(
        `Stock insuficiente para "${producto.nombre}": hay ${producto.stock}, pediste ${cantidadTotal}`,
      );
    }

    await this.prisma.detalleVenta.upsert({
      where: { ventaId_productoId: { ventaId, productoId: dto.productoId } },
      update: { cantidad: cantidadTotal },
      create: {
        ventaId,
        productoId: dto.productoId,
        cantidad: dto.cantidad,
        precioUnitario: producto.precioVenta,
      },
    });

    return this.obtenerComprobante(ventaId);
  }

  async quitarItem(ventaId: number, productoId: number, usuarioId: number) {
    await this.obtenerVentaAbierta(ventaId, usuarioId);
    const { count } = await this.prisma.detalleVenta.deleteMany({
      where: { ventaId, productoId },
    });
    if (count === 0) throw new NotFoundException('Ese producto no está en la venta');
    return this.obtenerComprobante(ventaId);
  }

  // 3. Cobrar: todo o nada
  async cobrar(ventaId: number, usuarioId: number, metodoPago: MetodoPago) {
    await this.obtenerVentaAbierta(ventaId, usuarioId);

    await this.prisma.$transaction(async (tx) => {
      // a) Marcar la venta como cobrada, solo si sigue ABIERTA (evita cobrarla dos veces)
      const marcada = await tx.venta.updateMany({
        where: { id: ventaId, estado: EstadoVenta.ABIERTA },
        data: { estado: EstadoVenta.COMPLETADA, metodoPago },
      });
      if (marcada.count === 0) throw new BadRequestException('La venta ya fue procesada');

      const detalles = await tx.detalleVenta.findMany({
        where: { ventaId },
        include: { producto: { select: { nombre: true } } },
      });
      if (detalles.length === 0) throw new BadRequestException('La venta no tiene productos');

      // b) Descontar stock de forma atómica: solo si alcanza
      for (const d of detalles) {
        const resultado = await tx.producto.updateMany({
          where: { id: d.productoId, activo: true, stock: { gte: d.cantidad } },
          data: { stock: { decrement: d.cantidad } },
        });
        if (resultado.count === 0) {
          throw new BadRequestException(`Stock insuficiente para "${d.producto.nombre}"`);
        }
      }

      // c) Guardar el total
      await tx.venta.update({
        where: { id: ventaId },
        data: { total: this.calcularTotal(detalles) },
      });
    });

    return this.obtenerComprobante(ventaId);
  }

  async cancelar(ventaId: number, usuarioId: number) {
    await this.obtenerVentaAbierta(ventaId, usuarioId);
    return this.prisma.venta.update({
      where: { id: ventaId },
      data: { estado: EstadoVenta.CANCELADA },
    });
  }

  // Comprobante (con el total calculado en vivo si todavía está abierta)
  async obtenerComprobante(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: includeComprobante,
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return { ...venta, totalCalculado: this.calcularTotal(venta.detalles) };
  }

  // Historial del día (hora de Argentina)
  async historialDelDia(fecha: string) {
    const desde = new Date(`${fecha}T00:00:00-03:00`);
    const hasta = new Date(`${fecha}T23:59:59.999-03:00`);

    const ventas = await this.prisma.venta.findMany({
      where: { estado: EstadoVenta.COMPLETADA, fecha: { gte: desde, lte: hasta } },
      include: includeComprobante,
      orderBy: { fecha: 'asc' },
    });

    const totalDelDia = ventas.reduce(
      (acc, v) => acc.plus(v.total),
      new Prisma.Decimal(0),
    );

    return { fecha, cantidadVentas: ventas.length, totalDelDia, ventas };
  }

  // ─── Helpers ───
  private async obtenerVentaAbierta(id: number, usuarioId: number) {
    const venta = await this.prisma.venta.findUnique({ where: { id } });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (venta.cajeroId !== usuarioId) {
      throw new ForbiddenException('Esta venta pertenece a otro cajero');
    }
    if (venta.estado !== EstadoVenta.ABIERTA) {
      throw new BadRequestException('La venta ya no está abierta');
    }
    return venta;
  }

  private calcularTotal(detalles: { cantidad: number; precioUnitario: Prisma.Decimal }[]) {
    return detalles.reduce(
      (acc, d) => acc.plus(d.precioUnitario.mul(d.cantidad)),
      new Prisma.Decimal(0),
    );
  }
}