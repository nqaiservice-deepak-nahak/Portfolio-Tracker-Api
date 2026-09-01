import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { ExportsAbstract } from './exports.abstract';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, { provide: ExportsAbstract, useClass: ExportsService }],
  exports: [ExportsService, ExportsAbstract],
})
export class ExportsModule {}
