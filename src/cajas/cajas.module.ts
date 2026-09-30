import { Module } from '@nestjs/common';
import { CajasService } from './cajas.service';
import { CajasController } from './cajas.controller';

@Module({
  providers: [CajasService],
  controllers: [CajasController],
  exports: [CajasService],
})
export class CajasModule {}
