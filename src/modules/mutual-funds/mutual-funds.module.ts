import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CoreModule } from '../../core/core.module';
import { MutualFundsController } from './mutual-funds.controller';
import { MutualFundsService } from './mutual-funds.service';
import { MutualFundsAbstract } from './mutual-funds.abstract';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';

@Module({
  imports: [
    CoreModule,
    JwtModule.register({}),
  ],
  controllers: [MutualFundsController],
  providers: [
    MutualFundsService,
    JwtAuthGuard,
    {
      provide: MutualFundsAbstract,
      useClass: MutualFundsService,
    },
  ],
  exports: [MutualFundsService, MutualFundsAbstract],
})
export class MutualFundsModule {}
