import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from '../config/appconfig.service';
import { CoreModule } from '../core/core.module';
import { DatabaseService } from './database.service';
import { AbstractUsersDao } from './mongodb/abstract/users.abstract';
import { UsersDao } from './mongodb/dao/users.dao';
import { AbstractAuthDao } from './mongodb/abstract/auth.abstract';
import { AuthDao } from './mongodb/dao/auth.dao';
import { AbstractMutualFundsDao } from './mongodb/abstract/mutual-funds.abstract';
import { MutualFundsDao } from './mongodb/dao/mutual-funds.dao';
import { AbstractTradesDao } from './mongodb/abstract/trades.abstract';
import { TradesDao } from './mongodb/dao/trades.dao';
import { AbstractDashboardDao } from './mongodb/abstract/dashboard.abstract';
import { DashboardDao } from './mongodb/dao/dashboard.dao';
import {
  ChatSession,
  ChatSessionSchema,
  MutualFund,
  MutualFundSchema,
  NetWorthSection,
  NetWorthSectionSchema,
  SipEntry,
  SipEntrySchema,
  Trade,
  TradeSchema,
  TradeSell,
  TradeSellSchema,
  User,
  UserSchema,
  UserSession,
  UserSessionSchema,
} from './schemas';

@Global()
@Module({
  imports: [
    CoreModule,
    MongooseModule.forRootAsync({
      imports: [CoreModule],
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) => ({
        uri: appConfigService.mongodbUri,
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSession.name, schema: UserSessionSchema },
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: MutualFund.name, schema: MutualFundSchema },
      { name: SipEntry.name, schema: SipEntrySchema },
      { name: NetWorthSection.name, schema: NetWorthSectionSchema },
      { name: Trade.name, schema: TradeSchema },
      { name: TradeSell.name, schema: TradeSellSchema },
    ]),
  ],
  providers: [
    DatabaseService,
    { provide: AbstractUsersDao, useClass: UsersDao },
    { provide: AbstractAuthDao, useClass: AuthDao },
    { provide: AbstractMutualFundsDao, useClass: MutualFundsDao },
    { provide: AbstractTradesDao, useClass: TradesDao },
    { provide: AbstractDashboardDao, useClass: DashboardDao },
  ],
  exports: [
    DatabaseService,
    MongooseModule,
    AbstractUsersDao,
    AbstractAuthDao,
    AbstractMutualFundsDao,
    AbstractTradesDao,
    AbstractDashboardDao,
  ],
})
export class DatabaseModule {}
