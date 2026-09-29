import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Rol } from '../generated/prisma/client';
import { AuthService } from './auth.service';
import { RegisterClienteDto } from './dto/register-cliente.dto';
import { LoginDto } from './dto/login.dto';

type UsuarioEnRequest = { id: number; email: string; rol: Rol };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  registrar(@Body() dto: RegisterClienteDto) {
    return this.authService.registrarCliente(dto);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthGuard('local'))
  @ApiBody({ type: LoginDto })
  login(@Req() req: { user: UsuarioEnRequest }) {
    return this.authService.login(req.user);
  }

  @Get('perfil')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  perfil(@Req() req: { user: UsuarioEnRequest }) {
    return req.user;
  }
}