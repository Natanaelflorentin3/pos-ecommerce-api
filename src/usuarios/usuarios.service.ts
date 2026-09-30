import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateUsuarioDto) {
    const existe = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existe) throw new ConflictException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, 10);
    return this.prisma.usuario.create({
      data: { ...dto, password: hash },
      omit: { password: true },
    });
  }

  listar() {
    return this.prisma.usuario.findMany({
      omit: { password: true },
      orderBy: { id: 'asc' },
    });
  }
}