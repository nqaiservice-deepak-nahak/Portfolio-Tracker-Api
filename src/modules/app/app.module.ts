import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from '../../core/core.module';
import { DatabaseModule } from '../../database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../user-management/users.module';
import { MutualFundsModule } from '../mutual-funds/mutual-funds.module';
import { TradesModule } from '../trades/trades.module';
import { NetWorthModule } from '../net-worth/net-worth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ExportsModule } from '../exports/exports.module';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CoreModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    MutualFundsModule,
    TradesModule,
    NetWorthModule,
    DashboardModule,
    ExportsModule,
    ChatbotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
