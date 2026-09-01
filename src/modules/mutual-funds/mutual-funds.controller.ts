import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { MutualFundsAbstract } from './mutual-funds.abstract';
import { CreateMutualFundDto } from './dto/create-mutual-fund.dto';
import { UpdateMutualFundDto } from './dto/update-mutual-fund.dto';
import { CreateSipEntryDto } from './dto/create-sip-entry.dto';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { AppResponse } from '../../shared/appresponse.shared';

@ApiTags('Mutual Funds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mutual-funds')
export class MutualFundsController {
  constructor(
    private readonly mutualFundsService: MutualFundsAbstract,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a mutual fund for logged-in user',
  })
  @ApiResponse({
    status: 201,
    description: 'Mutual fund created successfully',
  })
  async createFund(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createMutualFundDto: CreateMutualFundDto,
  ): Promise<AppResponse> {
    return await this.mutualFundsService.createFund(
      currentUser.userId,
      createMutualFundDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List logged-in user mutual funds',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Mutual funds fetched successfully',
  })
  async listFunds(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<AppResponse> {
    return await this.mutualFundsService.listFunds(
      currentUser.userId,
      includeArchived === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get logged-in user mutual fund by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Mutual fund fetched successfully',
  })
  async getFundById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AppResponse> {
    return await this.mutualFundsService.getFundById(
      currentUser.userId,
      id,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update logged-in user mutual fund',
  })
  @ApiResponse({
    status: 200,
    description: 'Mutual fund updated successfully',
  })
  async updateFund(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateMutualFundDto: UpdateMutualFundDto,
  ): Promise<AppResponse> {
    return await this.mutualFundsService.updateFund(
      currentUser.userId,
      id,
      updateMutualFundDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Archive logged-in user mutual fund',
  })
  @ApiResponse({
    status: 200,
    description: 'Mutual fund archived successfully',
  })
  async archiveFund(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AppResponse> {
    return await this.mutualFundsService.archiveFund(
      currentUser.userId,
      id,
    );
  }

  @Post(':id/sip')
  @ApiOperation({
    summary: 'Create monthly SIP entry for a mutual fund',
  })
  @ApiResponse({
    status: 201,
    description: 'SIP entry created successfully',
  })
  async createSipEntry(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() createSipEntryDto: CreateSipEntryDto,
  ): Promise<AppResponse> {
    return await this.mutualFundsService.createSipEntry(
      currentUser.userId,
      id,
      createSipEntryDto,
    );
  }

  @Get(':id/sip')
  @ApiOperation({
    summary: 'List SIP entries of a mutual fund',
  })
  @ApiResponse({
    status: 200,
    description: 'SIP entries fetched successfully',
  })
  async listSipEntries(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AppResponse> {
    return await this.mutualFundsService.listSipEntries(
      currentUser.userId,
      id,
    );
  }

  @Get(':id/projection')
  @ApiOperation({
    summary: 'Get mutual fund projection at current, 1yr, 3yr, 5yr, and 10yr',
  })
  @ApiResponse({
    status: 200,
    description: 'Mutual fund projection fetched successfully',
  })
  async getProjection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AppResponse> {
    return await this.mutualFundsService.getProjection(
      currentUser.userId,
      id,
    );
  }
}
