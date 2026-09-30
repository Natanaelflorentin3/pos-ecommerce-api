import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../../generated/prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesPermitidos || rolesPermitidos.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { rol: Rol } }>();

    if (!user || !rolesPermitidos.includes(user.rol)) {
      throw new ForbiddenException('No tenés permiso para esta acción');
    }
    return true;
  }
}