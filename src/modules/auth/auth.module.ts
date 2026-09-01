import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthAbstract } from './auth.abstract';
import { UsersModule } from '../user-management/users.module';
import { CoreModule } from '../../core/core.module';

@Module({
  imports: [
    CoreModule,
    UsersModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: AuthAbstract,
      useClass: AuthService,
    },
  ],
  exports: [AuthService, AuthAbstract],
})
export class AuthModule {}
