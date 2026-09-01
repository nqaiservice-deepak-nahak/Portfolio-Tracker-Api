import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CoreModule } from '../../core/core.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersAbstract } from './users.abstract';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';

@Module({
  imports: [
    CoreModule,
    JwtModule.register({}),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    JwtAuthGuard,
    {
      provide: UsersAbstract,
      useClass: UsersService,
    },
  ],
  exports: [UsersService, UsersAbstract],
})
export class UsersModule {}
