import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientesService } from '../clientes/clientes.service';
import { ProductosService } from '../productos/productos.service';
import { AgregarItemCarritoDto } from './dto/agregar-item-carrito.dto';

@Injectable()
export class CarritoService {
  constructor(
    private prisma: PrismaService,
    private clientesService: ClientesService,
    private productosService: ProductosService,
  ) {}

  // Devuelve el carrito del cliente (lo crea si no existiera)
  async obtenerCarritoId(usuarioId: number) {
    const cliente = await this.clientesService.obtenerPorUsuario(usuarioId);
    const carrito = await this.prisma.carrito.upsert({
      where: { clienteId: cliente.id },
      update: {},
      create: { clienteId: cliente.id },
    });
    return carrito.id;
  }

  async ver(usuarioId: number) {
    const carritoId = await this.obtenerCarritoId(usuarioId);
    const carrito = await this.prisma.carrito.findUniqueOrThrow({
      where: { id: carritoId },
      include: {
        items: {
          include: {
            producto: { select: { id: true, nombre: true, precioVenta: true, stock: true } },
          },
        },
      },
    });

    const total = carrito.items.reduce(
      (acc, item) => acc.plus(item.producto.precioVenta.mul(item.cantidad)),
      new Prisma.Decimal(0),
    );
    return { ...carrito, total };
  }

  async agregarItem(usuarioId: number, dto: AgregarItemCarritoDto) {
    const carritoId = await this.obtenerCarritoId(usuarioId);
    const producto = await this.productosService.buscarPorId(dto.productoId);

    // Regla del negocio: no se puede comprar lo que no tiene stock
    if (!producto.activo || producto.stock === 0) {
      throw new BadRequestException(`"${producto.nombre}" no está disponible`);
    }

    const existente = await this.prisma.itemCarrito.findUnique({
      where: { carritoId_productoId: { carritoId, productoId: dto.productoId } },
    });
    const cantidadTotal = (existente?.cantidad ?? 0) + dto.cantidad;
    if (cantidadTotal > producto.stock) {
      throw new BadRequestException(
        `Solo hay ${producto.stock} unidades de "${producto.nombre}"`,
      );
    }

    await this.prisma.itemCarrito.upsert({
      where: { carritoId_productoId: { carritoId, productoId: dto.productoId } },
      update: { cantidad: cantidadTotal },
      create: { carritoId, productoId: dto.productoId, cantidad: dto.cantidad },
    });

    return this.ver(usuarioId);
  }

  async quitarItem(usuarioId: number, productoId: number) {
    const carritoId = await this.obtenerCarritoId(usuarioId);
    const { count } = await this.prisma.itemCarrito.deleteMany({
      where: { carritoId, productoId },
    });
    if (count === 0) throw new NotFoundException('Ese producto no está en tu carrito');
    return this.ver(usuarioId);
  }
}