import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Rol } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriasService } from '../categorias/categorias.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

// Lo que ve el público: sin costo, sin campos internos
const selectPublico = {
  id: true,
  nombre: true,
  descripcion: true,
  precioVenta: true,
  stock: true,
  categoria: { select: { id: true, nombre: true } },
} satisfies Prisma.ProductoSelect;

@Injectable()
export class ProductosService {
  constructor(
    private prisma: PrismaService,
    private categoriasService: CategoriasService,
  ) {}

  // Vitrina pública: solo activos y con stock
  catalogoPublico(categoriaId?: number) {
    return this.prisma.producto.findMany({
      where: {
        activo: true,
        stock: { gt: 0 },
        ...(categoriaId ? { categoriaId } : {}),
      },
      select: selectPublico,
      orderBy: { nombre: 'asc' },
    });
  }

  async detallePublico(id: number) {
    const producto = await this.prisma.producto.findFirst({
      where: { id, activo: true },
      select: selectPublico,
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  // Inventario interno: todos los productos; el costo solo para ADMIN
  inventario(rol: Rol, categoriaId?: number) {
    return this.prisma.producto.findMany({
      where: categoriaId ? { categoriaId } : {},
      include: { categoria: true },
      omit: { costo: rol !== Rol.ADMIN },
      orderBy: { nombre: 'asc' },
    });
  }

  async buscarPorId(id: number) {
    const producto = await this.prisma.producto.findUnique({ where: { id } });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async crear(dto: CreateProductoDto) {
    await this.categoriasService.buscarPorId(dto.categoriaId);
    return this.prisma.producto.create({ data: dto });
  }

  async actualizar(id: number, dto: UpdateProductoDto) {
    await this.buscarPorId(id);
    if (dto.categoriaId) {
      await this.categoriasService.buscarPorId(dto.categoriaId);
    }
    return this.prisma.producto.update({ where: { id }, data: dto });
  }

  async desactivar(id: number) {
    await this.buscarPorId(id);
    return this.prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
  }
}