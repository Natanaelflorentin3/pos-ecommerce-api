import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateCategoriaDto) {
    const existe = await this.prisma.categoria.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existe) throw new ConflictException('Ya existe una categoría con ese nombre');
    return this.prisma.categoria.create({ data: dto });
  }

  listar() {
    return this.prisma.categoria.findMany({ orderBy: { nombre: 'asc' } });
  }

  async buscarPorId(id: number) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    return categoria;
  }

  async actualizar(id: number, dto: UpdateCategoriaDto) {
    await this.buscarPorId(id);
    return this.prisma.categoria.update({ where: { id }, data: dto });
  }

  async eliminar(id: number) {
    await this.buscarPorId(id);
    const productos = await this.prisma.producto.count({
      where: { categoriaId: id },
    });
    if (productos > 0) {
      throw new ConflictException('No se puede eliminar: la categoría tiene productos');
    }
    return this.prisma.categoria.delete({ where: { id } });
  }
}