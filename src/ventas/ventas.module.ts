import { Module } from '@nestjs/common';
import { CajasModule } from '../cajas/cajas.module';
import { ProductosModule } from '../productos/productos.module';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [CajasModule, ProductosModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}