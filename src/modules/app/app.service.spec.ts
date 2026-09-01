import { AppService } from './app.service';

describe('AppService', () => {
    let service: AppService;

    beforeEach(() => {
        service = new AppService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return application health information', () => {
        const result = service.getHealth();

        expect(result).toEqual({
            app: 'Portfolio Tracker API',
            version: '1.0.0',
        });
    });

    it('should return the correct application name', () => {
        const result = service.getHealth();

        expect(result.app).toBe('Portfolio Tracker API');
    });

    it('should return the correct application version', () => {
        const result = service.getHealth();

        expect(result.version).toBe('1.0.0');
    });
});