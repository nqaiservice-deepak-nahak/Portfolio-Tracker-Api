import { ConfigService } from '@nestjs/config';

import { AppConfigService } from './appconfig.service';

describe('AppConfigService', () => {
    let service: AppConfigService;

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        service = new AppConfigService(
            mockConfigService as unknown as ConfigService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // #2
    it('should return node environment', () => {
        mockConfigService.get.mockReturnValue('production');

        const result = service.nodeEnv;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'NODE_ENV',
            'development',
        );

        expect(result).toBe('production');
    });

    // #3
    it('should return application name', () => {
        mockConfigService.get.mockReturnValue(
            'Portfolio Tracker API',
        );

        const result = service.appName;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'APP_NAME',
            'Portfolio Tracker API',
        );

        expect(result).toBe('Portfolio Tracker API');
    });

    // #4
    it('should return application version', () => {
        mockConfigService.get.mockReturnValue('2.0.0');

        const result = service.appVersion;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'APP_VERSION',
            '1.0.0',
        );

        expect(result).toBe('2.0.0');
    });

    // #5
    it('should return application port as a number', () => {
        mockConfigService.get.mockReturnValue(3000);

        const result = service.appPort;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'APP_PORT',
            5000,
        );

        expect(result).toBe(3000);
        expect(typeof result).toBe('number');
    });

    // #6
    it('should return API prefix', () => {
        mockConfigService.get.mockReturnValue('api/v2');

        const result = service.apiPrefix;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'API_PREFIX',
            'api/v1',
        );

        expect(result).toBe('api/v2');
    });

    // #7
    it('should return MongoDB URI', () => {
        const mongodbUri =
            'mongodb://localhost:27017/test_database';

        mockConfigService.get.mockReturnValue(mongodbUri);

        const result = service.mongodbUri;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'MONGODB_URI',
            'mongodb://127.0.0.1:27017/portfolio_tracker',
        );

        expect(result).toBe(mongodbUri);
    });

    // #8
    it('should return frontend URL', () => {
        const frontendUrl = 'https://portfolio.example.com';

        mockConfigService.get.mockReturnValue(frontendUrl);

        const result = service.frontendUrl;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'FRONTEND_URL',
            'http://localhost:4000',
        );

        expect(result).toBe(frontendUrl);
    });

    // #9
    it('should return JWT access secret', () => {
        mockConfigService.get.mockReturnValue(
            'my-access-secret',
        );

        const result = service.jwtAccessSecret;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'JWT_ACCESS_SECRET',
            'change_this_access_secret',
        );

        expect(result).toBe('my-access-secret');
    });

    // #10
    it('should return JWT refresh secret', () => {
        mockConfigService.get.mockReturnValue(
            'my-refresh-secret',
        );

        const result = service.jwtRefreshSecret;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'JWT_REFRESH_SECRET',
            'change_this_refresh_secret',
        );

        expect(result).toBe('my-refresh-secret');
    });

    // #11
    it('should return JWT access token expiry', () => {
        mockConfigService.get.mockReturnValue('30m');

        const result = service.jwtAccessExpiresIn;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'JWT_ACCESS_EXPIRES_IN',
            '15m',
        );

        expect(result).toBe('30m');
    });

    // #12
    it('should return JWT refresh token expiry', () => {
        mockConfigService.get.mockReturnValue('14d');

        const result = service.jwtRefreshExpiresIn;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'JWT_REFRESH_EXPIRES_IN',
            '7d',
        );

        expect(result).toBe('14d');
    });

    // #13
    it('should return Microsoft client id', () => {
        mockConfigService.get.mockReturnValue(
            'microsoft-client-id',
        );

        const result = service.microsoftClientId;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'MICROSOFT_CLIENT_ID',
            '',
        );

        expect(result).toBe('microsoft-client-id');
    });

    // #14
    it('should return Microsoft tenant id', () => {
        mockConfigService.get.mockReturnValue('organizations');

        const result = service.microsoftTenantId;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'MICROSOFT_TENANT_ID',
            'common',
        );

        expect(result).toBe('organizations');
    });

    // #15
    it('should return Microsoft client secret', () => {
        mockConfigService.get.mockReturnValue(
            'microsoft-client-secret',
        );

        const result = service.microsoftClientSecret;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'MICROSOFT_CLIENT_SECRET',
            '',
        );

        expect(result).toBe('microsoft-client-secret');
    });

    it('should convert string application port to a number', () => {
        mockConfigService.get.mockReturnValue('8080');

        const result = service.appPort;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'APP_PORT',
            5000,
        );

        expect(result).toBe(8080);
        expect(typeof result).toBe('number');
    });

    it('should return Microsoft redirect URI', () => {
        const redirectUri =
            'https://example.com/auth/microsoft/callback';

        mockConfigService.get.mockReturnValue(redirectUri);

        const result = service.microsoftRedirectUri;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'MICROSOFT_REDIRECT_URI',
            'http://localhost:4000/runway',
        );

        expect(result).toBe(redirectUri);
    });

    it('should return OpenAI API key', () => {
        mockConfigService.get.mockReturnValue(
            'test-openai-api-key',
        );

        const result = service.openAiApiKey;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'OPENAI_API_KEY',
            '',
        );

        expect(result).toBe('test-openai-api-key');
    });

    it('should return default application port when configuration is missing', () => {
        mockConfigService.get.mockReturnValue(5000);

        const result = service.appPort;

        expect(mockConfigService.get).toHaveBeenCalledWith(
            'APP_PORT',
            5000,
        );

        expect(result).toBe(5000);
    });
});