import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoCaja } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';

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
}