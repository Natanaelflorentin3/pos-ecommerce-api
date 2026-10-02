import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ProductosModule } from './productos/productos.module';
import { CajasModule } from './cajas/cajas.module';
import { VentasModule } from './ventas/ventas.module';
import { ClientesModule } from './clientes/clientes.module';
import { CarritoModule } from './carrito/carrito.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { PagosModule } from './pagos/pagos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    CategoriasModule,
    ProductosModule,
    CajasModule,
    VentasModule,
    ClientesModule,
    CarritoModule,
    OrdenesModule,
    PagosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}