import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CoreModule } from '../../core/core.module';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { TradesAbstract } from './trades.abstract';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';

@Module({
  imports: [
    CoreModule,
    JwtModule.register({}),
  ],
  controllers: [TradesController],
  providers: [
    TradesService,
    JwtAuthGuard,
    {
      provide: TradesAbstract,
      useClass: TradesService,
    },
  ],
  exports: [TradesService, TradesAbstract],
})
export class TradesModule {}
