import { Module } from '@nestjs/common';
import { NetWorthController } from './net-worth.controller';
import { NetWorthService } from './net-worth.service';
import { NetWorthAbstract } from './net-worth.abstract';

@Module({
  controllers: [NetWorthController],
  providers: [NetWorthService, { provide: NetWorthAbstract, useClass: NetWorthService }],
  exports: [NetWorthService, NetWorthAbstract],
})
export class NetWorthModule {}
