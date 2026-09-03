import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { TradesService } from './trades.service';
import { TradeStatus } from '../../database/schemas/trade.schema';
import { AbstractTradesDao } from '../../database/mongodb/abstract/trades.abstract';
import { createResponse } from '../../shared/appresponse.shared';
import { Messages, messageFactory } from '../../shared/messages.shared';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { AbstractBuyLotsDao } from '../../database/mongodb/abstract/buy-lots.abstract';

describe('TradesService', () => {
    let service: TradesService;
    let tradesDao: jest.Mocked<AbstractTradesDao>;
    let buyLotsDao: jest.Mocked<AbstractBuyLotsDao>;

    const mockTradesDao = {
        createTrade: jest.fn(),
        listTrades: jest.fn(),
        findTrade: jest.fn(),
        findActiveTradeBySymbol: jest.fn(),
        updateTrade: jest.fn(),
        createSell: jest.fn(),
        listSells: jest.fn(),
        listSellsForTrades: jest.fn(),
        updateTradeStatusAndPrice: jest.fn(),
    };

    const mockBuyLotsDao = {
        createBuyLot: jest.fn().mockResolvedValue(createResponse(HttpStatus.CREATED, Messages.S2, { _id: 'mockLotId' })),
        listBuyLotsForTrade: jest.fn().mockResolvedValue(createResponse(HttpStatus.OK, Messages.S2, [])),
        listBuyLotsForTrades: jest.fn().mockResolvedValue(createResponse(HttpStatus.OK, Messages.S2, [])),
        updateBuyLot: jest.fn().mockResolvedValue(createResponse(HttpStatus.OK, Messages.S2)),
    };

    beforeEach(async () => {
        jest.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TradesService,
                {
                    provide: AbstractTradesDao,
                    useValue: mockTradesDao,
                },
                {
                    provide: AbstractBuyLotsDao,
                    useValue: mockBuyLotsDao,
                },
            ],
        }).compile();

        service = module.get<TradesService>(TradesService);
        tradesDao = module.get(AbstractTradesDao);
        buyLotsDao = module.get(AbstractBuyLotsDao);

        // Default mock behaviors
        mockTradesDao.findActiveTradeBySymbol.mockResolvedValue(createResponse(HttpStatus.NOT_FOUND, Messages.W5));
        mockTradesDao.listSells.mockResolvedValue(createResponse(HttpStatus.OK, Messages.S23, []));
        mockTradesDao.listSellsForTrades.mockResolvedValue(createResponse(HttpStatus.OK, Messages.S23, []));
        mockTradesDao.updateTrade.mockResolvedValue(createResponse(HttpStatus.OK, Messages.S20, {}));
        mockBuyLotsDao.createBuyLot.mockResolvedValue(createResponse(HttpStatus.CREATED, Messages.S2, { _id: '507f1f77bcf86cd799439099' }));
        mockBuyLotsDao.listBuyLotsForTrade.mockResolvedValue(createResponse(HttpStatus.OK, Messages.S2, []));
        mockBuyLotsDao.listBuyLotsForTrades.mockResolvedValue(createResponse(HttpStatus.OK, Messages.S2, []));
    });

    // it('should create a trade successfully', async () => {
    //     const userId = 'user-123';

    //     const createTradeDto = {
    //         stockSymbol: '  reliance ',
    //         companyName: '  Reliance Industries ',
    //         buyDate: '2026-08-20',
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '  Long term investment  ',
    //     };

    //     const fakeTrade = {
    //         _id: 'trade-123',
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: 'Long term investment',
    //         status: TradeStatus.OPEN,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     mockTradesDao.createTrade.mockResolvedValue(
    //         createResponse(HttpStatus.CREATED, Messages.S17, fakeTrade),
    //     );

    //     const result = await service.createTrade(userId, createTradeDto);

    //     expect(mockTradesDao.createTrade).toHaveBeenCalledWith({
    //         userId: 'user-123',
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: 'Long term investment',
    //         status: TradeStatus.OPEN,
    //         isActive: true,
    //         archivedAt: null,
    //     });

    //     expect(result.code).toBe(HttpStatus.CREATED);

    //     const data = result.data;
    //     expect(data.stockSymbol).toBe('RELIANCE');
    //     expect(data.companyName).toBe('Reliance Industries');
    //     expect(data.quantity).toBe(10);
    //     expect(data.soldQuantity).toBe(0);
    //     expect(data.remainingQuantity).toBe(10);

    //     expect(data.grossBuyValue).toBe(1000);
    //     expect(data.totalBuyCost).toBe(993);
    //     expect(data.averageBuyCost).toBe(99.3);

    //     expect(data.unrealizedProfitLoss).toBe(207);
    //     expect(data.realizedProfitLoss).toBe(0);
    //     expect(data.totalProfitLoss).toBe(207);

    //     expect(data.status).toBe(TradeStatus.OPEN);
    //     expect(data.isActive).toBe(true);
    // });

    it('should create a trade successfully', async () => {
        const userId = 'user-123';

        const createTradeDto = {
            stockSymbol: '  reliance ',
            companyName: '  Reliance Industries ',
            buyDate: '2026-08-20',
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 99999,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '  Long term investment  ',
        };

        const expectedCharges = (() => {
            const turnover = 100 * 10;
            const stt = turnover * 0.001;
            const etc = turnover * 0.0000297;
            const sebi = turnover * 0.000001;
            const stamp = turnover * 0.00015;
            const gst = (5 + etc + sebi) * 0.18;
            return Number((stt + etc + sebi + stamp + gst).toFixed(2));
        })();

        const totalBuyCost = 100 * 10 + 5 + expectedCharges;
        const averageBuyCost = totalBuyCost / 10;

        const fakeTrade = {
            _id: '507f1f77bcf86cd799439011',
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,

            brokerage: 5,
            charges: expectedCharges,

            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: 'Long term investment',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.createTrade.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S17, fakeTrade),
        );
        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );
        // Mock the BuyLot returned after creation so FIFO computes correctly
        const fakeLot = {
            _id: '507f1f77bcf86cd799439099',
            tradeId: '507f1f77bcf86cd799439011',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            originalQuantity: 10,
            brokerage: 5,
            charges: expectedCharges,
        };
        mockBuyLotsDao.listBuyLotsForTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S2, [fakeLot]),
        );

        const result = await service.createTrade(userId, createTradeDto);

        expect(mockTradesDao.createTrade).toHaveBeenCalledWith({
            userId: 'user-123',
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,

            brokerage: 0,
            charges: 0,

            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: 'Long term investment',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        });

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data.stockSymbol).toBe('RELIANCE');
        expect(data.companyName).toBe('Reliance Industries');
        expect(data.quantity).toBe(10);

        expect(data.soldQuantity).toBe(0);
        expect(data.remainingQuantity).toBe(10);

        expect(data.grossBuyValue).toBe(1000);
        expect(data.totalBuyCost).toBeCloseTo(totalBuyCost, 2);
        expect(data.averageBuyCost).toBeCloseTo(averageBuyCost, 2);

        const unrealized = (120 - averageBuyCost) * 10;
        expect(data.unrealizedProfitLoss).toBeCloseTo(unrealized, 2);

        expect(data.realizedProfitLoss).toBe(0);
        expect(data.totalProfitLoss).toBeCloseTo(unrealized, 2);

        expect(data.status).toBe(TradeStatus.OPEN);
        expect(data.isActive).toBe(true);
    });
    it('should throw NotFoundException when user tries to access another user trade', async () => {
        const userA = 'user-a';
        const tradeId = '507f1f77bcf86cd799439011';

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['Trade']), null),
        );

        const result = await service.getTradeById(userA, tradeId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Trade not found.');

        expect(mockTradesDao.findTrade).toHaveBeenCalledWith(userA, tradeId);
    });

    it('should throw NotFoundException for an invalid trade ID', async () => {
        const userId = 'user-a';
        const invalidTradeId = 'invalid-id';

        const result = await service.getTradeById(userId, invalidTradeId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Trade not found.');

        expect(mockTradesDao.findTrade).not.toHaveBeenCalled();
    });

    it('should use default values when optional trade fields are not provided', async () => {
        const userId = 'user-123';

        const createTradeDto = {
            stockSymbol: 'TCS',
            companyName: 'Tata Consultancy Services',
            buyDate: '2026-08-20',
            buyPrice: 100,
            quantity: 10,
        };

        const expectedCharges = (() => {
            const turnover = 100 * 10;
            const stt = turnover * 0.001;
            const etc = turnover * 0.0000297;
            const sebi = turnover * 0.000001;
            const stamp = turnover * 0.00015;
            const gst = (0 + etc + sebi) * 0.18;
            return Number((stt + etc + sebi + stamp + gst).toFixed(2));
        })();

        const fakeTrade = {
            _id: '507f1f77bcf86cd799439011',
            userId,
            stockSymbol: 'TCS',
            companyName: 'Tata Consultancy Services',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 0,
            charges: expectedCharges,
            currentPrice: 100,
            targetPrice: 0,
            stopLoss: 0,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.createTrade.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S17, fakeTrade),
        );
        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );
        const fakeLot2 = {
            _id: 'lot-456',
            tradeId: '507f1f77bcf86cd799439011',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            originalQuantity: 10,
            brokerage: 0,
            charges: expectedCharges,
        };
        mockBuyLotsDao.listBuyLotsForTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S2, [fakeLot2]),
        );

        const result = await service.createTrade(userId, createTradeDto);

        expect(mockTradesDao.createTrade).toHaveBeenCalledWith({
            userId,
            stockSymbol: 'TCS',
            companyName: 'Tata Consultancy Services',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 0,
            charges: 0,
            currentPrice: 100,
            targetPrice: 0,
            stopLoss: 0,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        });

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.currentPrice).toBe(100);
        expect(data.targetPrice).toBe(0);
        expect(data.stopLoss).toBe(0);
        expect(data.notes).toBe('');
    });

    it('should partially sell a trade successfully', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const sellBrokerage = 2;

        const expectedSellCharges = (() => {
            const turnover = 120 * 4;
            const stt = turnover * 0.001;
            const etc = turnover * 0.0000297;
            const sebi = turnover * 0.000001;
            const stamp = 0;
            const gst = (sellBrokerage + etc + sebi) * 0.18;
            return Number((stt + etc + sebi + stamp + gst).toFixed(2));
        })();

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 100,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const fakeSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-25'),
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: expectedSellCharges,
            notes: '',
        };

        const updatedFakeTrade = {
            ...fakeTrade,
            status: TradeStatus.PARTIALLY_SOLD,
            currentPrice: 120,
        };

        mockTradesDao.findTrade
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, fakeTrade))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade));

        mockTradesDao.listSells
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, []))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [fakeSell]));

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-25',
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: 99999,
            notes: '',
        });

        expect(mockTradesDao.createSell).toHaveBeenCalledWith({
            userId,
            tradeId,
            sellDate: new Date('2026-08-25'),
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: expectedSellCharges,
            notes: '',
        });

        expect(mockTradesDao.updateTradeStatusAndPrice).toHaveBeenCalledWith(
            userId,
            tradeId,
            TradeStatus.PARTIALLY_SOLD,
            120,
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.quantity).toBe(10);
        expect(data.soldQuantity).toBe(4);
        expect(data.remainingQuantity).toBe(6);
        expect(data.status).toBe(TradeStatus.PARTIALLY_SOLD);
        expect(data.isActive).toBe(true);
    });

    it('should reject selling more than the remaining quantity', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const existingSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-25'),
            quantity: 4,
            sellPrice: 120,
            brokerage: 2,
            charges: 3,
            notes: '',
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, [existingSell]),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 7,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe(
            'Sell quantity cannot be greater than remaining quantity 6.',
        );

        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    it('should close the trade when the remaining quantity is fully sold', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const sellBrokerage = 2;
        const expectedSellCharges = (() => {
            const turnover = 130 * 6;
            const stt = turnover * 0.001;
            const etc = turnover * 0.0000297;
            const sebi = turnover * 0.000001;
            const gst = (sellBrokerage + etc + sebi) * 0.18;
            return Number((stt + etc + sebi + gst).toFixed(2));
        })();

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const existingSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-25'),
            quantity: 4,
            sellPrice: 120,
            brokerage: 2,
            charges: 3,
            notes: '',
        };

        const newSell = {
            _id: '507f1f77bcf86cd799439013',
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 6,
            sellPrice: 130,
            brokerage: sellBrokerage,
            charges: expectedSellCharges,
            notes: '',
        };

        const updatedFakeTrade = {
            ...fakeTrade,
            status: TradeStatus.CLOSED,
            currentPrice: 130,
        };

        mockTradesDao.findTrade
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, fakeTrade))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade));

        mockTradesDao.listSells
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [existingSell]))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [existingSell, newSell]));

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, newSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 6,
            sellPrice: 130,
            brokerage: sellBrokerage,
            charges: 99999,
            notes: '',
        });

        expect(mockTradesDao.createSell).toHaveBeenCalledWith({
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 6,
            sellPrice: 130,
            brokerage: sellBrokerage,
            charges: expectedSellCharges,
            notes: '',
        });

        expect(mockTradesDao.updateTradeStatusAndPrice).toHaveBeenCalledWith(
            userId,
            tradeId,
            TradeStatus.CLOSED,
            130,
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.quantity).toBe(10);
        expect(data.soldQuantity).toBe(10);
        expect(data.remainingQuantity).toBe(0);
        expect(data.status).toBe(TradeStatus.CLOSED);
        expect(data.isActive).toBe(true);
    });

    it('should reject selling an archived trade', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const archivedTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.ARCHIVED,
            isActive: true,
            archivedAt: new Date('2026-08-25'),
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, archivedTrade),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 5,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Archived trade cannot be sold.');

        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    it('should reject selling a closed trade', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const closedTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 130,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.CLOSED,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, closedTrade),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 1,
            sellPrice: 140,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Closed trade cannot be sold again.');

        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    it('should allow selling a trade with empty notes', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const sellBrokerage = 2;
        const expectedSellCharges = (() => {
            const turnover = 120 * 4;
            const stt = turnover * 0.001;
            const etc = turnover * 0.0000297;
            const sebi = turnover * 0.000001;
            const gst = (sellBrokerage + etc + sebi) * 0.18;
            return Number((stt + etc + sebi + gst).toFixed(2));
        })();

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 100,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const fakeSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: expectedSellCharges,
            notes: '',
        };

        const updatedFakeTrade = {
            ...fakeTrade,
            status: TradeStatus.PARTIALLY_SOLD,
            currentPrice: 120,
        };

        mockTradesDao.findTrade
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, fakeTrade))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade));

        mockTradesDao.listSells
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, []))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [fakeSell]));

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: 99999,
            notes: '',
        });

        expect(mockTradesDao.createSell).toHaveBeenCalledWith({
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: expectedSellCharges,
            notes: '',
        });

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.soldQuantity).toBe(4);
        expect(data.remainingQuantity).toBe(6);
        expect(data.status).toBe(TradeStatus.PARTIALLY_SOLD);
    });

    // it('should calculate realized profit correctly after a partial sell', async () => {
    //     const userId = 'user-123';
    //     const tradeId = '507f1f77bcf86cd799439011';

    //     const fakeTrade = {
    //         _id: tradeId,
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.OPEN,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const fakeSell = {
    //         _id: '507f1f77bcf86cd799439012',
    //         userId,
    //         tradeId,
    //         sellDate: new Date('2026-08-26'),
    //         quantity: 4,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     };

    //     const updatedFakeTrade = {
    //         ...fakeTrade,
    //         status: TradeStatus.PARTIALLY_SOLD,
    //         currentPrice: 120,
    //     };

    //     mockTradesDao.findTrade.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
    //     );

    //     mockTradesDao.listSells
    //         .mockResolvedValueOnce(
    //             createResponse(HttpStatus.OK, Messages.S23, []),
    //         )
    //         .mockResolvedValueOnce(
    //             createResponse(HttpStatus.OK, Messages.S23, [fakeSell]),
    //         );

    //     mockTradesDao.createSell.mockResolvedValue(
    //         createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
    //     );

    //     mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S20, null),
    //     );

    //     mockTradesDao.findTrade.mockResolvedValueOnce(
    //         createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade),
    //     );

    //     const result = await service.createSell(userId, tradeId, {
    //         sellDate: '2026-08-26',
    //         quantity: 4,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     });

    //     expect(result.code).toBe(HttpStatus.OK);
    //     const data = result.data;
    //     expect(data.soldQuantity).toBe(4);
    //     expect(data.remainingQuantity).toBe(6);

    //     expect(data.realizedProfitLoss).toBeCloseTo(77.8, 2);
    // });

    it('should calculate realized profit correctly after a partial sell', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const tradeBrokerage = 5;
        const tradeCharges = 2;

        const sellBrokerage = 2;
        const sellCharges = 3;

        const averageBuyCost = (100 * 10 + tradeBrokerage + tradeCharges) / 10;

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: tradeBrokerage,
            charges: tradeCharges,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const fakeSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: sellCharges,
            notes: '',
        };

        const updatedFakeTrade = {
            ...fakeTrade,
            status: TradeStatus.PARTIALLY_SOLD,
            currentPrice: 120,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, []),
            )
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, [fakeSell]),
            );

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: 99999,
            notes: '',
        });

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data.soldQuantity).toBe(4);
        expect(data.remainingQuantity).toBe(6);

        const expectedRealized = (120 * 4 - sellBrokerage - sellCharges) - (4 * averageBuyCost);
        expect(data.realizedProfitLoss).toBeCloseTo(expectedRealized, 2);
    });

    // it('should calculate unrealized profit correctly for the remaining quantity after a partial sell', async () => {
    //     const userId = 'user-123';
    //     const tradeId = '507f1f77bcf86cd799439011';

    //     const fakeTrade = {
    //         _id: tradeId,
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.OPEN,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const fakeSell = {
    //         _id: '507f1f77bcf86cd799439012',
    //         userId,
    //         tradeId,
    //         sellDate: new Date('2026-08-26'),
    //         quantity: 4,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     };

    //     const updatedFakeTrade = {
    //         ...fakeTrade,
    //         status: TradeStatus.PARTIALLY_SOLD,
    //         currentPrice: 120,
    //     };

    //     mockTradesDao.findTrade.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
    //     );

    //     mockTradesDao.listSells
    //         .mockResolvedValueOnce(
    //             createResponse(HttpStatus.OK, Messages.S23, []),
    //         )
    //         .mockResolvedValueOnce(
    //             createResponse(HttpStatus.OK, Messages.S23, [fakeSell]),
    //         );

    //     mockTradesDao.createSell.mockResolvedValue(
    //         createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
    //     );

    //     mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S20, null),
    //     );

    //     mockTradesDao.findTrade.mockResolvedValueOnce(
    //         createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade),
    //     );

    //     const result = await service.createSell(userId, tradeId, {
    //         sellDate: '2026-08-26',
    //         quantity: 4,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     });

    //     expect(result.code).toBe(HttpStatus.OK);
    //     const data = result.data;
    //     expect(data.soldQuantity).toBe(4);
    //     expect(data.remainingQuantity).toBe(6);

    //     expect(data.realizedProfitLoss).toBeCloseTo(77.8, 2);
    //     expect(data.unrealizedProfitLoss).toBeCloseTo(124.2, 2);
    //     expect(data.totalProfitLoss).toBeCloseTo(202, 2);
    // });

    it('should calculate unrealized profit correctly for the remaining quantity after a partial sell', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const tradeBrokerage = 5;
        const tradeCharges = 2;

        const sellBrokerage = 2;
        const sellCharges = 3;

        const averageBuyCost = (100 * 10 + tradeBrokerage + tradeCharges) / 10;
        const totalBuyCost = 100 * 10 + tradeBrokerage + tradeCharges;

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: tradeBrokerage,
            charges: tradeCharges,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const fakeSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: sellCharges,
            notes: '',
        };

        const updatedFakeTrade = {
            ...fakeTrade,
            status: TradeStatus.PARTIALLY_SOLD,
            currentPrice: 120,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, []),
            )
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, [fakeSell]),
            );

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 4,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: 99999,
            notes: '',
        });

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data.soldQuantity).toBe(4);
        expect(data.remainingQuantity).toBe(6);

        const expectedRealized = (120 * 4 - sellBrokerage - sellCharges) - (4 * averageBuyCost);
        expect(data.realizedProfitLoss).toBeCloseTo(expectedRealized, 2);

        const expectedUnrealized = 6 * 120 - 6 * averageBuyCost;
        expect(data.unrealizedProfitLoss).toBeCloseTo(expectedUnrealized, 2);

        const expectedTotal = expectedRealized + expectedUnrealized;
        expect(data.totalProfitLoss).toBeCloseTo(expectedTotal, 2);
    });

    // it('should have zero unrealized profit when the entire trade is sold', async () => {
    //     const userId = 'user-123';
    //     const tradeId = '507f1f77bcf86cd799439011';

    //     const fakeTrade = {
    //         _id: tradeId,
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 100,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.OPEN,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const fakeSell = {
    //         _id: '507f1f77bcf86cd799439012',
    //         userId,
    //         tradeId,
    //         sellDate: new Date('2026-08-26'),
    //         quantity: 10,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     };

    //     const updatedFakeTrade = {
    //         ...fakeTrade,
    //         status: TradeStatus.CLOSED,
    //         currentPrice: 120,
    //     };

    //     mockTradesDao.findTrade
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, fakeTrade))
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade));

    //     mockTradesDao.listSells
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, []))
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [fakeSell]));

    //     mockTradesDao.createSell.mockResolvedValue(
    //         createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
    //     );

    //     mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S20, null),
    //     );

    //     const result = await service.createSell(userId, tradeId, {
    //         sellDate: '2026-08-26',
    //         quantity: 10,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     });

    //     expect(result.code).toBe(HttpStatus.OK);
    //     const data = result.data;
    //     expect(data.soldQuantity).toBe(10);
    //     expect(data.remainingQuantity).toBe(0);

    //     expect(data.realizedProfitLoss).toBeCloseTo(202, 2);
    //     expect(data.unrealizedProfitLoss).toBe(0);
    //     expect(data.totalProfitLoss).toBeCloseTo(202, 2);

    //     expect(data.status).toBe(TradeStatus.CLOSED);
    // });

    it('should have zero unrealized profit when the entire trade is sold', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const tradeBrokerage = 5;
        const tradeCharges = 2;

        const sellBrokerage = 2;
        const sellCharges = 3;

        const averageBuyCost = (100 * 10 + tradeBrokerage + tradeCharges) / 10;

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: tradeBrokerage,
            charges: tradeCharges,
            currentPrice: 100,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const fakeSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 10,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: sellCharges,
            notes: '',
        };

        const updatedFakeTrade = {
            ...fakeTrade,
            status: TradeStatus.CLOSED,
            currentPrice: 120,
        };

        mockTradesDao.findTrade
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
            )
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade),
            );

        mockTradesDao.listSells
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, []),
            )
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, [fakeSell]),
            );

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 10,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: 99999,
            notes: '',
        });

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data.soldQuantity).toBe(10);
        expect(data.remainingQuantity).toBe(0);

        const expectedRealized = (120 * 10 - sellBrokerage - sellCharges) - (10 * averageBuyCost);
        expect(data.realizedProfitLoss).toBeCloseTo(expectedRealized, 2);

        expect(data.unrealizedProfitLoss).toBe(0);

        expect(data.totalProfitLoss).toBeCloseTo(expectedRealized, 2);

        expect(data.status).toBe(TradeStatus.CLOSED);
    });

    it('should reject a trade with a future buy date', async () => {
        const userId = 'user-123';

        const createTradeDto = {
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: '2030-01-01',
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
        };

        const result = await service.createTrade(userId, createTradeDto);

        expect(result.code).toBeGreaterThanOrEqual(400);

        expect(mockTradesDao.createTrade).not.toHaveBeenCalled();
    });

    it('should reject a trade with zero quantity', async () => {
        const userId = 'user-123';

        const createTradeDto = {
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: '2026-08-20',
            buyPrice: 100,
            quantity: 0,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
        };

        const result = await service.createTrade(userId, createTradeDto);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Quantity must be greater than 0.');

        expect(mockTradesDao.createTrade).not.toHaveBeenCalled();
    });

    it('should reject a trade with zero buy price', async () => {
        const userId = 'user-123';

        const createTradeDto = {
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: '2026-08-20',
            buyPrice: -100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
        };

        const result = await service.createTrade(userId, createTradeDto);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Buy price must be greater than 0.');

        expect(mockTradesDao.createTrade).not.toHaveBeenCalled();
    });

    it('should reject a trade with an invalid buy date', async () => {
        const userId = 'user-123';

        const createTradeDto = {
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: 'not-a-date',
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
        };

        const result = await service.createTrade(userId, createTradeDto);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Invalid buy date.');

        expect(mockTradesDao.createTrade).not.toHaveBeenCalled();
    });

    it('should reject a sell date before the trade buy date', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-19',
            quantity: 5,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Sell date cannot be before buy date.');

        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    it('should reject a sell with an invalid sell date', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: 'not-a-date',
            quantity: 5,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Invalid sell date.');

        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    it('should reject a sell with zero quantity', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 0,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe(
            'Sell quantity must be greater than 0.',
        );

        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    it('should reject a sell with negative quantity', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: -5,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe(
            'Sell quantity must be greater than 0.',
        );

        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    it('should reject a sell with zero sell price', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 5,
            sellPrice: 0,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe(
            'Sell price must be greater than 0.',
        );

        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    // it('should correctly calculate cumulative quantities and P&L after multiple sells', async () => {
    //     const userId = 'user-123';
    //     const tradeId = '507f1f77bcf86cd799439011';

    //     const fakeTrade = {
    //         _id: tradeId,
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.PARTIALLY_SOLD,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const firstSell = {
    //         _id: '507f1f77bcf86cd799439012',
    //         userId,
    //         tradeId,
    //         sellDate: new Date('2026-08-25'),
    //         quantity: 3,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     };

    //     const secondSell = {
    //         _id: '507f1f77bcf86cd799439013',
    //         userId,
    //         tradeId,
    //         sellDate: new Date('2026-08-26'),
    //         quantity: 2,
    //         sellPrice: 130,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     };

    //     const updatedFakeTrade = {
    //         ...fakeTrade,
    //         currentPrice: 130,
    //     };

    //     mockTradesDao.findTrade
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, fakeTrade))
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade));

    //     mockTradesDao.listSells
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [firstSell]))
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [firstSell, secondSell]));

    //     mockTradesDao.createSell.mockResolvedValue(
    //         createResponse(HttpStatus.CREATED, Messages.S22, secondSell),
    //     );

    //     mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S20, null),
    //     );

    //     const result = await service.createSell(userId, tradeId, {
    //         sellDate: '2026-08-26',
    //         quantity: 2,
    //         sellPrice: 130,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     });

    //     expect(result.code).toBe(HttpStatus.OK);
    //     const data = result.data;
    //     expect(data.soldQuantity).toBe(5);
    //     expect(data.remainingQuantity).toBe(5);

    //     expect(data.realizedProfitLoss).toBeCloseTo(113.5, 2);
    //     expect(data.unrealizedProfitLoss).toBeCloseTo(153.5, 2);
    //     expect(data.totalProfitLoss).toBeCloseTo(267, 2);

    //     expect(data.status).toBe(TradeStatus.PARTIALLY_SOLD);
    // });

    it('should correctly calculate cumulative quantities and P&L after multiple sells', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const tradeBrokerage = 5;
        const tradeCharges = 2;

        const sell1Brokerage = 2;
        const sell1Charges = 3;

        const sell2Brokerage = 2;
        const sell2ExpectedCharges = (() => {
            const turnover = 130 * 2;
            const stt = turnover * 0.001;
            const etc = turnover * 0.0000297;
            const sebi = turnover * 0.000001;
            const gst = (sell2Brokerage + etc + sebi) * 0.18;
            return Number((stt + etc + sebi + gst).toFixed(2));
        })();

        const averageBuyCost = (100 * 10 + tradeBrokerage + tradeCharges) / 10;

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: tradeBrokerage,
            charges: tradeCharges,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const firstSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-25'),
            quantity: 3,
            sellPrice: 120,
            brokerage: sell1Brokerage,
            charges: sell1Charges,
            notes: '',
        };

        const secondSell = {
            _id: '507f1f77bcf86cd799439013',
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 2,
            sellPrice: 130,
            brokerage: sell2Brokerage,
            charges: sell2ExpectedCharges,
            notes: '',
        };

        const updatedFakeTrade = {
            ...fakeTrade,
            currentPrice: 130,
        };

        mockTradesDao.findTrade
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
            )
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade),
            );

        mockTradesDao.listSells
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, [firstSell]),
            )
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, [
                    firstSell,
                    secondSell,
                ]),
            );

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, secondSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 2,
            sellPrice: 130,
            brokerage: sell2Brokerage,
            charges: 99999,
            notes: '',
        });

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data.soldQuantity).toBe(5);
        expect(data.remainingQuantity).toBe(5);

        const expectedRealized1 = (120 * 3 - sell1Brokerage - sell1Charges) - (3 * averageBuyCost);
        const expectedRealized2 = (130 * 2 - sell2Brokerage - sell2ExpectedCharges) - (2 * averageBuyCost);
        const totalExpectedRealized = expectedRealized1 + expectedRealized2;
        expect(data.realizedProfitLoss).toBeCloseTo(totalExpectedRealized, 2);

        const expectedUnrealized = 5 * 130 - 5 * averageBuyCost;
        expect(data.unrealizedProfitLoss).toBeCloseTo(expectedUnrealized, 2);

        const expectedTotal = totalExpectedRealized + expectedUnrealized;
        expect(data.totalProfitLoss).toBeCloseTo(expectedTotal, 2);

        expect(data.status).toBe(TradeStatus.PARTIALLY_SOLD);
    });

    // it('should correctly calculate negative P&L when a trade is sold at a loss', async () => {
    //     const userId = 'user-123';
    //     const tradeId = '507f1f77bcf86cd799439011';

    //     const fakeTrade = {
    //         _id: tradeId,
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 100,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.OPEN,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const fakeSell = {
    //         _id: '507f1f77bcf86cd799439012',
    //         userId,
    //         tradeId,
    //         sellDate: new Date('2026-08-26'),
    //         quantity: 5,
    //         sellPrice: 80,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     };

    //     const updatedFakeTrade = {
    //         ...fakeTrade,
    //         status: TradeStatus.PARTIALLY_SOLD,
    //         currentPrice: 80,
    //     };

    //     mockTradesDao.findTrade
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, fakeTrade))
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade));

    //     mockTradesDao.listSells
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, []))
    //         .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [fakeSell]));

    //     mockTradesDao.createSell.mockResolvedValue(
    //         createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
    //     );

    //     mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S20, null),
    //     );

    //     const result = await service.createSell(userId, tradeId, {
    //         sellDate: '2026-08-26',
    //         quantity: 5,
    //         sellPrice: 80,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     });

    //     expect(result.code).toBe(HttpStatus.OK);
    //     const data = result.data;
    //     expect(data.soldQuantity).toBe(5);
    //     expect(data.remainingQuantity).toBe(5);

    //     expect(data.realizedProfitLoss).toBeCloseTo(-101.5, 2);
    //     expect(data.unrealizedProfitLoss).toBeCloseTo(-96.5, 2);
    //     expect(data.totalProfitLoss).toBeCloseTo(-198, 2);

    //     expect(data.status).toBe(TradeStatus.PARTIALLY_SOLD);
    // });

    it('should correctly calculate negative P&L when a trade is sold at a loss', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const tradeBrokerage = 5;
        const tradeCharges = 2;

        const sellBrokerage = 2;
        const sellCharges = 3;

        const averageBuyCost = (100 * 10 + tradeBrokerage + tradeCharges) / 10;

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: tradeBrokerage,
            charges: tradeCharges,
            currentPrice: 100,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const fakeSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 5,
            sellPrice: 80,
            brokerage: sellBrokerage,
            charges: sellCharges,
            notes: '',
        };

        const updatedFakeTrade = {
            ...fakeTrade,
            status: TradeStatus.PARTIALLY_SOLD,
            currentPrice: 80,
        };

        mockTradesDao.findTrade
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
            )
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade),
            );

        mockTradesDao.listSells
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, []),
            )
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S23, [fakeSell]),
            );

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 5,
            sellPrice: 80,
            brokerage: sellBrokerage,
            charges: 99999,
            notes: '',
        });

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data.soldQuantity).toBe(5);
        expect(data.remainingQuantity).toBe(5);

        const expectedRealized = (80 * 5 - sellBrokerage - sellCharges) - (5 * averageBuyCost);
        expect(data.realizedProfitLoss).toBeCloseTo(expectedRealized, 2);

        const expectedUnrealized = 5 * 80 - 5 * averageBuyCost;
        expect(data.unrealizedProfitLoss).toBeCloseTo(expectedUnrealized, 2);

        const expectedTotal = expectedRealized + expectedUnrealized;
        expect(data.totalProfitLoss).toBeCloseTo(expectedTotal, 2);

        expect(data.status).toBe(TradeStatus.PARTIALLY_SOLD);
    });

    it('should include brokerage and charges when calculating realized P&L', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const tradeBrokerage = 10;
        const tradeCharges = 5;

        const sellBrokerage = 10;
        const sellCharges = 5;

        const averageBuyCost = (100 * 10 + tradeBrokerage + tradeCharges) / 10;

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: tradeBrokerage,
            charges: tradeCharges,
            currentPrice: 100,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const fakeSell = {
            _id: '507f1f77bcf86cd799439012',
            userId,
            tradeId,
            sellDate: new Date('2026-08-26'),
            quantity: 10,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: sellCharges,
            notes: '',
        };

        const updatedFakeTrade = {
            ...fakeTrade,
            status: TradeStatus.CLOSED,
            currentPrice: 120,
        };

        mockTradesDao.findTrade
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, fakeTrade))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade));

        mockTradesDao.listSells
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, []))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [fakeSell]));

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, fakeSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 10,
            sellPrice: 120,
            brokerage: sellBrokerage,
            charges: 99999,
            notes: '',
        });

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.soldQuantity).toBe(10);
        expect(data.remainingQuantity).toBe(0);

        const expectedRealized = (120 * 10 - sellBrokerage - sellCharges) - (10 * averageBuyCost);
        expect(data.realizedProfitLoss).toBeCloseTo(expectedRealized, 2);
        expect(data.unrealizedProfitLoss).toBe(0);
        expect(data.totalProfitLoss).toBeCloseTo(expectedRealized, 2);

        expect(data.status).toBe(TradeStatus.CLOSED);
    });

    it('should update a trade successfully', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const updatedTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 130,
            targetPrice: 160,
            stopLoss: 90,
            notes: 'Updated trade',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, updatedTrade),
        );

        mockTradesDao.listSells.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.updateTrade(
            userId,
            tradeId,
            {
                currentPrice: 130,
                targetPrice: 160,
                notes: 'Updated trade',
            },
        );

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            {
                currentPrice: 130,
                targetPrice: 160,
                notes: 'Updated trade',
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.currentPrice).toBe(130);
        expect(data.targetPrice).toBe(160);
        expect(data.notes).toBe('Updated trade');
    });

    it('should reject updating another user trade', async () => {
        const userA = 'user-a';
        const tradeId = '507f1f77bcf86cd799439011';

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['Trade']), null),
        );

        const result = await service.updateTrade(
            userA,
            tradeId,
            {
                currentPrice: 130,
                targetPrice: 160,
                notes: 'Unauthorized update',
            },
        );

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Trade not found.');

        expect(mockTradesDao.findTrade).toHaveBeenCalledWith(userA, tradeId);

        expect(mockTradesDao.updateTrade).not.toHaveBeenCalled();
    });

    it('should reject updating quantity below already sold quantity', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const fakeSells = [
            {
                quantity: 6,
                sellPrice: 120,
                brokerage: 2,
                charges: 3,
            },
        ];

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, fakeSells),
        );

        const result = await service.updateTrade(userId, tradeId, {
            quantity: 5,
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe(
            'Quantity cannot be less than already sold quantity.',
        );

        expect(mockTradesDao.updateTrade).not.toHaveBeenCalled();
    });

    it('should archive a trade successfully', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const archivedTrade = {
            ...fakeTrade,
            status: TradeStatus.ARCHIVED,
            isActive: false,
            archivedAt: new Date(),
        };

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, archivedTrade),
        );

        mockTradesDao.listSells.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.updateTrade(
            userId,
            tradeId,
            {
                status: TradeStatus.ARCHIVED,
            },
        );

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            expect.objectContaining({
                status: TradeStatus.ARCHIVED,
                isActive: false,
                archivedAt: expect.any(Date),
            }),
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.status).toBe(TradeStatus.ARCHIVED);
        expect(data.isActive).toBe(false);
    });

    it('should restore an archived trade successfully', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const archivedTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.ARCHIVED,
            isActive: false,
            archivedAt: new Date('2026-08-25'),
        };

        const restoredTrade = {
            ...archivedTrade,
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, archivedTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, restoredTrade),
        );

        mockTradesDao.listSells.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.updateTrade(
            userId,
            tradeId,
            {
                status: TradeStatus.OPEN,
            },
        );

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            {
                status: TradeStatus.OPEN,
                isActive: true,
                archivedAt: null,
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.status).toBe(TradeStatus.OPEN);
        expect(data.isActive).toBe(true);
    });

    it('should reject updating buy date after an existing sell date', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const fakeSells = [
            {
                sellDate: new Date('2026-08-25'),
                quantity: 5,
                sellPrice: 120,
                brokerage: 2,
                charges: 3,
            },
        ];

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, fakeSells),
        );

        const result = await service.updateTrade(userId, tradeId, {
            buyDate: '2026-08-26',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe(
            'Buy date cannot be after an existing sell date.',
        );

        expect(mockTradesDao.updateTrade).not.toHaveBeenCalled();
    });

    it('should allow updating quantity to exactly the already sold quantity', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const updatedTrade = {
            ...fakeTrade,
            quantity: 6,
            charges: 1.61,
        };

        const fakeSells = [
            {
                _id: tradeId + '-sell',
                tradeId,
                sellDate: new Date('2026-08-25'),
                quantity: 6,
                sellPrice: 120,
                brokerage: 2,
                charges: 3,
                notes: '',
            },
        ];

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, fakeSells),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, updatedTrade),
        );

        mockTradesDao.listSells.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S23, fakeSells),
        );

        const result = await service.updateTrade(
            userId,
            tradeId,
            {
                quantity: 6,
                charges: 99999,
            },
        );

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            {
                quantity: 6,
                charges: 1.61,
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.quantity).toBe(6);
    });

    it("should reject selling another user's trade", async () => {
        const userA = 'user-a';
        const tradeId = '507f1f77bcf86cd799439011';

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['Trade']), null),
        );

        const result = await service.createSell(userA, tradeId, {
            sellDate: '2026-08-26',
            quantity: 5,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Trade not found.');

        expect(mockTradesDao.findTrade).toHaveBeenCalledWith(userA, tradeId);

        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    it('should list only active trades belonging to the current user', async () => {
        const userId = 'user-a';

        const userTrade = {
            _id: 'trade-1',
            userId: 'user-a',
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.listTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S18, [userTrade]),
        );

        mockTradesDao.listSellsForTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.listTrades(userId);

        expect(mockTradesDao.listTrades).toHaveBeenCalledWith(userId, false);

        expect(mockTradesDao.listSellsForTrades).toHaveBeenCalledWith(userId, ['trade-1']);

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data).toHaveLength(1);
        expect(data[0].stockSymbol).toBe('RELIANCE');
        expect(data[0].id).toBe('trade-1');
    });

    it('should include archived trades when includeArchived is true', async () => {
        const userId = 'user-a';

        const archivedTrade = {
            _id: 'trade-archived-1',
            userId,
            stockSymbol: 'TCS',
            companyName: 'Tata Consultancy Services',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.ARCHIVED,
            isActive: false,
            archivedAt: new Date('2026-08-25'),
        };

        mockTradesDao.listTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S18, [archivedTrade]),
        );

        mockTradesDao.listSellsForTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.listTrades(userId, true);

        expect(mockTradesDao.listTrades).toHaveBeenCalledWith(userId, true);

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data).toHaveLength(1);
        expect(data[0].stockSymbol).toBe('TCS');
        expect(data[0].status).toBe(TradeStatus.ARCHIVED);
        expect(data[0].isActive).toBe(false);
    });

    it('should archive a trade successfully', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S21, null),
        );

        const result = await service.archiveTrade(
            userId,
            tradeId,
        );

        expect(mockTradesDao.findTrade).toHaveBeenCalledWith(userId, tradeId);

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            {
                status: TradeStatus.ARCHIVED,
                isActive: false,
                archivedAt: expect.any(Date),
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toEqual({
            archived: true,
        });
    });

    it('should reject archiving another user trade', async () => {
        const userA = 'user-a';
        const tradeId = '507f1f77bcf86cd799439011';

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['Trade']), null),
        );

        const result = await service.archiveTrade(userA, tradeId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Trade not found.');

        expect(mockTradesDao.findTrade).toHaveBeenCalledWith(userA, tradeId);

        expect(mockTradesDao.updateTrade).not.toHaveBeenCalled();
    });

    // it('should list sells with calculated realized P&L', async () => {
    //     const userId = 'user-123';
    //     const tradeId = '507f1f77bcf86cd799439011';

    //     const fakeTrade = {
    //         _id: tradeId,
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.PARTIALLY_SOLD,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const fakeSell = {
    //         _id: 'sell-123',
    //         tradeId,
    //         userId,
    //         sellDate: new Date('2026-08-25'),
    //         quantity: 5,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: 'Partial profit booking',
    //     };

    //     mockTradesDao.findTrade.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
    //     );

    //     mockTradesDao.listSells.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S23, [fakeSell]),
    //     );

    //     const result = await service.listSells(userId, tradeId);

    //     expect(mockTradesDao.findTrade).toHaveBeenCalledWith(userId, tradeId);

    //     expect(mockTradesDao.listSells).toHaveBeenCalledWith(userId, tradeId);

    //     expect(result.code).toBe(HttpStatus.OK);
    //     const data = result.data;
    //     expect(data).toHaveLength(1);

    //     expect(data[0].id).toBe('sell-123');
    //     expect(data[0].tradeId).toBe(tradeId);
    //     expect(data[0].quantity).toBe(5);
    //     expect(data[0].sellPrice).toBe(120);

    //     expect(data[0].grossSellValue).toBe(600);
    //     expect(data[0].netSellValue).toBe(595);
    //     expect(data[0].realizedProfitLoss).toBe(98.5);

    //     expect(data[0].brokerage).toBe(2);
    //     expect(data[0].charges).toBe(3);
    //     expect(data[0].notes).toBe('Partial profit booking');
    // });

    it('should list sells with calculated realized P&L', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: 'trade-123',
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const fakeSell = {
            _id: 'sell-123',
            tradeId,
            userId,
            sellDate: new Date('2026-08-25'),
            quantity: 5,
            sellPrice: 120,
            brokerage: 2,
            charges: 3,
            notes: 'Partial profit booking',
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, [fakeSell]),
        );

        const result = await service.listSells(userId, tradeId);

        expect(mockTradesDao.findTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
        );

        expect(mockTradesDao.listSells).toHaveBeenCalledWith(
            userId,
            tradeId,
        );

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data).toHaveLength(1);

        expect(data[0].id).toBe('sell-123');
        expect(data[0].tradeId).toBe(tradeId);
        expect(data[0].quantity).toBe(5);
        expect(data[0].sellPrice).toBe(120);

        // 120 × 5 = 600
        expect(data[0].grossSellValue).toBe(600);

        // netSellValue = 600 - 2 - 3 = 595
        expect(data[0].netSellValue).toBe(595);

        // avgBuyCost = (1000+5+2)/10 = 100.7, realized = 595 - 5*100.7 = 91.5
        expect(data[0].realizedProfitLoss).toBe(91.5);

        // Brokerage and charges are still stored/returned.
        expect(data[0].brokerage).toBe(2);
        expect(data[0].charges).toBe(3);

        expect(data[0].notes).toBe('Partial profit booking');
    });

    it('should reject listing sells for another user trade', async () => {
        const userA = 'user-a';
        const tradeId = '507f1f77bcf86cd799439011';

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.NOT_FOUND, messageFactory(Messages.W5, ['Trade']), null),
        );

        const result = await service.listSells(userA, tradeId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Trade not found.');

        expect(mockTradesDao.findTrade).toHaveBeenCalledWith(userA, tradeId);

        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
    });

    // it('should calculate realized and unrealized P&L for a partially sold trade in listTrades', async () => {
    //     const userId = 'user-123';

    //     const trade = {
    //         _id: 'trade-123',
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.PARTIALLY_SOLD,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const sell = {
    //         _id: 'sell-123',
    //         tradeId: 'trade-123',
    //         userId,
    //         sellDate: new Date('2026-08-25'),
    //         quantity: 5,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     };

    //     mockTradesDao.listTrades.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S18, [trade]),
    //     );

    //     mockTradesDao.listSellsForTrades.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S23, [sell]),
    //     );

    //     const result = await service.listTrades(userId);

    //     expect(mockTradesDao.listTrades).toHaveBeenCalledWith(userId, false);

    //     expect(mockTradesDao.listSellsForTrades).toHaveBeenCalledWith(userId, ['trade-123']);

    //     expect(result.code).toBe(HttpStatus.OK);
    //     const data = result.data;
    //     expect(data).toHaveLength(1);

    //     expect(data[0].soldQuantity).toBe(5);
    //     expect(data[0].remainingQuantity).toBe(5);

    //     expect(data[0].realizedProfitLoss).toBeCloseTo(98.5, 2);
    //     expect(data[0].unrealizedProfitLoss).toBeCloseTo(103.5, 2);
    //     expect(data[0].totalProfitLoss).toBeCloseTo(202, 2);

    //     expect(data[0].status).toBe(TradeStatus.PARTIALLY_SOLD);
    // });

    it('should calculate realized and unrealized P&L for a partially sold trade in listTrades', async () => {
        const userId = 'user-123';

        const trade = {
            _id: 'trade-123',
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const sell = {
            _id: 'sell-123',
            tradeId: 'trade-123',
            userId,
            sellDate: new Date('2026-08-25'),
            quantity: 5,
            sellPrice: 120,
            brokerage: 2,
            charges: 3,
            notes: '',
        };

        mockTradesDao.listTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S18, [trade]),
        );

        mockTradesDao.listSellsForTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, [sell]),
        );

        const result = await service.listTrades(userId);

        expect(mockTradesDao.listTrades).toHaveBeenCalledWith(
            userId,
            false,
        );

        expect(mockTradesDao.listSellsForTrades).toHaveBeenCalledWith(
            userId,
            ['trade-123'],
        );

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data).toHaveLength(1);

        expect(data[0].soldQuantity).toBe(5);
        expect(data[0].remainingQuantity).toBe(5);

        // Realized P/L:
        // avgBuyCost = (1000+5+2)/10 = 100.7, netSell = 5*120-2-3 = 595, realized = 595 - 5*100.7 = 91.5
        expect(data[0].realizedProfitLoss).toBeCloseTo(91.5, 2);

        // Unrealized P/L:
        // 5 * (120 - 100.7) = 96.5
        expect(data[0].unrealizedProfitLoss).toBeCloseTo(96.5, 2);

        // Total P/L:
        // 91.5 + 96.5 = 188
        expect(data[0].totalProfitLoss).toBeCloseTo(188, 2);

        expect(data[0].status).toBe(TradeStatus.PARTIALLY_SOLD);
    });

    // it('should calculate a fully sold trade with zero unrealized P&L', async () => {
    //     const userId = 'user-123';

    //     const trade = {
    //         _id: 'trade-123',
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 2,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.CLOSED,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const sell = {
    //         _id: 'sell-123',
    //         tradeId: 'trade-123',
    //         userId,
    //         sellDate: new Date('2026-08-25'),
    //         quantity: 10,
    //         sellPrice: 120,
    //         brokerage: 5,
    //         charges: 5,
    //         notes: '',
    //     };

    //     mockTradesDao.listTrades.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S18, [trade]),
    //     );

    //     mockTradesDao.listSellsForTrades.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S23, [sell]),
    //     );

    //     const result = await service.listTrades(userId);

    //     expect(result.code).toBe(HttpStatus.OK);
    //     const data = result.data;
    //     expect(data).toHaveLength(1);

    //     expect(data[0].soldQuantity).toBe(10);
    //     expect(data[0].remainingQuantity).toBe(0);

    //     expect(data[0].realizedProfitLoss).toBeCloseTo(197, 2);
    //     expect(data[0].unrealizedProfitLoss).toBe(0);
    //     expect(data[0].totalProfitLoss).toBeCloseTo(197, 2);

    //     expect(data[0].status).toBe(TradeStatus.CLOSED);
    // });

    it('should calculate a fully sold trade with zero unrealized P&L', async () => {
        const userId = 'user-123';

        const trade = {
            _id: 'trade-123',
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.CLOSED,
            isActive: true,
            archivedAt: null,
        };

        const sell = {
            _id: 'sell-123',
            tradeId: 'trade-123',
            userId,
            sellDate: new Date('2026-08-25'),
            quantity: 10,
            sellPrice: 120,
            brokerage: 5,
            charges: 5,
            notes: '',
        };

        mockTradesDao.listTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S18, [trade]),
        );

        mockTradesDao.listSellsForTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, [sell]),
        );

        const result = await service.listTrades(userId);

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data).toHaveLength(1);

        expect(data[0].soldQuantity).toBe(10);
        expect(data[0].remainingQuantity).toBe(0);

        // Realized P/L:
        // avgBuyCost = (1000+5+2)/10 = 100.7, netSell = 1200-5-5 = 1190, realized = 1190 - 10*100.7 = 183
        expect(data[0].realizedProfitLoss).toBeCloseTo(183, 2);

        // Entire quantity is sold.
        expect(data[0].unrealizedProfitLoss).toBe(0);

        // Total P/L = realized P/L + unrealized P/L
        expect(data[0].totalProfitLoss).toBeCloseTo(183, 2);

        expect(data[0].status).toBe(TradeStatus.CLOSED);
    });

    it('should associate sells with the correct trade', async () => {
        const userId = 'user-123';

        const tradeA = {
            _id: 'trade-a',
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 0,
            charges: 0,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const tradeB = {
            _id: 'trade-b',
            userId,
            stockSymbol: 'TCS',
            companyName: 'Tata Consultancy Services',
            buyDate: new Date('2026-08-21'),
            buyPrice: 200,
            quantity: 20,
            brokerage: 0,
            charges: 0,
            currentPrice: 220,
            targetPrice: 250,
            stopLoss: 180,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const sellA = {
            _id: 'sell-a',
            tradeId: 'trade-a',
            userId,
            sellDate: new Date('2026-08-25'),
            quantity: 5,
            sellPrice: 120,
            brokerage: 0,
            charges: 0,
            notes: '',
        };

        const sellB = {
            _id: 'sell-b',
            tradeId: 'trade-b',
            userId,
            sellDate: new Date('2026-08-26'),
            quantity: 10,
            sellPrice: 220,
            brokerage: 0,
            charges: 0,
            notes: '',
        };

        mockTradesDao.listTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S18, [
                tradeA,
                tradeB,
            ]),
        );

        mockTradesDao.listSellsForTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, [
                sellA,
                sellB,
            ]),
        );

        const result = await service.listTrades(userId);

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data).toHaveLength(2);

        const relianceResult = data.find(
            (trade: any) => trade.id === 'trade-a',
        );

        const tcsResult = data.find(
            (trade: any) => trade.id === 'trade-b',
        );

        expect(relianceResult).toBeDefined();
        expect(tcsResult).toBeDefined();

        expect(relianceResult.soldQuantity).toBe(5);
        expect(relianceResult.remainingQuantity).toBe(5);

        expect(tcsResult.soldQuantity).toBe(10);
        expect(tcsResult.remainingQuantity).toBe(10);

        expect(relianceResult.sells).toHaveLength(1);
        expect(relianceResult.sells[0].id).toBe('sell-a');

        expect(tcsResult.sells).toHaveLength(1);
        expect(tcsResult.sells[0].id).toBe('sell-b');
    });

    it('should return an empty array when the user has no trades', async () => {
        const userId = 'user-123';

        mockTradesDao.listTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S18, []),
        );

        const result = await service.listTrades(userId);

        expect(mockTradesDao.listTrades).toHaveBeenCalledWith(userId, false);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toEqual([]);
    });

    it('should return an empty array when the trade has no sells', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.listSells(userId, tradeId);

        expect(mockTradesDao.findTrade).toHaveBeenCalledWith(userId, tradeId);

        expect(mockTradesDao.listSells).toHaveBeenCalledWith(userId, tradeId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toEqual([]);
    });

    it('should reject an invalid trade ID when listing sells', async () => {
        const userId = 'user-123';
        const invalidTradeId = 'invalid-id';

        const result = await service.listSells(userId, invalidTradeId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Trade not found.');

        expect(mockTradesDao.findTrade).not.toHaveBeenCalled();
        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
    });

    it('should handle an update request with no fields', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.updateTrade(
            userId,
            tradeId,
            {},
        );

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            {},
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.stockSymbol).toBe('RELIANCE');
        expect(data.quantity).toBe(10);
    });

    it('should correctly calculate sold and remaining quantity with multiple sells', async () => {
        const userId = 'user-123';

        const trade = {
            _id: 'trade-123',
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 0,
            charges: 0,
            currentPrice: 130,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const sell1 = {
            _id: 'sell-1',
            tradeId: 'trade-123',
            userId,
            sellDate: new Date('2026-08-24'),
            quantity: 3,
            sellPrice: 120,
            brokerage: 0,
            charges: 0,
            notes: '',
        };

        const sell2 = {
            _id: 'sell-2',
            tradeId: 'trade-123',
            userId,
            sellDate: new Date('2026-08-25'),
            quantity: 2,
            sellPrice: 130,
            brokerage: 0,
            charges: 0,
            notes: '',
        };

        mockTradesDao.listTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S18, [trade]),
        );

        mockTradesDao.listSellsForTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, [sell1, sell2]),
        );

        const result = await service.listTrades(userId);

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data).toHaveLength(1);

        expect(data[0].soldQuantity).toBe(5);
        expect(data[0].remainingQuantity).toBe(5);

        expect(data[0].sells).toHaveLength(2);

        expect(data[0].sells[0].id).toBe('sell-1');
        expect(data[0].sells[1].id).toBe('sell-2');
    });

    it('should reject selling more than the remaining quantity', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const trade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const existingSell = {
            _id: 'sell-1',
            tradeId,
            userId,
            sellDate: new Date('2026-08-25'),
            quantity: 6,
            sellPrice: 120,
            brokerage: 2,
            charges: 3,
            notes: '',
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, trade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, [existingSell]),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 5,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);

        expect(mockTradesDao.createSell).not.toHaveBeenCalled();
        expect(mockTradesDao.updateTradeStatusAndPrice).not.toHaveBeenCalled();
    });

    it('should close the trade when selling exactly the remaining quantity', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const trade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const existingSell = {
            _id: 'sell-1',
            tradeId,
            userId,
            sellDate: new Date('2026-08-25'),
            quantity: 6,
            sellPrice: 120,
            brokerage: 2,
            charges: 3,
            notes: '',
        };

        const newSell = {
            _id: 'sell-2',
            tradeId,
            userId,
            sellDate: new Date('2026-08-26'),
            quantity: 4,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        };

        const updatedFakeTrade = {
            ...trade,
            status: TradeStatus.CLOSED,
            currentPrice: 130,
        };

        mockTradesDao.findTrade
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, trade))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S19, updatedFakeTrade));

        mockTradesDao.listSells
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [existingSell]))
            .mockResolvedValueOnce(createResponse(HttpStatus.OK, Messages.S23, [existingSell, newSell]));

        mockTradesDao.createSell.mockResolvedValue(
            createResponse(HttpStatus.CREATED, Messages.S22, newSell),
        );

        mockTradesDao.updateTradeStatusAndPrice.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        const result = await service.createSell(userId, tradeId, {
            sellDate: '2026-08-26',
            quantity: 4,
            sellPrice: 130,
            brokerage: 2,
            charges: 3,
            notes: '',
        });

        expect(mockTradesDao.createSell).toHaveBeenCalled();

        expect(mockTradesDao.updateTradeStatusAndPrice).toHaveBeenCalledWith(
            userId,
            tradeId,
            TradeStatus.CLOSED,
            130,
        );
    });

    it('should reject updating trade with an invalid buy date', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.updateTrade(userId, tradeId, {
            buyDate: 'not-a-date',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Invalid buy date.');

        expect(mockTradesDao.updateTrade).not.toHaveBeenCalled();
    });

    it('should reject updating buy date after an existing sell date', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const fakeSells = [
            {
                _id: 'sell-1',
                tradeId,
                userId,
                sellDate: new Date('2026-08-25'),
                quantity: 5,
                sellPrice: 120,
                brokerage: 2,
                charges: 3,
                notes: '',
            },
        ];

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, fakeSells),
        );

        const result = await service.updateTrade(userId, tradeId, {
            buyDate: '2026-08-26',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe(
            'Buy date cannot be after an existing sell date.',
        );

        expect(mockTradesDao.updateTrade).not.toHaveBeenCalled();
    });

    it('should allow updating buy date to exactly an existing sell date', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const fakeSells = [
            {
                _id: 'sell-1',
                tradeId,
                userId,
                sellDate: new Date('2026-08-25'),
                quantity: 5,
                sellPrice: 120,
                brokerage: 2,
                charges: 3,
                notes: '',
            },
        ];

        const updatedTrade = {
            ...fakeTrade,
            buyDate: new Date('2026-08-25'),
        };

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, fakeSells),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, updatedTrade),
        );

        mockTradesDao.listSells.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S23, fakeSells),
        );

        const result = await service.updateTrade(
            userId,
            tradeId,
            {
                buyDate: '2026-08-25',
            },
        );

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            {
                buyDate: new Date('2026-08-25'),
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.buyDate).toEqual(new Date('2026-08-25'));
    });

    it('should reject when trade id is invalid', async () => {
        const userId = 'user-123';
        const invalidTradeId = 'invalid-trade-id';

        const result = await service.getTradeById(userId, invalidTradeId);

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Trade not found.');

        expect(mockTradesDao.findTrade).not.toHaveBeenCalled();
        expect(mockTradesDao.listSells).not.toHaveBeenCalled();
    });

    it('should return an empty list when the user has no trades', async () => {
        const userId = 'user-123';

        mockTradesDao.listTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S18, []),
        );

        mockTradesDao.listSellsForTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.listTrades(userId);

        expect(result.code).toBe(HttpStatus.OK);
        expect(result.data).toEqual([]);

        expect(mockTradesDao.listTrades).toHaveBeenCalledWith(userId, false);
    });

    it('should reject updating trade with an invalid buy date', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.updateTrade(userId, tradeId, {
            buyDate: 'invalid-date',
        });

        expect(result.code).toBeGreaterThanOrEqual(400);
        expect(result.message).toBe('Invalid buy date.');

        expect(mockTradesDao.updateTrade).not.toHaveBeenCalled();
    });

    it('should update the buy date successfully', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.PARTIALLY_SOLD,
            isActive: true,
            archivedAt: null,
        };

        const updatedTrade = {
            ...fakeTrade,
            buyDate: new Date('2026-08-22'),
        };

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, [
                {
                    _id: 'sell-1',
                    tradeId,
                    userId,
                    sellDate: new Date('2026-08-25'),
                    quantity: 2,
                    sellPrice: 120,
                    brokerage: 2,
                    charges: 3,
                    notes: '',
                },
            ]),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, updatedTrade),
        );

        mockTradesDao.listSells.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S23, [
                {
                    _id: 'sell-1',
                    tradeId,
                    userId,
                    sellDate: new Date('2026-08-25'),
                    quantity: 2,
                    sellPrice: 120,
                    brokerage: 2,
                    charges: 3,
                    notes: '',
                },
            ]),
        );

        const result = await service.updateTrade(
            userId,
            tradeId,
            {
                buyDate: '2026-08-22',
            },
        );

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            {
                buyDate: new Date('2026-08-22'),
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.buyDate).toEqual(new Date('2026-08-22'));
    });

    it('should format currency values in Indian Rupee format', () => {
        const result = (service as any).formatCurrency(123456.78);

        expect(result).toBe('₹1,23,457');
    });

    it('should format zero currency correctly', () => {
        const result = (service as any).formatCurrency(0);

        expect(result).toBe('₹0');
    });

    it('should update optional trade fields successfully', async () => {
        const tradeId = '507f1f77bcf86cd799439011';
        const userId = 'user-123';

        const trade = {
            _id: tradeId,
            userId,
            stockSymbol: 'OLD',
            companyName: 'Old Company',
            buyDate: new Date('2025-01-01'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 10,
            charges: 5,
            currentPrice: 110,
            targetPrice: 120,
            stopLoss: 90,
            notes: 'Old notes',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const updatedTrade = {
            ...trade,
            stockSymbol: 'NEW',
            companyName: 'New Company',
            buyPrice: 150,
            brokerage: 20,
            charges: 5.38,
            stopLoss: 130,
        };

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, trade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.findTrade.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S19, updatedTrade),
        );

        mockTradesDao.listSells.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.updateTrade(userId, tradeId, {
            stockSymbol: ' new ',
            companyName: ' New Company ',
            buyPrice: 150,
            brokerage: 20,
            charges: 99999,
            stopLoss: 130,
        } as UpdateTradeDto);

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            {
                stockSymbol: 'NEW',
                companyName: 'New Company',
                buyPrice: 150,
                brokerage: 20,
                charges: 5.38,
                stopLoss: 130,
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.stockSymbol).toBe('NEW');
        expect(data.companyName).toBe('New Company');
        expect(data.buyPrice).toBe(150);
        expect(data.brokerage).toBe(20);
        expect(data.charges).toBe(5.38);
        expect(data.stopLoss).toBe(130);
    });

    it('should update stock symbol, company name, buy price, brokerage, charges and stop loss', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const fakeTrade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        const updatedTrade = {
            ...fakeTrade,
            stockSymbol: 'TCS',
            companyName: 'Tata Consultancy Services',
            buyPrice: 200,
            brokerage: 10,
            charges: 4.17,
            stopLoss: 150,
        };

        mockTradesDao.findTrade
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S19, fakeTrade),
            )
            .mockResolvedValueOnce(
                createResponse(HttpStatus.OK, Messages.S19, updatedTrade),
            );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        mockTradesDao.updateTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S20, null),
        );

        mockTradesDao.listSells.mockResolvedValueOnce(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.updateTrade(userId, tradeId, {
            stockSymbol: ' tcs ',
            companyName: ' Tata Consultancy Services ',
            buyPrice: 200,
            brokerage: 10,
            charges: 99999,
            stopLoss: 150,
        });

        expect(mockTradesDao.updateTrade).toHaveBeenCalledWith(
            userId,
            tradeId,
            {
                stockSymbol: 'TCS',
                companyName: 'Tata Consultancy Services',
                buyPrice: 200,
                brokerage: 10,
                charges: 4.17,
                stopLoss: 150,
            },
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.stockSymbol).toBe('TCS');
        expect(data.companyName).toBe('Tata Consultancy Services');
        expect(data.buyPrice).toBe(200);
        expect(data.brokerage).toBe(10);
        expect(data.charges).toBe(4.17);
        expect(data.stopLoss).toBe(150);
    });

    it('should return zero average buy cost when quantity is zero', () => {
        const trade = {
            buyPrice: 100,
            quantity: 0,
            brokerage: 5,
            charges: 2,
        };

        const result = (service as any).calculateAverageBuyCost(trade);

        expect(result).toBe(0);
    });

    it('should use buy price when current price is not available', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const trade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 100,
            quantity: 10,
            brokerage: 5,
            charges: 2,
            currentPrice: 0,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, trade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.getTradeById(userId, tradeId);

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.currentPrice).toBe(100);
    });

    // it('should return zero profit loss percentage when total buy cost is not positive', async () => {
    //     const userId = 'user-123';
    //     const tradeId = '507f1f77bcf86cd799439011';

    //     const trade = {
    //         _id: tradeId,
    //         userId,
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 1,
    //         quantity: 1,
    //         brokerage: 1,
    //         charges: 1,
    //         currentPrice: 1,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.OPEN,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     mockTradesDao.findTrade.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S19, trade),
    //     );

    //     mockTradesDao.listSells.mockResolvedValue(
    //         createResponse(HttpStatus.OK, Messages.S23, []),
    //     );

    //     const result = await service.getTradeById(userId, tradeId);

    //     expect(result.code).toBe(HttpStatus.OK);
    //     const data = result.data;
    //     expect(data.totalBuyCost).toBe(-1);
    //     expect(data.profitLossPercentage).toBe(0);
    // });

    it('should return zero profit loss percentage when total buy cost is zero', async () => {
        const userId = 'user-123';
        const tradeId = '507f1f77bcf86cd799439011';

        const trade = {
            _id: tradeId,
            userId,
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 0,
            quantity: 0,

            brokerage: 0,
            charges: 0,

            currentPrice: 0,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
        };

        mockTradesDao.findTrade.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S19, trade),
        );

        mockTradesDao.listSells.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S23, []),
        );

        const result = await service.getTradeById(userId, tradeId);

        expect(result.code).toBe(HttpStatus.OK);

        const data = result.data;

        expect(data.totalBuyCost).toBe(0);
        expect(data.profitLossPercentage).toBe(0);
    });
});
