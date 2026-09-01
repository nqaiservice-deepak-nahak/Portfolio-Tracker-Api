import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthAbstract } from './auth.abstract';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { MicrosoftAuthCodeDto } from './dto/microsoft-auth-code.dto';
import type { AppResponse } from '../../shared/appresponse.shared';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthAbstract) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user using native email and password',
  })
  @ApiBody({
    type: RegisterDto,
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AppResponse> {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login user using native email and password',
  })
  @ApiBody({
    type: LoginDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  async login(@Body() loginDto: LoginDto): Promise<AppResponse> {
    return await this.authService.login(loginDto);
  }

  @Post('microsoft-code-register')
  @ApiOperation({
    summary: 'Register user using Microsoft authorization code',
  })
  @ApiBody({
    type: MicrosoftAuthCodeDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Microsoft registration completed successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Microsoft account or email already exists',
  })
  async microsoftCodeRegister(
    @Body() microsoftAuthCodeDto: MicrosoftAuthCodeDto,
  ): Promise<AppResponse> {
    return await this.authService.microsoftCodeRegister(microsoftAuthCodeDto);
  }

  @Post('microsoft-code-login')
  @ApiOperation({
    summary: 'Login existing user using Microsoft authorization code',
  })
  @ApiBody({
    type: MicrosoftAuthCodeDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Microsoft login completed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Microsoft user not found',
  })
  async microsoftCodeLogin(
    @Body() microsoftAuthCodeDto: MicrosoftAuthCodeDto,
  ): Promise<AppResponse> {
    return await this.authService.microsoftCodeLogin(microsoftAuthCodeDto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh user session using refresh token',
  })
  @ApiBody({
    type: RefreshTokenDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Session refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AppResponse> {
    return await this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout user and clear refresh token session',
  })
  @ApiBody({
    type: LogoutDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async logout(@Body() logoutDto: LogoutDto): Promise<AppResponse> {
    return await this.authService.logout(logoutDto);
  }

  @Post('end-session')
  @ApiOperation({
    summary: 'End active session when user is inactive or browser tab closes',
  })
  @ApiBody({
    type: EndSessionDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Session ended successfully',
  })
  async endSession(@Body() endSessionDto: EndSessionDto): Promise<AppResponse> {
    return await this.authService.endSession(endSessionDto);
  }
}
