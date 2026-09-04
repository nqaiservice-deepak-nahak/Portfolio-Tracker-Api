import { HttpStatus } from '@nestjs/common';
import type { AppResponse } from '../../shared/appresponse.shared';
import { createResponse } from '../../shared/appresponse.shared';
import { DashboardService } from './dashboard.service';
import { AbstractDashboardDao } from '../../database/mongodb/abstract/dashboard.abstract';
import { TradeStatus } from '../../database/schemas/trade.schema';
import { Messages } from '../../shared/messages.shared';
import { AbstractBuyLotsDao } from 'src/database/mongodb/abstract/buy-lots.abstract';

describe('DashboardService', () => {
    let service: DashboardService;
    let mockDashboardDao: jest.Mocked<AbstractDashboardDao>;
    let mockBuyLotsDao: jest.Mocked<AbstractBuyLotsDao>;
    beforeEach(() => {
        jest.clearAllMocks();

        mockDashboardDao = {
            getActiveFunds: jest.fn(),
            getSipEntriesForFunds: jest.fn(),
            getActiveTrades: jest.fn(),
            getTradeSellsForTrades: jest.fn(),
        } as unknown as jest.Mocked<AbstractDashboardDao>;

        mockBuyLotsDao = {
            createBuyLot: jest.fn(),
            listBuyLotsForTrade: jest.fn(),
            listBuyLotsForTrades: jest.fn(),
            updateBuyLot: jest.fn(),
        } as any;

        service = new DashboardService(mockDashboardDao,mockBuyLotsDao);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return an empty portfolio summary when the user has no investments', async () => {
        const userId = 'user-123';

        mockDashboardDao.getActiveFunds.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, []),
        );
        mockDashboardDao.getActiveTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, []),
        );

        const result: AppResponse = await service.getSummary(userId);

        expect(mockDashboardDao.getActiveFunds).toHaveBeenCalledWith(userId);
        expect(mockDashboardDao.getActiveTrades).toHaveBeenCalledWith(userId);
        expect(mockDashboardDao.getSipEntriesForFunds).not.toHaveBeenCalled();
        expect(mockDashboardDao.getTradeSellsForTrades).not.toHaveBeenCalled();

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.totalInvestment.value).toBe(0);
        expect(data.netWorth.value).toBe(0);
        expect(data.profitLoss.value).toBe(0);

        expect(data.mutualFunds.value).toBe(0);
        expect(data.trades.value).toBe(0);

        expect(data.netWorth.trend).toBe('neutral');
        expect(data.profitLoss.trend).toBe('neutral');

        expect(data.assetAllocation).toEqual([
            {
                label: 'Mutual Funds',
                value: 0,
                percentage: 0,
                displayValue: '₹0',
            },
            {
                label: 'Trades',
                value: 0,
                percentage: 0,
                displayValue: '₹0',
            },
            {
                label: 'Cash / Others',
                value: 0,
                percentage: 0,
                displayValue: '₹0',
            },
        ]);

        expect(data.recentActivities).toHaveLength(1);
        expect(data.recentActivities[0].type).toBe('SYSTEM');
    });

    it('should query dashboard data only for the requested user', async () => {
        const userId = 'user-123';

        mockDashboardDao.getActiveFunds.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, []),
        );
        mockDashboardDao.getActiveTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, []),
        );

        await service.getSummary(userId);

        expect(mockDashboardDao.getActiveFunds).toHaveBeenCalledWith(userId);
        expect(mockDashboardDao.getActiveTrades).toHaveBeenCalledWith(userId);
    });

    it('should calculate total mutual fund investment from lump sums and SIP contributions', async () => {
        const userId = 'user-123';

        const fund1 = {
            _id: { toString: () => 'fund-1' },
            userId,
            fundName: 'Fund One',
            lumpSumAmount: 50000,
            currentCagr: 12,
            startDate: new Date('2026-01-01'),
            isActive: true,
        };

        const fund2 = {
            _id: { toString: () => 'fund-2' },
            userId,
            fundName: 'Fund Two',
            lumpSumAmount: 30000,
            currentCagr: 10,
            startDate: new Date('2026-01-01'),
            isActive: true,
        };

        const sip1 = {
            _id: 'sip-1',
            fundId: 'fund-1',
            userId,
            month: '2026-06',
            amountContributed: 5000,
        };

        const sip2 = {
            _id: 'sip-2',
            fundId: 'fund-1',
            userId,
            month: '2026-07',
            amountContributed: 3000,
        };

        const sip3 = {
            _id: 'sip-3',
            fundId: 'fund-2',
            userId,
            month: '2026-08',
            amountContributed: 2000,
        };

        mockDashboardDao.getActiveFunds.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, [fund1, fund2]),
        );
        mockDashboardDao.getSipEntriesForFunds.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, [sip1, sip2, sip3]),
        );
        mockDashboardDao.getActiveTrades.mockResolvedValue(
            createResponse(HttpStatus.OK, Messages.S3, []),
        );

        const result: AppResponse = await service.getSummary(userId);

        expect(mockDashboardDao.getSipEntriesForFunds).toHaveBeenCalledWith(
            userId,
            ['fund-1', 'fund-2'],
        );

        expect(result.code).toBe(HttpStatus.OK);
        const data = result.data;
        expect(data.mutualFunds.value).toBeGreaterThan(0);
        expect(data.totalInvestment.value).toBeGreaterThan(0);
    });

    it('should calculate mutual fund current value using CAGR projection', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-08-27'));

        try {
            const fund = {
                _id: 'fund-1',
                userId: 'user-123',
                fundName: 'Test Fund',
                lumpSumAmount: 10000,
                currentCagr: 12,
                startDate: new Date('2025-08-27'),
                isActive: true,
            };

            const projectedValue = (service as any).calculateFundProjectedValue({
                fund,
                sipEntries: [],
            });

            expect(projectedValue).toBeCloseTo(11268.25, 2);
        } finally {
            jest.useRealTimers();
        }
    });

    // it('should calculate trade investment using only the remaining quantity', () => {
    //     const trade = {
    //         _id: 'trade-1',
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
    //         notes: '',
    //         status: TradeStatus.PARTIALLY_SOLD,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const sell = {
    //         _id: 'sell-1',
    //         tradeId: 'trade-1',
    //         userId: 'user-123',
    //         sellDate: new Date('2026-08-25'),
    //         quantity: 4,
    //         sellPrice: 120,
    //         brokerage: 2,
    //         charges: 3,
    //         notes: '',
    //     };

    //     const investment = (service as any).calculateTradesInvestment(
    //         [trade],
    //         [sell],
    //     );

    //     expect(investment).toBeCloseTo(604.2, 2);
    // });

    it('should calculate trade investment using only the remaining quantity', () => {
        const totalBuyCost = 100 * 10 + 5 + 2;
        const averageBuyCost = totalBuyCost / 10;

        const trade = {
            _id: 'trade-1',
            userId: 'user-123',
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: averageBuyCost,
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

        // ADD: raw-priced buy lot backing this trade
        const buyLots = [
            {
                _id: 'lot-1',
                tradeId: 'trade-1',
                buyDate: trade.buyDate,
                buyPrice: 100,          // raw price, not averageBuyCost
                originalQuantity: 10,
                brokerage: 5,
                charges: 2,
            },
        ];

        const sell = {
            _id: 'sell-1',
            tradeId: 'trade-1',
            userId: 'user-123',
            sellDate: new Date('2026-08-25'),
            quantity: 4,
            sellPrice: 120,
            brokerage: 2,
            charges: 3,
            notes: '',
        };

        const investment = (service as any).calculateTradesInvestment(
            [trade],
            [sell],
            buyLots,                    // ADD 3rd arg
        );

        const remaining = 10 - 4;
        expect(investment).toBeCloseTo(remaining * averageBuyCost, 2);
    });

    it('should calculate trade current value using only the remaining quantity', () => {
        const trade = {
            _id: 'trade-1',
            userId: 'user-123',
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

        // ADD
        const buyLots = [
            { _id: 'lot-1', tradeId: 'trade-1', buyDate: trade.buyDate, buyPrice: 100, originalQuantity: 10, brokerage: 5, charges: 2 },
        ];

        const sell = {
            _id: 'sell-1',
            tradeId: 'trade-1',
            userId: 'user-123',
            sellDate: new Date('2026-08-25'),
            quantity: 4,
            sellPrice: 110,
            brokerage: 2,
            charges: 3,
            notes: '',
        };

        const currentValue = (service as any).calculateTradesCurrentValue(
            [trade],
            [sell],
            buyLots,                    // ADD 3rd arg
        );

        expect(currentValue).toBe(720);
    });

    it('should account for a fully sold trade in dashboard value', () => {
        const trade = {
            _id: 'trade-1',
            userId: 'user-123',
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

        // ADD
        const buyLots = [
            { _id: 'lot-1', tradeId: 'trade-1', buyDate: trade.buyDate, buyPrice: 100, originalQuantity: 10, brokerage: 5, charges: 2 },
        ];

        const sell = {
            _id: 'sell-1',
            tradeId: 'trade-1',
            userId: 'user-123',
            sellDate: new Date('2026-08-25'),
            quantity: 10,
            sellPrice: 120,
            brokerage: 5,
            charges: 5,
            notes: '',
        };

        const investment = (service as any).calculateTradesInvestment(
            [trade],
            [sell],
            buyLots,                    // ADD 3rd arg
        );

        const currentValue = (service as any).calculateTradesCurrentValue(
            [trade],
            [sell],
            buyLots,                    // ADD 3rd arg
        );

        expect(investment).toBe(0);
        expect(currentValue).toBe(0);
    });

    it('should associate sells with the correct trades in dashboard calculations', () => {
        const trades = [
            {
                _id: 'trade-a',
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
                notes: '',
                status: TradeStatus.PARTIALLY_SOLD,
                isActive: true,
                archivedAt: null,
            },
            {
                _id: 'trade-b',
                userId: 'user-123',
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
            },
        ];

        // ADD: one buy lot per trade
        const buyLots = [
            { _id: 'lot-a', tradeId: 'trade-a', buyDate: trades[0].buyDate, buyPrice: 100, originalQuantity: 10, brokerage: 0, charges: 0 },
            { _id: 'lot-b', tradeId: 'trade-b', buyDate: trades[1].buyDate, buyPrice: 200, originalQuantity: 20, brokerage: 0, charges: 0 },
        ];

        const sells = [
            {
                _id: 'sell-a',
                tradeId: 'trade-a',
                userId: 'user-123',
                sellDate: new Date('2026-08-25'),
                quantity: 4,
                sellPrice: 120,
                brokerage: 0,
                charges: 0,
                notes: '',
            },
            {
                _id: 'sell-b',
                tradeId: 'trade-b',
                userId: 'user-123',
                sellDate: new Date('2026-08-26'),
                quantity: 7,
                sellPrice: 220,
                brokerage: 0,
                charges: 0,
                notes: '',
            },
        ];

        const investment = (service as any).calculateTradesInvestment(
            trades,
            sells,
            buyLots,                    // ADD 3rd arg
        );

        const currentValue = (service as any).calculateTradesCurrentValue(
            trades,
            sells,
            buyLots,                    // ADD 3rd arg
        );

        expect(investment).toBe(3200);
        expect(currentValue).toBe(3580);
    });

    it('should calculate asset allocation percentages correctly', () => {
        const allocation = (service as any).getAssetAllocation({
            mutualFundsValue: 60000,
            tradesValue: 30000,
            cashOthersValue: 10000,
        });

        expect(allocation).toEqual([
            {
                label: 'Mutual Funds',
                value: 60000,
                percentage: 60,
                displayValue: '₹60,000',
            },
            {
                label: 'Trades',
                value: 30000,
                percentage: 30,
                displayValue: '₹30,000',
            },
            {
                label: 'Cash / Others',
                value: 10000,
                percentage: 10,
                displayValue: '₹10,000',
            },
        ]);
    });

    it('should return zero allocation percentages when total portfolio value is zero', () => {
        const allocation = (service as any).getAssetAllocation({
            mutualFundsValue: 0,
            tradesValue: 0,
            cashOthersValue: 0,
        });

        expect(allocation).toEqual([
            {
                label: 'Mutual Funds',
                value: 0,
                percentage: 0,
                displayValue: '₹0',
            },
            {
                label: 'Trades',
                value: 0,
                percentage: 0,
                displayValue: '₹0',
            },
            {
                label: 'Cash / Others',
                value: 0,
                percentage: 0,
                displayValue: '₹0',
            },
        ]);
    });

    it('should return recent activities sorted by latest date', () => {
        const funds = [
            {
                _id: 'fund-1',
                fundName: 'Growth Fund',
                startDate: new Date('2026-08-20'),
                createdAt: new Date('2026-08-20'),
            },
        ];

        const sipEntries = [
            {
                _id: 'sip-1',
                fundId: 'fund-1',
                amountContributed: 5000,
                month: '2026-08',
                createdAt: new Date('2026-08-24'),
            },
        ];

        const trades = [
            {
                _id: 'trade-1',
                stockSymbol: 'RELIANCE',
                buyDate: new Date('2026-08-21'),
                createdAt: new Date('2026-08-21'),
            },
        ];

        const tradeSells = [
            {
                _id: 'sell-1',
                quantity: 5,
                sellPrice: 130,
                sellDate: new Date('2026-08-25'),
                createdAt: new Date('2026-08-25'),
            },
        ];

        const result = (service as any).getRecentActivities({
            funds,
            sipEntries,
            trades,
            tradeSells,
        });

        expect(result.length).toBe(4);

        expect(result[0].type).toBe('TRADE_SELL');
        expect(result[1].type).toBe('SIP_ENTRY');
        expect(result[2].type).toBe('TRADE');
        expect(result[3].type).toBe('MUTUAL_FUND');
    });

    it('should return only the latest 5 activities', () => {
        const funds = [
            {
                _id: 'fund-1',
                fundName: 'Fund 1',
                startDate: new Date('2026-08-20'),
                createdAt: new Date('2026-08-20'),
            },
            {
                _id: 'fund-2',
                fundName: 'Fund 2',
                startDate: new Date('2026-08-21'),
                createdAt: new Date('2026-08-21'),
            },
        ];

        const sipEntries = [
            {
                _id: 'sip-1',
                fundId: 'fund-1',
                amountContributed: 5000,
                month: '2026-08',
                createdAt: new Date('2026-08-22'),
            },
            {
                _id: 'sip-2',
                fundId: 'fund-1',
                amountContributed: 6000,
                month: '2026-08',
                createdAt: new Date('2026-08-23'),
            },
        ];

        const trades = [
            {
                _id: 'trade-1',
                stockSymbol: 'RELIANCE',
                buyDate: new Date('2026-08-24'),
                createdAt: new Date('2026-08-24'),
            },
        ];

        const tradeSells = [
            {
                _id: 'sell-1',
                quantity: 5,
                sellPrice: 120,
                sellDate: new Date('2026-08-25'),
                createdAt: new Date('2026-08-25'),
            },
            {
                _id: 'sell-2',
                quantity: 2,
                sellPrice: 130,
                sellDate: new Date('2026-08-26'),
                createdAt: new Date('2026-08-26'),
            },
        ];

        const result = (service as any).getRecentActivities({
            funds,
            sipEntries,
            trades,
            tradeSells,
        });

        expect(result).toHaveLength(5);

        expect(result[0].type).toBe('TRADE_SELL');
        expect(result[1].type).toBe('TRADE_SELL');
        expect(result[2].type).toBe('TRADE');
        expect(result[3].type).toBe('SIP_ENTRY');
        expect(result[4].type).toBe('SIP_ENTRY');
    });

    it('should calculate percentage and trend correctly for positive profit', () => {
        const percentage = (service as any).calculatePercentage(
            2000,
            10000,
        );

        const trend = (service as any).getTrend(2000);

        expect(percentage).toBe(20);
        expect(trend).toBe('positive');
    });

    it('should return negative trend for negative profit', () => {
        const percentage = (service as any).calculatePercentage(
            -1000,
            10000,
        );

        const trend = (service as any).getTrend(-1000);

        expect(percentage).toBe(-10);
        expect(trend).toBe('negative');
    });

    it('should return neutral trend when profit is zero', () => {
        const percentage = (service as any).calculatePercentage(
            0,
            10000,
        );

        const trend = (service as any).getTrend(0);

        expect(percentage).toBe(0);
        expect(trend).toBe('neutral');
    });

    it('should return zero percentage when investment is zero', () => {
        const percentage = (service as any).calculatePercentage(
            100,
            0,
        );

        expect(percentage).toBe(0);
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
            -1000,
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

    it('should use updatedAt when createdAt is not available', () => {
        const updatedAt = new Date('2026-08-20');
        const fallbackDate = new Date('2026-08-10');

        const document = {
            updatedAt,
        };

        const result = (service as any).getDocumentDate(
            document,
            fallbackDate,
        );

        expect(result).toBe(updatedAt);
    });

    it('should use fallback date when createdAt and updatedAt are missing', () => {
        const fallbackDate = new Date('2026-08-10');

        const document = {};

        const result = (service as any).getDocumentDate(
            document,
            fallbackDate,
        );

        expect(result).toBe(fallbackDate);
    });

    it('should use buy price when current price is not available', () => {
        const trade = {
            _id: 'trade-1',
            userId: 'user-123',
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

        // ADD
        const buyLots = [
            { _id: 'lot-1', tradeId: 'trade-1', buyDate: trade.buyDate, buyPrice: 100, originalQuantity: 10, brokerage: 5, charges: 2 },
        ];

        const currentValue = (service as any).calculateTradesCurrentValue(
            [trade],
            [],
            buyLots,                    // ADD 3rd arg
        );

        expect(currentValue).toBe(1000);
    });

    // it('should calculate investment using average buy cost for a positive quantity', () => {
    //     const trade = {
    //         _id: 'trade-1',
    //         userId: 'user-123',
    //         stockSymbol: 'RELIANCE',
    //         companyName: 'Reliance Industries',
    //         buyDate: new Date('2026-08-20'),
    //         buyPrice: 100,
    //         quantity: 10,
    //         brokerage: 5,
    //         charges: 5,
    //         currentPrice: 120,
    //         targetPrice: 150,
    //         stopLoss: 90,
    //         notes: '',
    //         status: TradeStatus.OPEN,
    //         isActive: true,
    //         archivedAt: null,
    //     };

    //     const investment = (service as any).calculateTradesInvestment(
    //         [trade],
    //         [],
    //     );

    //     expect(investment).toBe(1010);
    // });

    it('should calculate investment using average buy cost for a positive quantity', () => {
        const trade = {
            _id: 'trade-1',
            userId: 'user-123',
            stockSymbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            buyDate: new Date('2026-08-20'),
            buyPrice: 101, // (1000 + 5 + 5)/10 = 101
            quantity: 10,
            brokerage: 5,
            charges: 5,
            currentPrice: 120,
            targetPrice: 150,
            stopLoss: 90,
            notes: '',
            status: TradeStatus.OPEN,
            isActive: true,
            archivedAt: null,
        };

        // ADD: raw price, not the pre-computed inclusive average
        const buyLots = [
            { _id: 'lot-1', tradeId: 'trade-1', buyDate: trade.buyDate, buyPrice: 100, originalQuantity: 10, brokerage: 5, charges: 5 },
        ];

        const investment = (service as any).calculateTradesInvestment(
            [trade],
            [],
            buyLots,                    // ADD 3rd arg
        );

        expect(investment).toBe(1010);
    });
});
