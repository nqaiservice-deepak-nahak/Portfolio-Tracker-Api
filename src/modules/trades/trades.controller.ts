import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { TradesAbstract } from './trades.abstract';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { CreateTradeSellDto } from './dto/create-trade-sell.sto';
import { ListTradesDto, ListTradeSellsDto } from './dto/list-trades.dto';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { AppResponse } from '../../shared/appresponse.shared';

@ApiTags('Trades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesAbstract) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create swing trade for logged-in user',
  })
  @ApiResponse({
    status: 201,
    description: 'Trade created successfully',
  })
  async createTrade(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createTradeDto: CreateTradeDto,
  ): Promise<AppResponse> {
    return await this.tradesService.createTrade(
      currentUser.userId,
      createTradeDto,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'List logged-in user trades with pagination and search',
  })
  @ApiResponse({
    status: 200,
    description: 'Trades fetched successfully',
  })
  async listTrades(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() listTradesDto: ListTradesDto,
  ): Promise<AppResponse> {
    return await this.tradesService.listTrades(
      currentUser.userId,
      listTradesDto,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get logged-in user trade by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Trade fetched successfully',
  })
  async getTradeById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AppResponse> {
    return await this.tradesService.getTradeById(
      currentUser.userId,
      id,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update logged-in user trade',
  })
  @ApiResponse({
    status: 200,
    description: 'Trade updated successfully',
  })
  async updateTrade(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateTradeDto: UpdateTradeDto,
  ): Promise<AppResponse> {
    return await this.tradesService.updateTrade(
      currentUser.userId,
      id,
      updateTradeDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Archive logged-in user trade',
  })
  @ApiResponse({
    status: 200,
    description: 'Trade archived successfully',
  })
  async archiveTrade(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AppResponse> {
    return await this.tradesService.archiveTrade(
      currentUser.userId,
      id,
    );
  }

  @Post(':id/sell/create')
  @ApiOperation({
    summary: 'Record partial or full sell for a trade',
  })
  @ApiResponse({
    status: 201,
    description: 'Trade sell recorded successfully',
  })
  async createSell(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() createTradeSellDto: CreateTradeSellDto,
  ): Promise<AppResponse> {
    return await this.tradesService.createSell(
      currentUser.userId,
      id,
      createTradeSellDto,
    );
  }

  @Post(':id/sell')
  @ApiOperation({
    summary: 'List sell entries for a trade with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Trade sells fetched successfully',
  })
  async listSells(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() listTradeSellsDto: ListTradeSellsDto,
  ): Promise<AppResponse> {
    return await this.tradesService.listSells(
      currentUser.userId,
      id,
      listTradeSellsDto,
    );
  }

}
