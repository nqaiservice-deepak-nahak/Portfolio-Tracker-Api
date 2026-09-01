import { HttpStatus } from '@nestjs/common';
import { MutualFundsService } from './mutual-funds.service';
import { AbstractMutualFundsDao } from '../../database/mongodb/abstract/mutual-funds.abstract';
import { createResponse } from '../../shared/appresponse.shared';
import { Messages, messageFactory } from '../../shared/messages.shared';

describe('MutualFundsService', () => {
    let service: MutualFundsService;
    let mockDao: jest.Mocked<AbstractMutualFundsDao>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDao = {
            createFund: jest.fn(),
            listFunds: jest.fn(),
            findFund: jest.fn(),
            updateFund: jest.fn(),
            createSipEntry: jest.fn(),
            findSipEntry: jest.fn(),
            listSipEntries: jest.fn(),
        } as jest.Mocked<AbstractMutualFundsDao>;

        service = new MutualFundsService(mockDao);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create a mutual fund successfully', async () => {
        const userId = 'user-123';

        const createdFund = {
            _id: '507f1f77bcf86cd799439011',
            userId,
            fundName: 'Parag Parikh Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 0,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        mockDao.createFund.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S9, createdFund),
        );

        const result = await service.createFund(userId, {
            fundName: '  Parag Parikh Flexi Cap Fund  ',
            category: 'EQUITY',
            sipAmount: 5000,
            startDate: '2026-08-01',
            currentCagr: 12,
        } as any);

        expect(mockDao.createFund).toHaveBeenCalledWith({
            userId,
            fundName: 'Parag Parikh Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 0,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        });

        expect(result.code).toBe(HttpStatus.CREATED);
        expect(result.message).toBe(Messages.S9);
        expect(result.data.id).toBe('507f1f77bcf86cd799439011');
        expect(result.data.fundName).toBe('Parag Parikh Flexi Cap Fund');
        expect(result.data.category).toBe('EQUITY');
        expect(result.data.sipAmount).toBe(5000);
        expect(result.data.lumpSumAmount).toBe(0);
        expect(result.data.isActive).toBe(true);
    });

    it('should create a mutual fund with lump sum amount', async () => {
        const userId = 'user-123';

        const createdFund = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 3000,
            lumpSumAmount: 50000,
            startDate: new Date('2026-08-01'),
            currentCagr: 10,
            isActive: true,
            archivedAt: null,
        };

        mockDao.createFund.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S9, createdFund),
        );

        const result = await service.createFund(userId, {
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 3000,
            lumpSumAmount: 50000,
            startDate: '2026-08-01',
            currentCagr: 10,
        } as any);

        expect(mockDao.createFund).toHaveBeenCalledWith({
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 3000,
            lumpSumAmount: 50000,
            startDate: new Date('2026-08-01'),
            currentCagr: 10,
            isActive: true,
            archivedAt: null,
        });

        expect(result.code).toBe(HttpStatus.CREATED);
        expect(result.data.lumpSumAmount).toBe(50000);
    });

    it('should reject createFund when both sipAmount and lumpSumAmount are zero', async () => {
        const userId = 'user-123';

        const result = await service.createFund(userId, {
            fundName: 'Zero Amount Fund',
            category: 'EQUITY',
            sipAmount: 0,
            lumpSumAmount: 0,
            startDate: '2026-08-01',
            currentCagr: 12,
        } as any);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.BAD_REQUEST);
        expect(result.message).toBe(Messages.W21);

        expect(mockDao.createFund).not.toHaveBeenCalled();
    });

    it('should reject createFund when startDate is in the future', async () => {
        const userId = 'user-123';
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const result = await service.createFund(userId, {
            fundName: 'Future Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            startDate: futureDate.toISOString().split('T')[0],
            currentCagr: 12,
        } as any);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.BAD_REQUEST);
        expect(result.message).toBe(Messages.W22);

        expect(mockDao.createFund).not.toHaveBeenCalled();
    });

    it('should list only active funds belonging to the user', async () => {
        const userId = 'user-123';

        const funds = [
            {
                _id: '507f1f77bcf86cd799439011',
                userId,
                fundName: 'Parag Parikh Flexi Cap Fund',
                category: 'EQUITY',
                sipAmount: 5000,
                lumpSumAmount: 10000,
                startDate: new Date('2026-08-01'),
                currentCagr: 12,
                isActive: true,
                archivedAt: null,
            },
        ];

        mockDao.listFunds.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S10, funds),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, []),
        );

        const result = await service.listFunds(userId);

        expect(mockDao.listFunds).toHaveBeenCalledWith(userId, false);

        expect(mockDao.listSipEntries).toHaveBeenCalledWith(userId, [
            '507f1f77bcf86cd799439011',
        ]);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S10);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].fundName).toBe('Parag Parikh Flexi Cap Fund');
        expect(result.data[0].isActive).toBe(true);
    });

    it('should include archived funds when includeArchived is true', async () => {
        const userId = 'user-123';

        const funds = [
            {
                _id: '507f1f77bcf86cd799439011',
                userId,
                fundName: 'Archived Fund',
                category: 'EQUITY',
                sipAmount: 2000,
                lumpSumAmount: 10000,
                startDate: new Date('2026-08-01'),
                currentCagr: 10,
                isActive: false,
                archivedAt: new Date('2026-08-20'),
            },
        ];

        mockDao.listFunds.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S10, funds),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, []),
        );

        const result = await service.listFunds(userId, true);

        expect(mockDao.listFunds).toHaveBeenCalledWith(userId, true);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].fundName).toBe('Archived Fund');
        expect(result.data[0].isActive).toBe(false);
    });

    it('should get a mutual fund by id with its SIP entries', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'Parag Parikh Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        const sipEntries = [
            {
                _id: 'sip-1',
                userId,
                fundId,
                month: '2026-08',
                amountContributed: 5000,
                notes: 'August SIP',
            },
        ];

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, sipEntries),
        );

        const result = await service.getFundById(userId, fundId);

        expect(mockDao.findFund).toHaveBeenCalledWith(userId, fundId);

        expect(mockDao.listSipEntries).toHaveBeenCalledWith(userId, fundId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S11);
        expect(result.data.id).toBe(fundId);
        expect(result.data.fundName).toBe('Parag Parikh Flexi Cap Fund');
        expect(result.data.totalSipInvested).toBe(5000);
        expect(result.data.totalInvested).toBe(15000);
    });

    it('should reject when fund id is invalid', async () => {
        const userId = 'user-123';
        const invalidFundId = 'invalid-fund-id';

        const result = await service.getFundById(userId, invalidFundId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.NOT_FOUND);
        expect(result.message).toBe(messageFactory(Messages.W5, ['Mutual fund']));

        expect(mockDao.findFund).not.toHaveBeenCalled();
        expect(mockDao.listSipEntries).not.toHaveBeenCalled();
    });

    it('should reject when mutual fund does not exist for the user', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['Mutual fund']), null),
        );

        const result = await service.getFundById(userId, fundId);

        expect(mockDao.findFund).toHaveBeenCalledWith(userId, fundId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.NOT_FOUND);
        expect(result.message).toBe(messageFactory(Messages.W5, ['Mutual fund']));

        expect(mockDao.listSipEntries).not.toHaveBeenCalled();
    });

    it('should update all mutual fund fields successfully', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const existingFund = {
            _id: fundId,
            userId,
            fundName: 'Old Fund',
            category: 'EQUITY',
            sipAmount: 3000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 10,
            isActive: true,
            archivedAt: null,
        };

        const updatedFund = {
            ...existingFund,
            fundName: 'New Fund',
            category: 'DEBT',
            sipAmount: 5000,
            lumpSumAmount: 25000,
            startDate: new Date('2026-08-10'),
            currentCagr: 12,
            isActive: false,
            archivedAt: new Date(),
        };

        mockDao.findFund
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S3, existingFund));

        mockDao.updateFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S12, updatedFund),
        );

        mockDao.findFund
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S3, updatedFund));

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, []),
        );

        await service.updateFund(userId, fundId, {
            fundName: ' New Fund ',
            category: 'DEBT',
            sipAmount: 5000,
            lumpSumAmount: 25000,
            startDate: '2026-08-10',
            currentCagr: 12,
            isActive: false,
        } as any);

        expect(mockDao.updateFund).toHaveBeenCalledWith(
            userId,
            fundId,
            expect.objectContaining({
                fundName: 'New Fund',
                category: 'DEBT',
                sipAmount: 5000,
                lumpSumAmount: 25000,
                startDate: new Date('2026-08-10'),
                currentCagr: 12,
                isActive: false,
                archivedAt: expect.any(Date),
            }),
        );
    });

    it('should reject updateFund when final sipAmount and lumpSumAmount are both zero', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const existingFund = {
            _id: fundId,
            userId,
            fundName: 'Existing Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 10,
            isActive: true,
            archivedAt: null,
        };

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, existingFund),
        );

        const result = await service.updateFund(userId, fundId, {
            sipAmount: 0,
            lumpSumAmount: 0,
        } as any);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.BAD_REQUEST);
        expect(result.message).toBe(Messages.W21);

        expect(mockDao.updateFund).not.toHaveBeenCalled();
    });

    it('should reject updateFund when startDate is in the future', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const existingFund = {
            _id: fundId,
            userId,
            fundName: 'Existing Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 10,
            isActive: true,
            archivedAt: null,
        };

        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, existingFund),
        );

        const result = await service.updateFund(userId, fundId, {
            startDate: futureDate.toISOString().split('T')[0],
        } as any);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.BAD_REQUEST);
        expect(result.message).toBe(Messages.W22);

        expect(mockDao.updateFund).not.toHaveBeenCalled();
    });

    it('should restore an archived mutual fund successfully', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const archivedFund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: false,
            archivedAt: new Date('2026-08-20'),
        };

        const restoredFund = {
            ...archivedFund,
            isActive: true,
            archivedAt: null,
        };

        mockDao.findFund
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S3, archivedFund));

        mockDao.updateFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S12, restoredFund),
        );

        mockDao.findFund
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S3, restoredFund));

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, []),
        );

        const result = await service.updateFund(userId, fundId, {
            isActive: true,
        } as any);

        expect(mockDao.updateFund).toHaveBeenCalledWith(
            userId,
            fundId,
            {
                isActive: true,
                archivedAt: null,
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data.isActive).toBe(true);
    });

    it('should archive a mutual fund successfully', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );

        mockDao.updateFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S13, { isActive: false }),
        );

        const result = await service.archiveFund(userId, fundId);

        expect(mockDao.updateFund).toHaveBeenCalledWith(
            userId,
            fundId,
            {
                isActive: false,
                archivedAt: expect.any(Date),
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S13);
        expect(result.data).toEqual({
            archived: true,
        });
    });

    it('should reject archiving a mutual fund that does not exist', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['Mutual fund']), null),
        );

        const result = await service.archiveFund(userId, fundId);

        expect(mockDao.findFund).toHaveBeenCalledWith(userId, fundId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.NOT_FOUND);
        expect(result.message).toBe(messageFactory(Messages.W5, ['Mutual fund']));

        expect(mockDao.updateFund).not.toHaveBeenCalled();
    });

    it('should create a SIP entry successfully', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        const createdSip = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            fundId,
            month: '2026-08',
            amountContributed: 5000,
            notes: 'August SIP',
        };

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );
        mockDao.findSipEntry.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['SIP entry']), null),
        );
        mockDao.createSipEntry.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S14, createdSip),
        );

        const result = await service.createSipEntry(
            userId,
            fundId,
            {
                month: '2026-08',
                amountContributed: 5000,
                notes: '  August SIP  ',
            } as any,
        );

        expect(mockDao.findFund).toHaveBeenCalledWith(userId, fundId);

        expect(mockDao.findSipEntry).toHaveBeenCalledWith(
            userId,
            fundId,
            '2026-08',
        );

        expect(mockDao.createSipEntry).toHaveBeenCalledWith({
            userId,
            fundId,
            month: '2026-08',
            amountContributed: 5000,
            notes: 'August SIP',
        });

        expect(result.code).toBe(HttpStatus.CREATED);
        expect(result.message).toBe(Messages.S14);
        expect(result.data).toEqual(createdSip);
    });

    it('should reject duplicate SIP entry for the same fund and month', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        const existingEntry = {
            _id: 'sip-1',
            userId,
            fundId,
            month: '2026-08',
            amountContributed: 5000,
            notes: 'Already added',
        };

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );
        mockDao.findSipEntry.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, existingEntry),
        );

        const result = await service.createSipEntry(
            userId,
            fundId,
            {
                month: '2026-08',
                amountContributed: 5000,
                notes: 'Duplicate SIP',
            } as any,
        );

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.CONFLICT);
        expect(result.message).toBe(Messages.W23);

        expect(mockDao.createSipEntry).not.toHaveBeenCalled();
    });

    it('should create a SIP entry with empty notes when notes are not provided', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        const createdSip = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            fundId,
            month: '2026-08',
            amountContributed: 5000,
            notes: '',
        };

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );
        mockDao.findSipEntry.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['SIP entry']), null),
        );
        mockDao.createSipEntry.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S14, createdSip),
        );

        const result = await service.createSipEntry(
            userId,
            fundId,
            {
                month: '2026-08',
                amountContributed: 5000,
            } as any,
        );

        expect(mockDao.createSipEntry).toHaveBeenCalledWith({
            userId,
            fundId,
            month: '2026-08',
            amountContributed: 5000,
            notes: '',
        });

        expect(result.code).toBe(HttpStatus.CREATED);
        expect(result.data).toEqual(createdSip);
    });

    it('should list SIP entries for a mutual fund', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        const sipEntries = [
            {
                _id: 'sip-1',
                userId,
                fundId,
                month: '2026-07',
                amountContributed: 5000,
                notes: 'July SIP',
            },
            {
                _id: 'sip-2',
                userId,
                fundId,
                month: '2026-08',
                amountContributed: 5000,
                notes: 'August SIP',
            },
        ];

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, sipEntries),
        );

        const result = await service.listSipEntries(userId, fundId);

        expect(mockDao.findFund).toHaveBeenCalledWith(userId, fundId);

        expect(mockDao.listSipEntries).toHaveBeenCalledWith(userId, fundId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S15);
        expect(result.data).toEqual(sipEntries);
        expect(result.data).toHaveLength(2);
    });

    it('should reject listing SIP entries when the fund does not exist', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['Mutual fund']), null),
        );

        const result = await service.listSipEntries(userId, fundId);

        expect(mockDao.findFund).toHaveBeenCalledWith(userId, fundId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.NOT_FOUND);
        expect(result.message).toBe(messageFactory(Messages.W5, ['Mutual fund']));

        expect(mockDao.listSipEntries).not.toHaveBeenCalled();
    });

    it('should return all projection horizons for a mutual fund', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-01-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        const sipEntries = [
            {
                _id: 'sip-1',
                userId,
                fundId,
                month: '2026-07',
                amountContributed: 5000,
                notes: 'July SIP',
            },
        ];

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, sipEntries),
        );

        const result = await service.getProjection(userId, fundId);

        expect(mockDao.findFund).toHaveBeenCalledWith(userId, fundId);

        expect(mockDao.listSipEntries).toHaveBeenCalledWith(userId, fundId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.message).toBe(Messages.S16);
        expect(result.data).toHaveLength(5);

        expect(result.data.map((item: any) => item.horizon)).toEqual([
            'Current',
            '1 Year',
            '3 Years',
            '5 Years',
            '10 Years',
        ]);

        expect(result.data.map((item: any) => item.months)).toEqual([
            0,
            12,
            36,
            60,
            120,
        ]);

        result.data.forEach((item: any) => {
            expect(item).toHaveProperty('totalInvested');
            expect(item).toHaveProperty('projectedValue');
            expect(item).toHaveProperty('estimatedGain');
            expect(item).toHaveProperty('gainPercentage');
            expect(item).toHaveProperty('displayTotalInvested');
            expect(item).toHaveProperty('displayProjectedValue');
            expect(item).toHaveProperty('displayEstimatedGain');
        });
    });

    it('should reject getting projection when the fund does not exist', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['Mutual fund']), null),
        );

        const result = await service.getProjection(userId, fundId);

        expect(mockDao.findFund).toHaveBeenCalledWith(userId, fundId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.code).toBe(HttpStatus.NOT_FOUND);
        expect(result.message).toBe(messageFactory(Messages.W5, ['Mutual fund']));

        expect(mockDao.listSipEntries).not.toHaveBeenCalled();
    });

    it('should return zero future SIP value when months are zero', () => {
        const result = (service as any).calculateFutureSipValue(
            5000,
            0.01,
            0,
        );

        expect(result).toBe(0);
    });

    it('should return zero future SIP value when monthly SIP is zero', () => {
        const result = (service as any).calculateFutureSipValue(
            0,
            0.01,
            12,
        );

        expect(result).toBe(0);
    });

    it('should calculate future SIP value without growth when monthly rate is zero', () => {
        const result = (service as any).calculateFutureSipValue(
            5000,
            0,
            12,
        );

        expect(result).toBe(60000);
    });

    it('should calculate future SIP value without growth when monthly rate is negative', () => {
        const result = (service as any).calculateFutureSipValue(
            5000,
            -0.01,
            12,
        );

        expect(result).toBe(60000);
    });

    it('should calculate future SIP value with a positive monthly rate', () => {
        const result = (service as any).calculateFutureSipValue(
            5000,
            0.01,
            12,
        );

        const expected =
            5000 *
            (((1 + 0.01) ** 12 - 1) / 0.01) *
            (1 + 0.01);

        expect(result).toBeCloseTo(expected, 2);
    });

    it('should return zero when compound amount is zero', () => {
        const result = (service as any).compoundAmount(
            0,
            0.01,
            12,
        );

        expect(result).toBe(0);
    });

    it('should return zero when compound amount is negative', () => {
        const result = (service as any).compoundAmount(
            -5000,
            0.01,
            12,
        );

        expect(result).toBe(0);
    });

    it('should return original amount when monthly rate is zero', () => {
        const result = (service as any).compoundAmount(
            10000,
            0,
            12,
        );

        expect(result).toBe(10000);
    });

    it('should return original amount when months are zero', () => {
        const result = (service as any).compoundAmount(
            10000,
            0.01,
            0,
        );

        expect(result).toBe(10000);
    });

    it('should calculate compound amount with positive rate and months', () => {
        const result = (service as any).compoundAmount(
            10000,
            0.01,
            12,
        );

        const expected = 10000 * (1 + 0.01) ** 12;

        expect(result).toBeCloseTo(expected, 2);
    });

    it('should calculate the number of months between two dates', () => {
        const startDate = new Date('2025-01-15');
        const endDate = new Date('2026-08-20');

        const result = (service as any).getMonthsBetween(
            startDate,
            endDate,
        );

        expect(result).toBe(19);
    });

    it('should return zero when the end date is before the start date', () => {
        const startDate = new Date('2026-08-20');
        const endDate = new Date('2025-01-15');

        const result = (service as any).getMonthsBetween(
            startDate,
            endDate,
        );

        expect(result).toBe(0);
    });

    it('should convert a month string to the first day of that month', () => {
        const result = (service as any).getDateFromMonth('2026-08');

        expect(result).toEqual(new Date(2026, 7, 1));
    });

    it('should format currency values in Indian Rupee format', () => {
        const result = (service as any).formatCurrency(123456.78);

        expect(result).toBe('₹1,23,457');
    });

    it('should format zero as Indian Rupee currency', () => {
        const result = (service as any).formatCurrency(0);

        expect(result).toBe('₹0');
    });

    it('should include future SIP investments in projections', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-01-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, []),
        );

        const result = await service.getProjection(userId, fundId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toHaveLength(5);

        expect(result.data[0].months).toBe(0);

        expect(result.data[1].months).toBe(12);
        expect(result.data[1].totalInvested).toBe(10000 + 5000 * 12);

        expect(result.data[2].months).toBe(36);
        expect(result.data[2].totalInvested).toBe(10000 + 5000 * 36);

        expect(result.data[3].months).toBe(60);
        expect(result.data[3].totalInvested).toBe(10000 + 5000 * 60);

        expect(result.data[4].months).toBe(120);
        expect(result.data[4].totalInvested).toBe(10000 + 5000 * 120);
    });

    it('should not add future SIP investment when SIP amount is zero', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 0,
            lumpSumAmount: 10000,
            startDate: new Date('2026-01-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, []),
        );

        const result = await service.getProjection(userId, fundId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toHaveLength(5);

        expect(result.data[1].totalInvested).toBe(10000);
        expect(result.data[2].totalInvested).toBe(10000);
        expect(result.data[3].totalInvested).toBe(10000);
        expect(result.data[4].totalInvested).toBe(10000);
    });

    it('should return zero gain percentage when total invested is zero', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'Zero Investment Fund',
            category: 'EQUITY',
            sipAmount: 0,
            lumpSumAmount: 0,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, []),
        );

        const result = await service.getFundById(userId, fundId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data.totalSipInvested).toBe(0);
        expect(result.data.totalInvested).toBe(0);
        expect(result.data.gainPercentage).toBe(0);
    });

    it('should return zero gain percentage for projections with no investment', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'Zero Investment Fund',
            category: 'EQUITY',
            sipAmount: 0,
            lumpSumAmount: 0,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        mockDao.findFund.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, fund),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, []),
        );

        const result = await service.getProjection(userId, fundId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toHaveLength(5);

        result.data.forEach((projection: any) => {
            expect(projection.totalInvested).toBe(0);
            expect(projection.projectedValue).toBe(0);
            expect(projection.estimatedGain).toBe(0);
            expect(projection.gainPercentage).toBe(0);
        });
    });

    it('should attach matching SIP entries to each fund', async () => {
        const userId = 'user-123';
        const fundId = '507f1f77bcf86cd799439011';

        const fund = {
            _id: fundId,
            userId,
            fundName: 'HDFC Flexi Cap Fund',
            category: 'EQUITY',
            sipAmount: 5000,
            lumpSumAmount: 10000,
            startDate: new Date('2026-08-01'),
            currentCagr: 12,
            isActive: true,
            archivedAt: null,
        };

        const sipEntries = [
            {
                _id: 'sip-1',
                userId,
                fundId,
                month: '2026-08',
                amountContributed: 5000,
                notes: 'August SIP',
            },
        ];

        mockDao.listFunds.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S10, [fund]),
        );

        mockDao.listSipEntries.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S15, sipEntries),
        );

        const result = await service.listFunds(userId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toHaveLength(1);

        expect(result.data[0].totalSipInvested).toBe(5000);
        expect(result.data[0].totalInvested).toBe(15000);
    });

});
