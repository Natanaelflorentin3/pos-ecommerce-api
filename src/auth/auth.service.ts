import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Rol } from '../generated/prisma/client';
import { RegisterClienteDto } from './dto/register-cliente.dto';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: Rol;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validarUsuario(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) return null;

    const passwordOk = await bcrypt.compare(password, usuario.password);
    if (!passwordOk) return null;

    const { password: _, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }

  login(usuario: { id: number; email: string; rol: Rol }) {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
    return { access_token: this.jwtService.sign(payload) };
  }

  async registrarCliente(dto: RegisterClienteDto) {
    const existe = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existe) throw new ConflictException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        apellido: dto.apellido,
        email: dto.email,
        password: hash,
        rol: Rol.CLIENTE,
        cliente: {
          create: {
            telefono: dto.telefono,
            carrito: { create: {} },
          },
        },
      },
      include: { cliente: true },
    });

    const { password: _, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }
}