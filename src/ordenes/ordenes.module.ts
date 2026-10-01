import { Module } from '@nestjs/common';
import { ClientesModule } from '../clientes/clientes.module';
import { CarritoModule } from '../carrito/carrito.module';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';

@Module({
  imports: [ClientesModule, CarritoModule],
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}