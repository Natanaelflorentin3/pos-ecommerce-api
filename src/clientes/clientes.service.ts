import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async obtenerPorUsuario(usuarioId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { usuarioId },
      include: { usuario: { select: { nombre: true, apellido: true, email: true } } },
    });
    if (!cliente) throw new NotFoundException('Perfil de cliente no encontrado');
    return cliente;
  }

  async agregarDireccion(usuarioId: number, dto: CreateDireccionDto) {
    const cliente = await this.obtenerPorUsuario(usuarioId);
    return this.prisma.direccion.create({
      data: { ...dto, clienteId: cliente.id },
    });
  }

  async listarDirecciones(usuarioId: number) {
    const cliente = await this.obtenerPorUsuario(usuarioId);
    return this.prisma.direccion.findMany({ where: { clienteId: cliente.id } });
  }
}