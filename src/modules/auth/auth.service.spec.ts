jest.mock('jose', () => ({
    createRemoteJWKSet: jest.fn(),
    jwtVerify: jest.fn(),
}));

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { AuthProvider } from '../../core/enums/auth-provider.enum';
import { Messages } from '../../shared/messages.shared';
import { createResponse } from '../../shared/appresponse.shared';

describe('AuthService', () => {
    let service: AuthService;

    const mockAuthDao = {
        findUserByEmail: jest.fn(),
        findUserByMicrosoftId: jest.fn(),
        findUserById: jest.fn(),
        createUser: jest.fn(),
        updateUserName: jest.fn(),
        createSession: jest.fn(),
        findActiveSession: jest.fn(),
        closeSession: jest.fn(),
        closeActiveSessions: jest.fn(),
        saveSessionRefreshToken: jest.fn(),
    };

    const mockUsersService = {
        findByEmail: jest.fn(),
        findByIdWithRefreshToken: jest.fn(),
        findProfileById: jest.fn(),
        updateRefreshTokenHash: jest.fn(),
    };

    const mockJwtService = {
        signAsync: jest.fn(),
        verifyAsync: jest.fn(),
    };

    const mockAppConfigService = {
        jwtAccessSecret: 'access-secret',
        jwtRefreshSecret: 'refresh-secret',
        jwtAccessExpiresIn: '15m',
        jwtRefreshExpiresIn: '7d',

        microsoftClientId: 'microsoft-client-id',
        microsoftTenantId: 'common',
        microsoftClientSecret: 'microsoft-client-secret',
        microsoftRedirectUri:
            'http://localhost:3000/auth/microsoft/callback',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockAppConfigService.jwtAccessSecret = 'access-secret';
        mockAppConfigService.jwtRefreshSecret = 'refresh-secret';
        mockAppConfigService.jwtAccessExpiresIn = '15m';
        mockAppConfigService.jwtRefreshExpiresIn = '7d';

        mockAppConfigService.microsoftClientId =
            'microsoft-client-id';

        mockAppConfigService.microsoftTenantId = 'common';

        mockAppConfigService.microsoftClientSecret =
            'microsoft-client-secret';

        mockAppConfigService.microsoftRedirectUri =
            'http://localhost:3000/auth/microsoft/callback';

        service = new AuthService(
            mockAuthDao as any,
            mockUsersService as any,
            mockJwtService as unknown as JwtService,
            mockAppConfigService as any,
        );
    });

    // =========================================================
    // Test #1
    // =========================================================

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // =========================================================
    // register()
    // =========================================================

    // Test #2
    it('should register a new native user successfully', async () => {
        const registerDto = {
            name: '  John Doe  ',
            email: '  JOHN@EXAMPLE.COM  ',
            password: 'Password@123',
        };

        const createdUser = {
            _id: {
                toString: () => 'user-123',
            },
            name: 'John Doe',
            email: 'john@example.com',
            authProvider: AuthProvider.NATIVE,
        };

        mockAuthDao.findUserByEmail.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        (bcrypt.hash as jest.Mock).mockResolvedValue(
            'hashed-password',
        );

        mockAuthDao.createUser.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S4, createdUser),
        );

        const result = await service.register(registerDto as any);

        expect(mockAuthDao.findUserByEmail).toHaveBeenCalledWith(
            'john@example.com',
        );

        expect(bcrypt.hash).toHaveBeenCalledWith(
            'Password@123',
            12,
        );

        expect(mockAuthDao.createUser).toHaveBeenCalledWith({
            name: 'John Doe',
            email: 'john@example.com',
            passwordHash: 'hashed-password',
            authProvider: AuthProvider.NATIVE,
            microsoftId: null,
            refreshTokenHash: null,
            isActive: true,
        });

        expect(result.code).toBe(HttpStatus.CREATED);
        expect(result.message).toBe(Messages.S4);
        expect(result.data).toEqual({
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
            authProvider: AuthProvider.NATIVE,
        });
    });

    // Test #3
    it('should reject registration when email already exists', async () => {
        const registerDto = {
            name: 'John Doe',
            email: 'john@example.com',
            password: 'Password@123',
        };

        mockAuthDao.findUserByEmail.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: 'existing-user',
                email: 'john@example.com',
            }),
        );

        const result = await service.register(registerDto as any);

        expect(result.code).toBe(HttpStatus.CONFLICT);
        expect(result.message).toBe(Messages.W6);

        expect(mockAuthDao.findUserByEmail).toHaveBeenCalledWith(
            'john@example.com',
        );

        expect(mockAuthDao.createUser).not.toHaveBeenCalled();

        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    // Test #4
    it('should trim name and normalize email during registration', async () => {
        const registerDto = {
            name: '   Alice Smith   ',
            email: '   ALICE@EXAMPLE.COM   ',
            password: 'Secret@123',
        };

        const createdUser = {
            _id: {
                toString: () => 'user-456',
            },
            name: 'Alice Smith',
            email: 'alice@example.com',
            authProvider: AuthProvider.NATIVE,
        };

        mockAuthDao.findUserByEmail.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        (bcrypt.hash as jest.Mock).mockResolvedValue(
            'hashed-secret',
        );

        mockAuthDao.createUser.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S4, createdUser),
        );

        const result = await service.register(registerDto as any);

        expect(mockAuthDao.findUserByEmail).toHaveBeenCalledWith(
            'alice@example.com',
        );

        expect(mockAuthDao.createUser).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Alice Smith',
                email: 'alice@example.com',
            }),
        );
    });

    // Test #5
    it('should hash the password before creating the user', async () => {
        const registerDto = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'MySecretPassword',
        };

        const createdUser = {
            _id: {
                toString: () => 'user-789',
            },
            name: 'Test User',
            email: 'test@example.com',
            authProvider: AuthProvider.NATIVE,
        };

        mockAuthDao.findUserByEmail.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        (bcrypt.hash as jest.Mock).mockResolvedValue(
            'secure-hash',
        );

        mockAuthDao.createUser.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S4, createdUser),
        );

        await service.register(registerDto as any);

        expect(bcrypt.hash).toHaveBeenCalledWith(
            'MySecretPassword',
            12,
        );

        expect(mockAuthDao.createUser).toHaveBeenCalledWith(
            expect.objectContaining({
                passwordHash: 'secure-hash',
            }),
        );

        expect(mockAuthDao.createUser).not.toHaveBeenCalledWith(
            expect.objectContaining({
                passwordHash: 'MySecretPassword',
            }),
        );
    });

    // Test #6
    it('should create a native user with correct default authentication fields', async () => {
        const registerDto = {
            name: 'Default Fields User',
            email: 'default@example.com',
            password: 'Password@123',
        };

        const createdUser = {
            _id: {
                toString: () => 'user-default',
            },
            name: 'Default Fields User',
            email: 'default@example.com',
            authProvider: AuthProvider.NATIVE,
        };

        mockAuthDao.findUserByEmail.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        (bcrypt.hash as jest.Mock).mockResolvedValue(
            'hashed-password',
        );

        mockAuthDao.createUser.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S4, createdUser),
        );

        await service.register(registerDto as any);

        expect(mockAuthDao.createUser).toHaveBeenCalledWith(
            expect.objectContaining({
                authProvider: AuthProvider.NATIVE,
                microsoftId: null,
                refreshTokenHash: null,
                isActive: true,
            }),
        );
    });

    it('should login successfully with valid credentials', async () => {
        const loginDto = {
            email: '  JOHN@EXAMPLE.COM  ',
            password: 'Password@123',
        };

        const user = {
            _id: {
                toString: () => 'user-123',
            },
            name: 'John Doe',
            email: 'john@example.com',
            passwordHash: 'hashed-password',
            authProvider: AuthProvider.NATIVE,
            isActive: true,
        };

        const session = {
            _id: {
                toString: () => 'session-123',
            },
        };

        mockUsersService.findByEmail.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, user),
        );

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        mockAuthDao.closeActiveSessions.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                acknowledged: true,
            }),
        );

        mockAuthDao.createSession.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S3, session),
        );

        mockJwtService.signAsync
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce('refresh-token');

        (bcrypt.hash as jest.Mock).mockResolvedValue(
            'refresh-token-hash',
        );

        mockAuthDao.saveSessionRefreshToken.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockUsersService.updateRefreshTokenHash.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        const result = await service.login(loginDto as any);

        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
            'john@example.com',
        );

        expect(bcrypt.compare).toHaveBeenCalledWith(
            'Password@123',
            'hashed-password',
        );

        expect(mockAuthDao.createSession).toHaveBeenCalled();

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S5);
        expect(result.data).toEqual({
            user: {
                id: 'user-123',
                name: 'John Doe',
                email: 'john@example.com',
                authProvider: AuthProvider.NATIVE,
            },
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        });
    });

    it('should reject login when user is not found', async () => {
        const loginDto = {
            email: 'missing@example.com',
            password: 'Password@123',
        };

        mockUsersService.findByEmail.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        const result = await service.login(loginDto as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W20);

        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
            'missing@example.com',
        );

        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(mockAuthDao.createSession).not.toHaveBeenCalled();
    });

    it('should reject login when user is inactive', async () => {
        const loginDto = {
            email: 'inactive@example.com',
            password: 'Password@123',
        };

        mockUsersService.findByEmail.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: {
                    toString: () => 'user-123',
                },
                name: 'Inactive User',
                email: 'inactive@example.com',
                passwordHash: 'hashed-password',
                authProvider: AuthProvider.NATIVE,
                isActive: false,
            }),
        );

        const result = await service.login(loginDto as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W8);

        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(mockAuthDao.createSession).not.toHaveBeenCalled();
    });

    it('should reject native login for a Microsoft account', async () => {
        const loginDto = {
            email: 'microsoft@example.com',
            password: 'Password@123',
        };

        mockUsersService.findByEmail.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: {
                    toString: () => 'user-456',
                },
                name: 'Microsoft User',
                email: 'microsoft@example.com',
                passwordHash: null,
                authProvider: AuthProvider.MICROSOFT,
                isActive: true,
            }),
        );

        const result = await service.login(loginDto as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W19);

        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(mockAuthDao.createSession).not.toHaveBeenCalled();
    });

    it('should reject login when password is invalid', async () => {
        const loginDto = {
            email: 'john@example.com',
            password: 'WrongPassword',
        };

        mockUsersService.findByEmail.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: {
                    toString: () => 'user-123',
                },
                name: 'John Doe',
                email: 'john@example.com',
                passwordHash: 'hashed-password',
                authProvider: AuthProvider.NATIVE,
                isActive: true,
            }),
        );

        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await service.login(loginDto as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W7);

        expect(bcrypt.compare).toHaveBeenCalledWith(
            'WrongPassword',
            'hashed-password',
        );

        expect(mockAuthDao.createSession).not.toHaveBeenCalled();
    });

    it('should close existing active sessions before creating a new session', async () => {
        const userId = 'user-123';

        mockAuthDao.closeActiveSessions.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        await (service as any).closeExistingActiveSessions(userId);

        expect(mockAuthDao.closeActiveSessions).toHaveBeenCalledWith(
            userId,
            expect.any(String),
        );
    });

    it('should create an active session for the user', async () => {
        const userId = 'user-123';

        const session = {
            _id: {
                toString: () => 'session-123',
            },
        };

        mockAuthDao.createSession.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S3, session),
        );

        const result = await (service as any).createActiveSession(
            userId,
            AuthProvider.NATIVE,
        );

        expect(mockAuthDao.createSession).toHaveBeenCalledWith(
            userId,
            AuthProvider.NATIVE,
            expect.any(String),
        );

        expect(result).toEqual(
            createResponse(HttpStatus.CREATED, Messages.S3, session),
        );
    });

    it('should verify a refresh token using the configured refresh secret', async () => {
        const decodedToken = {
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        };

        mockJwtService.verifyAsync.mockResolvedValue(decodedToken);

        const result = await (service as any).verifyRefreshToken(
            'refresh-token',
        );

        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
            'refresh-token',
            {
                secret: mockAppConfigService.jwtRefreshSecret,
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S3);
        expect(result.data).toEqual(decodedToken);
    });

    it('should reject an invalid refresh token', async () => {
        mockJwtService.verifyAsync.mockRejectedValue(
            new Error('Invalid token'),
        );

        const result = await (service as any).verifyRefreshToken('invalid-token');

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W9);

        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
            'invalid-token',
            {
                secret: mockAppConfigService.jwtRefreshSecret,
            },
        );
    });

    it('should generate and save access and refresh tokens', async () => {
        const user = {
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
            authProvider: AuthProvider.NATIVE,
        };

        mockJwtService.signAsync
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce('refresh-token');

        (bcrypt.hash as jest.Mock).mockResolvedValue(
            'refresh-token-hash',
        );

        mockAuthDao.saveSessionRefreshToken.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockUsersService.updateRefreshTokenHash.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        const result = await (service as any).generateAndSaveTokens({
            user,
            sessionId: 'session-123',
        });

        expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
            1,
            {
                sub: 'user-123',
                email: 'john@example.com',
                name: 'John Doe',
                authProvider: AuthProvider.NATIVE,
                sessionId: 'session-123',
            },
            {
                secret: mockAppConfigService.jwtAccessSecret,
                expiresIn: mockAppConfigService.jwtAccessExpiresIn,
            },
        );

        expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
            2,
            {
                sub: 'user-123',
                email: 'john@example.com',
                name: 'John Doe',
                authProvider: AuthProvider.NATIVE,
                sessionId: 'session-123',
            },
            {
                secret: mockAppConfigService.jwtRefreshSecret,
                expiresIn: mockAppConfigService.jwtRefreshExpiresIn,
            },
        );

        expect(bcrypt.hash).toHaveBeenCalledWith(
            'refresh-token',
            12,
        );

        expect(mockAuthDao.saveSessionRefreshToken).toHaveBeenCalledWith(
            'session-123',
            'user-123',
            'refresh-token-hash',
        );

        expect(
            mockUsersService.updateRefreshTokenHash,
        ).toHaveBeenCalledWith(
            'user-123',
            'refresh-token-hash',
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toEqual({
            user,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        });
    });

    it('should refresh tokens successfully with a valid refresh token', async () => {
        const decodedToken = {
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        };

        const user = {
            _id: {
                toString: () => 'user-123',
            },
            name: 'John Doe',
            email: 'john@example.com',
            authProvider: AuthProvider.NATIVE,
            isActive: true,
        };

        const session = {
            _id: {
                toString: () => 'session-123',
            },
            refreshTokenHash: 'stored-refresh-hash',
        };

        mockJwtService.verifyAsync.mockResolvedValue(decodedToken);

        mockAuthDao.findUserById.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, user),
        );

        mockAuthDao.findActiveSession.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, session),
        );

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        mockJwtService.signAsync
            .mockResolvedValueOnce('new-access-token')
            .mockResolvedValueOnce('new-refresh-token');

        (bcrypt.hash as jest.Mock).mockResolvedValue(
            'new-refresh-hash',
        );

        mockAuthDao.saveSessionRefreshToken.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockUsersService.updateRefreshTokenHash.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        const result = await service.refreshToken({
            refreshToken: 'old-refresh-token',
        } as any);

        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
            'old-refresh-token',
            {
                secret: mockAppConfigService.jwtRefreshSecret,
            },
        );

        expect(mockAuthDao.findUserById).toHaveBeenCalledWith(
            'user-123',
        );

        expect(bcrypt.compare).toHaveBeenCalledWith(
            'old-refresh-token',
            'stored-refresh-hash',
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S6);
        expect(result.data.accessToken).toBe('new-access-token');
        expect(result.data.refreshToken).toBe('new-refresh-token');
    });

    it('should reject refresh when user does not exist', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({
            sub: 'missing-user',
            email: 'missing@example.com',
            name: 'Missing User',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        });

        mockAuthDao.findUserById.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        const result = await service.refreshToken({
            refreshToken: 'refresh-token',
        } as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W9);

        expect(mockAuthDao.findActiveSession).not.toHaveBeenCalled();
    });

    it('should reject refresh when user is inactive', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        });

        mockAuthDao.findUserById.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: {
                    toString: () => 'user-123',
                },
                name: 'John Doe',
                email: 'john@example.com',
                authProvider: AuthProvider.NATIVE,
                isActive: false,
            }),
        );

        const result = await service.refreshToken({
            refreshToken: 'refresh-token',
        } as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W8);

        expect(mockAuthDao.findActiveSession).not.toHaveBeenCalled();
    });

    it('should reject refresh when active session or refresh hash is missing', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        });

        mockAuthDao.findUserById.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: {
                    toString: () => 'user-123',
                },
                name: 'John Doe',
                email: 'john@example.com',
                authProvider: AuthProvider.NATIVE,
                isActive: true,
            }),
        );

        mockAuthDao.findActiveSession.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        const result = await service.refreshToken({
            refreshToken: 'refresh-token',
        } as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W9);

        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should reject refresh when refresh token hash is invalid', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        });

        mockAuthDao.findUserById.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: {
                    toString: () => 'user-123',
                },
                name: 'John Doe',
                email: 'john@example.com',
                authProvider: AuthProvider.NATIVE,
                isActive: true,
            }),
        );

        const session = {
            _id: {
                toString: () => 'session-123',
            },
            refreshTokenHash: 'different-hash',
        };

        mockAuthDao.findActiveSession.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, session),
        );

        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await service.refreshToken({
            refreshToken: 'refresh-token',
        } as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W9);

        expect(bcrypt.compare).toHaveBeenCalledWith(
            'refresh-token',
            'different-hash',
        );

        expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should logout successfully with a valid refresh token', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        });

        const session = {
            _id: {
                toString: () => 'session-123',
            },
            refreshTokenHash: 'stored-hash',
        };

        mockAuthDao.findActiveSession.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, session),
        );

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        mockAuthDao.closeSession.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockUsersService.updateRefreshTokenHash.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        const result = await service.logout({
            refreshToken: 'refresh-token',
        } as any);

        expect(mockAuthDao.closeSession).toHaveBeenCalledWith(
            'session-123',
            'user-123',
            expect.any(String),
        );

        expect(
            mockUsersService.updateRefreshTokenHash,
        ).toHaveBeenCalledWith('user-123', null);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S7);
        expect(result.data).toEqual({
            loggedOut: true,
        });
    });

    it('should reject logout when active session does not exist', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        });

        mockAuthDao.findActiveSession.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        const result = await service.logout({
            refreshToken: 'refresh-token',
        } as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W9);

        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(mockUsersService.updateRefreshTokenHash).not.toHaveBeenCalled();
    });

    it('should reject logout when session refresh token hash is missing', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        });

        const session = {
            _id: {
                toString: () => 'session-123',
            },
            refreshTokenHash: null,
        };

        mockAuthDao.findActiveSession.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, session),
        );

        const result = await service.logout({
            refreshToken: 'refresh-token',
        } as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W9);

        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should reject logout when refresh token hash is invalid', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        });

        const session = {
            _id: {
                toString: () => 'session-123',
            },
            refreshTokenHash: 'stored-hash',
        };

        mockAuthDao.findActiveSession.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, session),
        );

        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await service.logout({
            refreshToken: 'wrong-refresh-token',
        } as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W9);

        expect(bcrypt.compare).toHaveBeenCalledWith(
            'wrong-refresh-token',
            'stored-hash',
        );

        expect(mockAuthDao.closeSession).not.toHaveBeenCalled();
        expect(
            mockUsersService.updateRefreshTokenHash,
        ).not.toHaveBeenCalled();
    });

    it('should close an active session', async () => {
        mockAuthDao.closeSession.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        await (service as any).closeSession(
            'session-123',
            'user-123',
        );

        expect(mockAuthDao.closeSession).toHaveBeenCalledWith(
            'session-123',
            'user-123',
            expect.any(String),
        );
    });

    it('should register a new Microsoft user successfully', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        const profile = {
            microsoftId: 'ms-123',
            email: 'john@example.com',
            name: 'John Doe',
        };

        const tokenResponse = {
            id_token: 'microsoft-id-token',
        };

        const createdUser = {
            _id: {
                toString: () => 'user-ms-123',
            },
            name: 'John Doe',
            email: 'john@example.com',
            authProvider: AuthProvider.MICROSOFT,
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, tokenResponse),
            );

        jest
            .spyOn(service as any, 'verifyMicrosoftIdToken')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, profile),
            );

        mockAuthDao.findUserByMicrosoftId.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        mockAuthDao.findUserByEmail.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        mockAuthDao.createUser.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S26, createdUser),
        );

        const result = await service.microsoftCodeRegister(
            dto as any,
        );

        expect(mockAuthDao.createUser).toHaveBeenCalledWith({
            name: 'John Doe',
            email: 'john@example.com',
            passwordHash: null,
            authProvider: AuthProvider.MICROSOFT,
            microsoftId: 'ms-123',
            refreshTokenHash: null,
            isActive: true,
        });

        expect(result.code).toBe(HttpStatus.CREATED);
        expect(result.message).toBe(Messages.S26);
        expect(result.data).toEqual({
            id: 'user-ms-123',
            name: 'John Doe',
            email: 'john@example.com',
            authProvider: AuthProvider.MICROSOFT,
        });
    });

    it('should reject Microsoft registration when ID token is missing', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, {}),
            );

        const result = await service.microsoftCodeRegister(dto as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W38);

        expect(
            mockAuthDao.createUser,
        ).not.toHaveBeenCalled();
    });

    it('should reject Microsoft registration when Microsoft account already exists', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        const profile = {
            microsoftId: 'ms-123',
            email: 'john@example.com',
            name: 'John Doe',
        };

        const tokenResponse = {
            id_token: 'microsoft-id-token',
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, tokenResponse),
            );

        jest
            .spyOn(service as any, 'verifyMicrosoftIdToken')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, profile),
            );

        mockAuthDao.findUserByMicrosoftId.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: 'existing-ms-user',
                microsoftId: 'ms-123',
            }),
        );

        const result = await service.microsoftCodeRegister(dto as any);

        expect(result.code).toBe(HttpStatus.CONFLICT);
        expect(result.message).toBe(Messages.W16);

        expect(mockAuthDao.findUserByMicrosoftId).toHaveBeenCalledWith(
            'ms-123',
        );

        expect(mockAuthDao.createUser).not.toHaveBeenCalled();
    });

    it('should reject Microsoft registration when email already exists', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        const profile = {
            microsoftId: 'ms-new',
            email: 'existing@example.com',
            name: 'Existing User',
        };

        const tokenResponse = {
            id_token: 'microsoft-id-token',
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, tokenResponse),
            );

        jest
            .spyOn(service as any, 'verifyMicrosoftIdToken')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, profile),
            );

        mockAuthDao.findUserByMicrosoftId.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        mockAuthDao.findUserByEmail.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: 'existing-user',
                email: 'existing@example.com',
            }),
        );

        const result = await service.microsoftCodeRegister(dto as any);

        expect(result.code).toBe(HttpStatus.CONFLICT);
        expect(result.message).toBe(Messages.W17);

        expect(mockAuthDao.createUser).not.toHaveBeenCalled();
    });

    it('should reject Microsoft registration when ID token verification fails', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        const tokenResponse = {
            id_token: 'invalid-id-token',
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, tokenResponse),
            );

        jest
            .spyOn(service as any, 'verifyMicrosoftIdToken')
            .mockResolvedValue(
                createResponse(HttpStatus.UNAUTHORIZED, Messages.W13),
            );

        const result = await service.microsoftCodeRegister(dto as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W13);

        expect(mockAuthDao.createUser).not.toHaveBeenCalled();
    });

    it('should login successfully with Microsoft', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        const profile = {
            microsoftId: 'ms-123',
            email: 'john@example.com',
            name: 'John Doe',
        };

        const tokenResponse = {
            id_token: 'microsoft-id-token',
        };

        const existingUser = {
            _id: {
                toString: () => 'user-ms-123',
            },
            name: 'John Doe',
            email: 'john@example.com',
            authProvider: AuthProvider.MICROSOFT,
            isActive: true,
        };

        const session = {
            _id: {
                toString: () => 'session-ms-123',
            },
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, tokenResponse),
            );

        jest
            .spyOn(service as any, 'verifyMicrosoftIdToken')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, profile),
            );

        mockAuthDao.findUserByMicrosoftId.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, existingUser),
        );

        mockAuthDao.updateUserName.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockAuthDao.closeActiveSessions.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockAuthDao.createSession.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S3, session),
        );

        mockJwtService.signAsync
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce('refresh-token');

        (bcrypt.hash as jest.Mock).mockResolvedValue(
            'refresh-token-hash',
        );

        mockAuthDao.saveSessionRefreshToken.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockUsersService.updateRefreshTokenHash.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        const result = await service.microsoftCodeLogin(dto as any);

        expect(mockAuthDao.updateUserName).toHaveBeenCalledWith(
            existingUser._id.toString(),
            'John Doe',
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S27);
        expect(result.data.accessToken).toBe('access-token');
        expect(result.data.refreshToken).toBe('refresh-token');
    });

    it('should reject Microsoft login when ID token is missing', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, {}),
            );

        const result = await service.microsoftCodeLogin(dto as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W38);

        expect(mockAuthDao.findUserByMicrosoftId).not.toHaveBeenCalled();
    });

    it('should reject Microsoft login when account is not registered', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        const profile = {
            microsoftId: 'unknown-ms-id',
            email: 'unknown@example.com',
            name: 'Unknown User',
        };

        const tokenResponse = {
            id_token: 'microsoft-id-token',
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, tokenResponse),
            );

        jest
            .spyOn(service as any, 'verifyMicrosoftIdToken')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, profile),
            );

        mockAuthDao.findUserByMicrosoftId.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, Messages.W5),
        );

        const result = await service.microsoftCodeLogin(dto as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W18);

        expect(mockAuthDao.updateUserName).not.toHaveBeenCalled();
    });

    it('should reject Microsoft login when account is inactive', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        const profile = {
            microsoftId: 'ms-123',
            email: 'john@example.com',
            name: 'John Doe',
        };

        const tokenResponse = {
            id_token: 'microsoft-id-token',
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, tokenResponse),
            );

        jest
            .spyOn(service as any, 'verifyMicrosoftIdToken')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, profile),
            );

        mockAuthDao.findUserByMicrosoftId.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, {
                _id: {
                    toString: () => 'user-ms-123',
                },
                name: 'John Doe',
                email: 'john@example.com',
                authProvider: AuthProvider.MICROSOFT,
                isActive: false,
            }),
        );

        const result = await service.microsoftCodeLogin(dto as any);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W8);

        expect(mockAuthDao.updateUserName).not.toHaveBeenCalled();
    });

    it('should use Microsoft profile name when existing user name is empty', async () => {
        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
            nonce: 'nonce-123',
        };

        const profile = {
            microsoftId: 'ms-123',
            email: 'john@example.com',
            name: 'John Microsoft',
        };

        const tokenResponse = {
            id_token: 'microsoft-id-token',
        };

        const existingUser = {
            _id: {
                toString: () => 'user-ms-123',
            },
            name: '   ',
            email: 'john@example.com',
            authProvider: AuthProvider.MICROSOFT,
            isActive: true,
        };

        const session = {
            _id: {
                toString: () => 'session-ms-123',
            },
        };

        jest
            .spyOn(service as any, 'exchangeMicrosoftCodeForTokens')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, tokenResponse),
            );

        jest
            .spyOn(service as any, 'verifyMicrosoftIdToken')
            .mockResolvedValue(
                createResponse(HttpStatus.OK, Messages.S3, profile),
            );

        mockAuthDao.findUserByMicrosoftId.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, existingUser),
        );

        mockAuthDao.updateUserName.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockAuthDao.closeActiveSessions.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockAuthDao.createSession.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S3, session),
        );

        mockJwtService.signAsync
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce('refresh-token');

        (bcrypt.hash as jest.Mock).mockResolvedValue(
            'refresh-token-hash',
        );

        mockAuthDao.saveSessionRefreshToken.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockUsersService.updateRefreshTokenHash.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        const result = await service.microsoftCodeLogin(dto as any);

        expect(mockAuthDao.updateUserName).toHaveBeenCalledWith(
            existingUser._id.toString(),
            'John Microsoft',
        );

        expect(result.data.user.name).toBe('John Microsoft');
    });

    it('should reject Microsoft code exchange when Microsoft login is not configured', async () => {
        mockAppConfigService.microsoftClientId = '';

        const result = await (service as any).exchangeMicrosoftCodeForTokens({
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
        });

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W10);
    });

    it('should reject Microsoft code exchange when redirect URI is invalid', async () => {
        const result = await (service as any).exchangeMicrosoftCodeForTokens({
            code: 'microsoft-code',
            redirectUri: 'http://invalid-redirect-uri',
        });

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W11);
    });

    it('should exchange Microsoft authorization code for tokens', async () => {
        const tokenResponse = {
            token_type: 'Bearer',
            access_token: 'access-token',
            id_token: 'id-token',
            scope: 'openid profile email User.Read',
        };

        const fetchMock = jest
            .spyOn(global, 'fetch')
            .mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(tokenResponse),
            } as any);

        const dto = {
            code: 'microsoft-code',
            redirectUri: mockAppConfigService.microsoftRedirectUri,
        };

        const result = await (service as any).exchangeMicrosoftCodeForTokens(
            dto,
        );

        expect(fetchMock).toHaveBeenCalledWith(
            'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded',
                },
                body: expect.any(URLSearchParams),
            }),
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S3);
        expect(result.data).toEqual(tokenResponse);

        fetchMock.mockRestore();
    });

    it('should reject Microsoft code exchange when Microsoft returns an error', async () => {
        const fetchMock = jest
            .spyOn(global, 'fetch')
            .mockResolvedValue({
                ok: false,
                json: jest.fn().mockResolvedValue({
                    error: 'invalid_grant',
                    error_description: 'Authorization code expired.',
                }),
            } as any);

        const result = await (service as any).exchangeMicrosoftCodeForTokens({
            code: 'expired-code',
            redirectUri:
                mockAppConfigService.microsoftRedirectUri,
        });

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe('Authorization code expired.');

        fetchMock.mockRestore();
    });

    it('should use fallback message when Microsoft exchange error has no description', async () => {
        const fetchMock = jest
            .spyOn(global, 'fetch')
            .mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    error: 'invalid_grant',
                }),
            } as any);

        const result = await (service as any).exchangeMicrosoftCodeForTokens({
            code: 'invalid-code',
            redirectUri:
                mockAppConfigService.microsoftRedirectUri,
        });

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W12);

        fetchMock.mockRestore();
    });

    it('should verify and return a valid Microsoft ID token profile', async () => {
        const { jwtVerify, createRemoteJWKSet } = require('jose');

        const jwks = jest.fn();
        createRemoteJWKSet.mockReturnValue(jwks);

        const payload = {
            oid: 'microsoft-user-123',
            email: 'john@example.com',
            name: 'John Doe',
        };

        jwtVerify.mockResolvedValue({
            payload,
        });

        jest
            .spyOn(service as any, 'validateMicrosoftPayload')
            .mockReturnValue(createResponse(HttpStatus.OK, Messages.S3));

        jest
            .spyOn(service as any, 'getMicrosoftId')
            .mockReturnValue(createResponse(HttpStatus.OK, Messages.S3, 'microsoft-user-123'));

        jest
            .spyOn(service as any, 'getMicrosoftEmail')
            .mockReturnValue(createResponse(HttpStatus.OK, Messages.S3, 'john@example.com'));

        jest
            .spyOn(service as any, 'getMicrosoftName')
            .mockReturnValue('John Doe');

        const result = await (service as any).verifyMicrosoftIdToken(
            'valid-id-token',
            'nonce-123',
        );

        expect(createRemoteJWKSet).toHaveBeenCalledWith(
            expect.any(URL),
        );

        expect(jwtVerify).toHaveBeenCalledWith(
            'valid-id-token',
            jwks,
            {
                audience: mockAppConfigService.microsoftClientId,
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S3);
        expect(result.data).toEqual({
            microsoftId: 'microsoft-user-123',
            email: 'john@example.com',
            name: 'John Doe',
        });
    });

    it('should reject when Microsoft payload validation fails', async () => {
        const { jwtVerify, createRemoteJWKSet } = require('jose');

        const jwks = jest.fn();
        createRemoteJWKSet.mockReturnValue(jwks);

        const payload = {
            oid: 'microsoft-user-123',
            email: 'john@example.com',
            name: 'John Doe',
        };

        jwtVerify.mockResolvedValue({
            payload,
        });

        jest
            .spyOn(service as any, 'validateMicrosoftPayload')
            .mockReturnValue(createResponse(HttpStatus.UNAUTHORIZED, Messages.W13));

        const getMicrosoftIdSpy = jest.spyOn(
            service as any,
            'getMicrosoftId',
        );

        const result = await (service as any).verifyMicrosoftIdToken(
            'valid-id-token',
            'nonce-123',
        );

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W13);

        expect(getMicrosoftIdSpy).not.toHaveBeenCalled();
    });

    it('should reject when Microsoft JWT verification fails', async () => {
        const { jwtVerify, createRemoteJWKSet } = require('jose');

        const jwks = jest.fn();
        createRemoteJWKSet.mockReturnValue(jwks);

        jwtVerify.mockRejectedValue(
            new Error('JWT verification failed'),
        );

        const result = await (service as any).verifyMicrosoftIdToken(
            'invalid-id-token',
            'nonce-123',
        );

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W13);

        expect(jwtVerify).toHaveBeenCalledWith(
            'invalid-id-token',
            jwks,
            {
                audience: mockAppConfigService.microsoftClientId,
            },
        );
    });

    it('should reject Microsoft ID token verification when Microsoft login is not configured', async () => {
        const originalClientId =
            mockAppConfigService.microsoftClientId;

        mockAppConfigService.microsoftClientId = '';

        const result = await (service as any).verifyMicrosoftIdToken(
            'id-token',
            'nonce-123',
        );

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W10);

        mockAppConfigService.microsoftClientId =
            originalClientId;
    });

    it('should verify Microsoft token with issuer for a specific tenant', async () => {
        const { jwtVerify, createRemoteJWKSet } = require('jose');

        const originalTenantId =
            mockAppConfigService.microsoftTenantId;

        mockAppConfigService.microsoftTenantId =
            'tenant-123';

        const jwks = jest.fn();
        createRemoteJWKSet.mockReturnValue(jwks);

        const payload = {
            oid: 'microsoft-user-123',
            email: 'john@example.com',
            name: 'John Doe',
        };

        jwtVerify.mockResolvedValue({
            payload,
        });

        jest
            .spyOn(service as any, 'validateMicrosoftPayload')
            .mockReturnValue(createResponse(HttpStatus.OK, Messages.S3));

        jest
            .spyOn(service as any, 'getMicrosoftId')
            .mockReturnValue(createResponse(HttpStatus.OK, Messages.S3, 'microsoft-user-123'));

        jest
            .spyOn(service as any, 'getMicrosoftEmail')
            .mockReturnValue(createResponse(HttpStatus.OK, Messages.S3, 'john@example.com'));

        jest
            .spyOn(service as any, 'getMicrosoftName')
            .mockReturnValue('John Doe');

        const result = await (service as any).verifyMicrosoftIdToken(
            'valid-id-token',
            'nonce-123',
        );

        expect(jwtVerify).toHaveBeenCalledWith(
            'valid-id-token',
            jwks,
            {
                audience: mockAppConfigService.microsoftClientId,
                issuer:
                    'https://login.microsoftonline.com/tenant-123/v2.0',
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toEqual({
            microsoftId: 'microsoft-user-123',
            email: 'john@example.com',
            name: 'John Doe',
        });

        mockAppConfigService.microsoftTenantId =
            originalTenantId;
    });

    it('should get Microsoft id from oid', () => {
        const payload = {
            oid: 'oid-123',
            sub: 'sub-123',
        };

        const result = (service as any).getMicrosoftId(payload);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toBe('oid-123');
    });

    it('should get Microsoft id from sub when oid is missing', () => {
        const payload = {
            sub: 'sub-123',
        };

        const result = (service as any).getMicrosoftId(payload);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toBe('sub-123');
    });

    it('should get Microsoft email from email claim', () => {
        const payload = {
            email: 'john@example.com',
            preferred_username: 'john@outlook.com',
        };

        const result = (service as any).getMicrosoftEmail(payload);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toBe('john@outlook.com');
    });

    it('should get Microsoft email from preferred_username when email is missing', () => {
        const payload = {
            preferred_username: 'john@outlook.com',
        };

        const result = (service as any).getMicrosoftEmail(payload);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toBe('john@outlook.com');
    });

    it('should use email as fallback when Microsoft name is missing', () => {
        const payload = {};

        const result = (service as any).getMicrosoftName(
            payload,
            'john@example.com',
        );

        expect(result).toBe('john');
    });

    it('should validate a valid Microsoft payload', () => {
        const payload = {
            iss: 'https://login.microsoftonline.com/common/v2.0',
            sub: 'user-sub-123',
            nonce: 'nonce-123',
        };

        const result = (service as any).validateMicrosoftPayload(
            payload,
            'nonce-123',
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S3);
    });

    it('should reject Microsoft payload with invalid issuer', () => {
        const payload = {
            iss: 'https://invalid.microsoft.com',
            sub: 'user-sub-123',
        };

        const result = (service as any).validateMicrosoftPayload(payload);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W13);
    });

    it('should reject Microsoft payload when subject and oid are missing', () => {
        const payload = {
            iss: 'https://login.microsoftonline.com/common/v2.0',
        };

        const result = (service as any).validateMicrosoftPayload(payload);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W13);
    });

    it('should reject Microsoft payload when nonce is invalid', () => {
        const payload = {
            iss: 'https://login.microsoftonline.com/common/v2.0',
            sub: 'user-sub-123',
            nonce: 'wrong-nonce',
        };

        const result = (service as any).validateMicrosoftPayload(
            payload,
            'expected-nonce',
        );

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W13);
    });

    it('should get Microsoft email from upn when preferred_username and email are missing', () => {
        const payload = {
            upn: '  JOHN@EXAMPLE.COM  ',
        };

        const result = (service as any).getMicrosoftEmail(payload);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toBe('john@example.com');
    });

    it('should end session successfully with a valid refresh token', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'john@example.com',
            name: 'John Doe',
            authProvider: AuthProvider.NATIVE,
            sessionId: 'session-123',
        });

        mockAuthDao.closeSession.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        mockUsersService.updateRefreshTokenHash.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        const result = await service.endSession({
            refreshToken: 'refresh-token',
        } as any);

        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
            'refresh-token',
            {
                secret: mockAppConfigService.jwtRefreshSecret,
            },
        );

        expect(mockAuthDao.closeSession).toHaveBeenCalledWith(
            'session-123',
            'user-123',
            expect.any(String),
        );

        expect(
            mockUsersService.updateRefreshTokenHash,
        ).toHaveBeenCalledWith('user-123', null);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S25);
        expect(result.data).toEqual({
            sessionEnded: true,
        });
    });

    it('should return false when endSession fails', async () => {
        mockJwtService.verifyAsync.mockRejectedValue(
            new Error('Invalid refresh token'),
        );

        const result = await service.endSession({
            refreshToken: 'invalid-refresh-token',
        } as any);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S25);
        expect(result.data).toEqual({
            sessionEnded: false,
        });

        expect(
            mockAuthDao.closeSession,
        ).not.toHaveBeenCalled();

        expect(
            mockUsersService.updateRefreshTokenHash,
        ).not.toHaveBeenCalled();
    });

    it('should reject Microsoft id when oid and sub are missing', () => {
        const payload = {};

        const result = (service as any).getMicrosoftId(payload);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W14);
    });

    it('should reject Microsoft email when email is invalid', () => {
        const payload = {
            preferred_username: 'invalid-email',
        };

        const result = (service as any).getMicrosoftEmail(payload);

        expect(result.code).toBe(HttpStatus.UNAUTHORIZED);
        expect(result.message).toBe(Messages.W15);
    });

    it('should format date to IST correctly', () => {
        const date = new Date('2026-01-15T12:30:45.000Z');

        const result = (service as any).formatDateToIst(date);

        expect(result).toContain('15 Jan 2026');
        expect(result).toContain('06:00:45 pm');
    });

    it('should format date using IST timezone', () => {
        const date = new Date('2026-01-15T12:30:45.000Z');

        const result = (service as any).formatDateToIst(date);

        expect(result).toContain('15 Jan 2026');
        expect(result).toContain('06:00:45 pm');
    });
});
