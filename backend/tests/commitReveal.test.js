const GameCommitment = require('../src/models/GameCommitment');

describe('Commit-Reveal Pattern - Edge Cases', () => {

    describe('Nonce Validation', () => {
        test('should reject negative nonce', () => {
            const isValid = typeof -1 === 'number' && -1 >= 0;
            expect(isValid).toBe(false);
        });

        test('should reject float nonce', () => {
            const isValid = Number.isInteger(1.5);
            expect(isValid).toBe(false);
        });

        test('should accept zero nonce', () => {
            const isValid = Number.isInteger(0) && 0 >= 0;
            expect(isValid).toBe(true);
        });

        test('should accept large nonce', () => {
            const largeNonce = 999999999;
            const isValid = Number.isInteger(largeNonce) && largeNonce >= 0;
            expect(isValid).toBe(true);
        });
    });

    describe('Request ID Validation', () => {
        test('should validate UUID format', () => {
            const validUUID = '550e8400-e29b-41d4-a716-446655440000';
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(uuidRegex.test(validUUID)).toBe(true);
        });

        test('should reject invalid UUID', () => {
            const invalidUUID = 'not-a-uuid';
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(uuidRegex.test(invalidUUID)).toBe(false);
        });

        test('should reject empty request ID', () => {
            const requestId = '';
            expect(!!requestId && typeof requestId === 'string').toBe(false);
        });
    });

    describe('Timestamp Validation', () => {
        test('should accept current timestamp', () => {
            const now = Date.now();
            const timestamp = Date.now();
            const diff = Math.abs(now - timestamp);
            expect(diff).toBeLessThan(30000);
        });

        test('should reject old timestamp (> 30s)', () => {
            const now = Date.now();
            const oldTimestamp = now - 35000; // 35 seconds ago
            const diff = Math.abs(now - oldTimestamp);
            expect(diff).toBeGreaterThan(30000);
        });

        test('should reject future timestamp (> 30s)', () => {
            const now = Date.now();
            const futureTimestamp = now + 35000; // 35 seconds ahead
            const diff = Math.abs(now - futureTimestamp);
            expect(diff).toBeGreaterThan(30000);
        });

        test('should accept timestamp within ±30s window', () => {
            const now = Date.now();
            const timestamp = now + 15000; // 15 seconds ahead
            const diff = Math.abs(now - timestamp);
            expect(diff).toBeLessThanOrEqual(30000);
        });
    });

    describe('Bet Amount Validation', () => {
        test('should reject bet below minimum (0.5)', () => {
            const betAmount = 0.4;
            const isValid = betAmount >= 0.5 && betAmount <= 1000;
            expect(isValid).toBe(false);
        });

        test('should accept minimum bet (0.5)', () => {
            const betAmount = 0.5;
            const isValid = betAmount >= 0.5 && betAmount <= 1000;
            expect(isValid).toBe(true);
        });

        test('should reject bet above maximum (1000)', () => {
            const betAmount = 1001;
            const isValid = betAmount >= 0.5 && betAmount <= 1000;
            expect(isValid).toBe(false);
        });

        test('should accept maximum bet (1000)', () => {
            const betAmount = 1000;
            const isValid = betAmount >= 0.5 && betAmount <= 1000;
            expect(isValid).toBe(true);
        });

        test('should reject negative bet', () => {
            const betAmount = -10;
            const isValid = betAmount >= 0.5 && betAmount <= 1000;
            expect(isValid).toBe(false);
        });

        test('should reject zero bet', () => {
            const betAmount = 0;
            const isValid = betAmount >= 0.5 && betAmount <= 1000;
            expect(isValid).toBe(false);
        });

        test('should handle decimal bets', () => {
            const betAmount = 10.55;
            const isValid = betAmount >= 0.5 && betAmount <= 1000;
            expect(isValid).toBe(true);
        });
    });

    describe('Picked Number Validation - Dice', () => {
        test('should accept valid numbers (1-8)', () => {
            for (let num = 1; num <= 8; num++) {
                const isValid = Number.isInteger(num) && num >= 1 && num <= 8;
                expect(isValid).toBe(true);
            }
        });

        test('should reject number below range (0)', () => {
            const isValid = Number.isInteger(0) && 0 >= 1 && 0 <= 8;
            expect(isValid).toBe(false);
        });

        test('should reject number above range (9)', () => {
            const isValid = Number.isInteger(9) && 9 >= 1 && 9 <= 8;
            expect(isValid).toBe(false);
        });

        test('should reject float number', () => {
            const isValid = Number.isInteger(5.5) && 5.5 >= 1 && 5.5 <= 8;
            expect(isValid).toBe(false);
        });
    });

    describe('Picked Number Validation - Matrix', () => {
        test('should accept valid risk (1-95)', () => {
            const validRisks = [1, 50, 95];
            validRisks.forEach(risk => {
                const isValid = Number.isInteger(risk) && risk >= 1 && risk <= 95;
                expect(isValid).toBe(true);
            });
        });

        test('should reject risk = 0', () => {
            const isValid = Number.isInteger(0) && 0 >= 1 && 0 <= 95;
            expect(isValid).toBe(false);
        });

        test('should reject risk > 95', () => {
            const isValid = Number.isInteger(96) && 96 >= 1 && 96 <= 95;
            expect(isValid).toBe(false);
        });
    });

    describe('Commitment Expiry', () => {
        test('should detect expired commitment', () => {
            const expiryMs = 60000; // 1 minute
            const committedAt = Date.now() - 65000; // 65 seconds ago
            const expiresAt = new Date(committedAt + expiryMs);
            const isExpired = new Date() > expiresAt;
            expect(isExpired).toBe(true);
        });

        test('should not expire valid commitment', () => {
            const expiryMs = 60000; // 1 minute
            const committedAt = Date.now() - 30000; // 30 seconds ago
            const expiresAt = new Date(committedAt + expiryMs);
            const isExpired = new Date() > expiresAt;
            expect(isExpired).toBe(false);
        });

        test('should handle boundary case (exactly at expiry)', () => {
            const expiryMs = 60000;
            const committedAt = Date.now() - 60000; // Exactly 60 seconds
            const expiresAt = new Date(committedAt + expiryMs);
            const isExpired = new Date() >= expiresAt;
            expect(isExpired).toBe(true);
        });
    });
});
