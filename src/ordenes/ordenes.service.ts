import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoOrden, Prisma, Rol } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientesService } from '../clientes/clientes.service';
import { CarritoService } from '../carrito/carrito.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdenManualDto } from './dto/orden-manual.dto';

// Desde cada estado, a cuáles se puede pasar
const TRANSICIONES: Record<EstadoOrden, EstadoOrden[]> = {
  PENDIENTE: [EstadoOrden.PAGADO, EstadoOrden.CANCELADO],
  PAGADO: [EstadoOrden.EN_CAMINO, EstadoOrden.CANCELADO],
  EN_CAMINO: [EstadoOrden.ENTREGADO, EstadoOrden.CANCELADO],
  ENTREGADO: [],
  CANCELADO: [],
};

const includeOrden = {
  detalles: { include: { producto: { select: { id: true, nombre: true } } } },
} satisfies Prisma.OrdenInclude;

@Injectable()
export class OrdenesService {
  constructor(
    private prisma: PrismaService,
    private clientesService: ClientesService,
    private carritoService: CarritoService,
  ) {}

  // ─── Checkout del cliente web ───
  async checkout(usuarioId: number, dto: CheckoutDto) {
    const cliente = await this.clientesService.obtenerPorUsuario(usuarioId);

    // La dirección tiene que ser DE este cliente
    const direccion = await this.prisma.direccion.findFirst({
      where: { id: dto.direccionId, clienteId: cliente.id },
    });
    if (!direccion) throw new NotFoundException('Dirección no encontrada');

    const carritoId = await this.carritoService.obtenerCarritoId(usuarioId);

    const orden = await this.prisma.$transaction(async (tx) => {
      const items = await tx.itemCarrito.findMany({ where: { carritoId } });
      if (items.length === 0) throw new BadRequestException('Tu carrito está vacío');

      const { detalles, total } = await this.reservarProductos(tx, items);

      const nueva = await tx.orden.create({
        data: {
          clienteId: cliente.id,
          nombreContacto: `${cliente.usuario.nombre} ${cliente.usuario.apellido}`,
          telefonoContacto: cliente.telefono,
          direccionEnvio: `${direccion.calle}, ${direccion.ciudad}`,
          referencias: direccion.referencias,
          total,
          detalles: { create: detalles },
        },
      });

      await tx.itemCarrito.deleteMany({ where: { carritoId } });
      return nueva;
    });

    return this.buscarPorId(orden.id);
  }

  // ─── Orden manual (venta cerrada por redes sociales) ───
  async registrarManual(dto: OrdenManualDto) {
    const orden = await this.prisma.$transaction(async (tx) => {
      const { detalles, total } = await this.reservarProductos(tx, dto.items);
      return tx.orden.create({
        data: {
          nombreContacto: dto.nombreContacto,
          telefonoContacto: dto.telefonoContacto,
          direccionEnvio: dto.direccionEnvio,
          referencias: dto.referencias ?? null,
          total,
          detalles: { create: detalles },
        },
      });
    });
    return this.buscarPorId(orden.id);
  }

  // ─── Cola de órdenes ───
  listar(estado?: EstadoOrden) {
    return this.prisma.orden.findMany({
      where: estado ? { estado } : {},
      include: includeOrden,
      orderBy: { fecha: 'asc' }, // la más vieja primero, como una cola
    });
  }

  async misOrdenes(usuarioId: number) {
    const cliente = await this.clientesService.obtenerPorUsuario(usuarioId);
    return this.prisma.orden.findMany({
      where: { clienteId: cliente.id },
      include: includeOrden,
      orderBy: { fecha: 'desc' },
    });
  }

  async verOrden(id: number, usuario: { id: number; rol: Rol }) {
    const orden = await this.buscarPorId(id);
    if (usuario.rol === Rol.CLIENTE) {
      const cliente = await this.clientesService.obtenerPorUsuario(usuario.id);
      if (orden.clienteId !== cliente.id) {
        throw new ForbiddenException('Esta orden no te pertenece');
      }
    }
    return orden;
  }

  // ─── Cambio de estado ───
  async cambiarEstado(id: number, nuevoEstado: EstadoOrden) {
    const orden = await this.buscarPorId(id);

    if (!TRANSICIONES[orden.estado].includes(nuevoEstado)) {
      throw new BadRequestException(
        `No se puede pasar de ${orden.estado} a ${nuevoEstado}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Solo si nadie la cambió mientras tanto
      const { count } = await tx.orden.updateMany({
        where: { id, estado: orden.estado },
        data: { estado: nuevoEstado },
      });
      if (count === 0) throw new BadRequestException('La orden cambió de estado, reintentá');

      // Si se cancela, el stock vuelve al inventario
      if (nuevoEstado === EstadoOrden.CANCELADO) {
        for (const d of orden.detalles) {
          await tx.producto.update({
            where: { id: d.productoId },
            data: { stock: { increment: d.cantidad } },
          });
        }
      }
    });

    return this.buscarPorId(id);
  }

  // ─── Helpers ───
  private async buscarPorId(id: number) {
    const orden = await this.prisma.orden.findUnique({
      where: { id },
      include: includeOrden,
    });
    if (!orden) throw new NotFoundException('Orden no encontrada');
    return orden;
  }

  // Descuenta stock de forma atómica y congela el precio. Lo usan checkout y orden manual.
  private async reservarProductos(
    tx: Prisma.TransactionClient,
    items: { productoId: number; cantidad: number }[],
  ) {
    const detalles: { productoId: number; cantidad: number; precioUnitario: Prisma.Decimal }[] = [];

    for (const item of items) {
      const producto = await tx.producto.findUnique({ where: { id: item.productoId } });
      if (!producto || !producto.activo) {
        throw new BadRequestException(`El producto ${item.productoId} no está disponible`);
      }

      const { count } = await tx.producto.updateMany({
        where: { id: item.productoId, activo: true, stock: { gte: item.cantidad } },
        data: { stock: { decrement: item.cantidad } },
      });
      if (count === 0) {
        throw new BadRequestException(`Stock insuficiente para "${producto.nombre}"`);
      }

      detalles.push({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: producto.precioVenta,
      });
    }

    // Solo productos: el envío lo paga el cliente al motorista
    const total = detalles.reduce(
      (acc, d) => acc.plus(d.precioUnitario.mul(d.cantidad)),
      new Prisma.Decimal(0),
    );
    return { detalles, total };
  }
}