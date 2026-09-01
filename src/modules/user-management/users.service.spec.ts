import { HttpStatus } from '@nestjs/common';
import type { AppResponse } from '../../shared/appresponse.shared';
import { createResponse } from '../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../shared/messages.shared';
import { UsersService } from './users.service';
import { AbstractUsersDao } from '../../database/mongodb/abstract/users.abstract';

describe('UsersService', () => {
    let service: UsersService;
    let mockUsersDao: jest.Mocked<AbstractUsersDao>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUsersDao = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            updateRefreshTokenHash: jest.fn(),
        } as unknown as jest.Mocked<AbstractUsersDao>;

        service = new UsersService(mockUsersDao);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should find a user by normalized email and return AppResponse with data', async () => {
        const email = '  USER@EXAMPLE.COM  ';

        const user = {
            _id: 'user-123',
            email: 'user@example.com',
            passwordHash: 'hashed-password',
            refreshTokenHash: 'hashed-refresh-token',
        };

        mockUsersDao.findByEmail.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, user),
        );

        const result: AppResponse = await service.findByEmail(email);

        expect(mockUsersDao.findByEmail).toHaveBeenCalledWith(email);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toEqual(user);
    });

    it('should return 404 AppResponse when user is not found by email', async () => {
        const email = 'missing@example.com';

        mockUsersDao.findByEmail.mockResolvedValue(
            createResponse(
                HttpStatus.NOT_FOUND,
                messageFactory(Messages.W5, ['User']),
            ),
        );

        const result: AppResponse = await service.findByEmail(email);

        expect(mockUsersDao.findByEmail).toHaveBeenCalledWith(email);

        expect(result.code).toBe(HttpStatus.NOT_FOUND);
        expect(result.data).toBeUndefined();
    });

    it('should find a user by id with refresh token and return AppResponse', async () => {
        const userId = 'user-123';

        const user = {
            _id: userId,
            email: 'user@example.com',
            refreshTokenHash: 'hashed-refresh-token',
        };

        mockUsersDao.findById.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, user),
        );

        const result: AppResponse =
            await service.findByIdWithRefreshToken(userId);

        expect(mockUsersDao.findById).toHaveBeenCalledWith(userId, true);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toEqual(user);
    });

    it('should return 404 AppResponse when user is not found by id with refresh token', async () => {
        const userId = 'user-123';

        mockUsersDao.findById.mockResolvedValue(
            createResponse(
                HttpStatus.NOT_FOUND,
                messageFactory(Messages.W5, ['User']),
            ),
        );

        const result: AppResponse =
            await service.findByIdWithRefreshToken(userId);

        expect(mockUsersDao.findById).toHaveBeenCalledWith(userId, true);

        expect(result.code).toBe(HttpStatus.NOT_FOUND);
    });

    it('should find a user profile by id', async () => {
        const userId = 'user-123';

        const user = {
            _id: userId,
            email: 'user@example.com',
            name: 'Test User',
        };

        mockUsersDao.findById.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S8, user),
        );

        const result: AppResponse = await service.findProfileById(userId);

        expect(mockUsersDao.findById).toHaveBeenCalledWith(userId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toEqual(user);
    });

    it('should return 404 AppResponse when user profile is not found', async () => {
        const userId = 'user-123';

        mockUsersDao.findById.mockResolvedValue(
            createResponse(
                HttpStatus.NOT_FOUND,
                messageFactory(Messages.W5, ['User']),
            ),
        );

        const result: AppResponse = await service.findProfileById(userId);

        expect(mockUsersDao.findById).toHaveBeenCalledWith(userId);

        expect(result.code).toBe(HttpStatus.NOT_FOUND);
    });

    it('should update the refresh token hash successfully via dao', async () => {
        const userId = 'user-123';
        const refreshTokenHash = 'hashed-refresh-token';

        mockUsersDao.updateRefreshTokenHash.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        const result: AppResponse = await service.updateRefreshTokenHash(
            userId,
            refreshTokenHash,
        );

        expect(mockUsersDao.updateRefreshTokenHash).toHaveBeenCalledWith(
            userId,
            refreshTokenHash,
        );

        expect(result.code).toBe(HttpStatus.OK);
    });

    it('should clear the refresh token hash when null is provided', async () => {
        const userId = 'user-123';

        mockUsersDao.updateRefreshTokenHash.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3),
        );

        const result: AppResponse = await service.updateRefreshTokenHash(
            userId,
            null,
        );

        expect(mockUsersDao.updateRefreshTokenHash).toHaveBeenCalledWith(
            userId,
            null,
        );

        expect(result.code).toBe(HttpStatus.OK);
    });
});
