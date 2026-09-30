import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Rol } from '../../generated/prisma/client';

export interface UsuarioActualPayload {
  id: number;
  email: string;
  rol: Rol;
}

export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest<{ user: UsuarioActualPayload }>().user;
  },
);