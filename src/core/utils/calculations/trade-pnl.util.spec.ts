import { TradeStatus } from '../../enums/trade-status.enum';
import {
    calculateTradePnl,
    TradePnlInput,
} from './trade-pnl.util';

describe('calculateTradePnl', () => {
    it('should calculate pending trade PnL when nothing is sold', () => {
        const input: TradePnlInput = {
            buyLots: [
                {
                    price: 100,
                    quantity: 10,
                },
            ],
            sellLots: [],
            lastKnownPrice: 120,
        };

        const result = calculateTradePnl(input);

        expect(result).toEqual({
            totalBoughtQty: 10,
            totalSoldQty: 0,
            remainingQuantity: 10,
            averageBuyPrice: 100,
            realisedPnl: 0,
            unrealisedPnl: 200,
            totalPnl: 200,
            status: TradeStatus.PENDING,
        });
    });

    it('should calculate realised and unrealised PnL for a partially exited trade', () => {
        const input: TradePnlInput = {
            buyLots: [
                {
                    price: 100,
                    quantity: 10,
                },
            ],
            sellLots: [
                {
                    price: 130,
                    quantity: 4,
                },
            ],
            lastKnownPrice: 120,
        };

        const result = calculateTradePnl(input);

        expect(result.totalBoughtQty).toBe(10);
        expect(result.totalSoldQty).toBe(4);
        expect(result.remainingQuantity).toBe(6);
        expect(result.averageBuyPrice).toBe(100);

        expect(result.realisedPnl).toBe(120);
        expect(result.unrealisedPnl).toBe(120);
        expect(result.totalPnl).toBe(240);

        expect(result.status).toBe(
            TradeStatus.PARTIALLY_EXITED,
        );
    });

    it('should calculate PnL for a completely closed trade', () => {
        const input: TradePnlInput = {
            buyLots: [
                {
                    price: 100,
                    quantity: 10,
                },
            ],
            sellLots: [
                {
                    price: 130,
                    quantity: 10,
                },
            ],
            lastKnownPrice: 120,
        };

        const result = calculateTradePnl(input);

        expect(result.totalBoughtQty).toBe(10);
        expect(result.totalSoldQty).toBe(10);
        expect(result.remainingQuantity).toBe(0);
        expect(result.averageBuyPrice).toBe(100);

        expect(result.realisedPnl).toBe(300);
        expect(result.unrealisedPnl).toBe(0);
        expect(result.totalPnl).toBe(300);

        expect(result.status).toBe(
            TradeStatus.CLOSED,
        );
    });

    it('should calculate weighted average buy price from multiple buy lots', () => {
        const input: TradePnlInput = {
            buyLots: [
                {
                    price: 100,
                    quantity: 10,
                },
                {
                    price: 120,
                    quantity: 5,
                },
            ],
            sellLots: [
                {
                    price: 130,
                    quantity: 5,
                },
            ],
            lastKnownPrice: 140,
        };

        const result = calculateTradePnl(input);

        expect(result.totalBoughtQty).toBe(15);

        expect(result.averageBuyPrice).toBeCloseTo(
            106.6666667,
            5,
        );

        expect(result.totalSoldQty).toBe(5);
        expect(result.remainingQuantity).toBe(10);

        expect(result.realisedPnl).toBeCloseTo(
            116.6666667,
            5,
        );

        expect(result.unrealisedPnl).toBeCloseTo(
            333.3333333,
            5,
        );

        expect(result.totalPnl).toBeCloseTo(
            450,
            5,
        );

        expect(result.status).toBe(
            TradeStatus.PARTIALLY_EXITED,
        );
    });

    it('should return zero average buy price and zero PnL when there are no buy lots', () => {
        const input: TradePnlInput = {
            buyLots: [],
            sellLots: [],
            lastKnownPrice: 100,
        };

        const result = calculateTradePnl(input);

        expect(result.totalBoughtQty).toBe(0);
        expect(result.totalSoldQty).toBe(0);
        expect(result.remainingQuantity).toBe(0);
        expect(result.averageBuyPrice).toBe(0);
        expect(result.realisedPnl).toBe(0);
        expect(result.unrealisedPnl).toBe(0);
        expect(result.totalPnl).toBe(0);
        expect(result.status).toBe(
            TradeStatus.PENDING,
        );
    });

    it('should return zero unrealised PnL when last known price is unavailable', () => {
        const input: TradePnlInput = {
            buyLots: [
                {
                    price: 100,
                    quantity: 10,
                },
            ],
            sellLots: [],
            lastKnownPrice: null,
        };

        const result = calculateTradePnl(input);

        expect(result.averageBuyPrice).toBe(100);
        expect(result.remainingQuantity).toBe(10);
        expect(result.realisedPnl).toBe(0);
        expect(result.unrealisedPnl).toBe(0);
        expect(result.totalPnl).toBe(0);
        expect(result.status).toBe(
            TradeStatus.PENDING,
        );
    });
});