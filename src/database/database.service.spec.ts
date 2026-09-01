import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
    let service: DatabaseService;

    beforeEach(() => {
        service = new DatabaseService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should log MongoDB connection initialization message', () => {
        const logSpy = jest
            .spyOn((service as any).logger, 'log')
            .mockImplementation(() => undefined);

        service.logConnectionInfo();

        expect(logSpy).toHaveBeenCalledWith(
            'MongoDB connection module initialized',
        );

        logSpy.mockRestore();
    });
});