import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CoreModule } from '../../core/core.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardAbstract } from './dashboard.abstract';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';

@Module({
  imports: [
    CoreModule,
    JwtModule.register({}),
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    JwtAuthGuard,
    {
      provide: DashboardAbstract,
      useClass: DashboardService,
    },
  ],
  exports: [DashboardService, DashboardAbstract],
})
export class DashboardModule {}
