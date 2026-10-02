import { Module } from '@nestjs/common';
import { ClientesModule } from '../clientes/clientes.module';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [ClientesModule],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}