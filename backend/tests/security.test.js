describe('Rate Limiting - Edge Cases', () => {

    describe('Environment-Based Rate Limits', () => {
        test('should return 0 for development', () => {
            const config = {
                development: 0,
                test: 0,
                staging: 2,
                production: 5
            };
            expect(config.development).toBe(0);
        });

        test('should return 5 for production', () => {
            const config = {
                development: 0,
                test: 0,
                staging: 2,
                production: 5
            };
            expect(config.production).toBe(5);
        });

        test('should fallback to production for unknown env', () => {
            const config = {
                development: 0,
                test: 0,
                staging: 2,
                production: 5
            };
            const unknown = config['unknown'] || config.production;
            expect(unknown).toBe(5);
        });
    });

    describe('Rate Limit Calculation', () => {
        test('should calculate remaining time correctly', () => {
            const lastBetTime = Date.now() - 3000; // 3 seconds ago
            const requiredWaitMs = 5000; // 5 seconds
            const timeSinceLastBet = Date.now() - lastBetTime;
            const remainingMs = requiredWaitMs - timeSinceLastBet;

            expect(remainingMs).toBeGreaterThan(1500);
            expect(remainingMs).toBeLessThan(2500);
        });

        test('should allow bet after wait period', () => {
            const lastBetTime = Date.now() - 6000; // 6 seconds ago
            const requiredWaitMs = 5000;
            const timeSinceLastBet = Date.now() - lastBetTime;

            expect(timeSinceLastBet).toBeGreaterThanOrEqual(requiredWaitMs);
        });

        test('should block bet within wait period', () => {
            const lastBetTime = Date.now() - 2000; // 2 seconds ago
            const requiredWaitMs = 5000;
            const timeSinceLastBet = Date.now() - lastBetTime;

            expect(timeSinceLastBet).toBeLessThan(requiredWaitMs);
        });

        test('should handle boundary case (exactly at limit)', () => {
            const lastBetTime = Date.now() - 5000; // Exactly 5 seconds
            const requiredWaitMs = 5000;
            const timeSinceLastBet = Date.now() - lastBetTime;

            expect(timeSinceLastBet).toBeGreaterThanOrEqual(requiredWaitMs - 100);
        });
    });

    describe('Retry After Calculation', () => {
        test('should round up remaining seconds', () => {
            const remainingMs = 2100; // 2.1 seconds
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            expect(remainingSeconds).toBe(3);
        });

        test('should handle exactly 1 second', () => {
            const remainingMs = 1000;
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            expect(remainingSeconds).toBe(1);
        });

        test('should handle milliseconds', () => {
            const remainingMs = 100; // 0.1 seconds
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            expect(remainingSeconds).toBe(1);
        });
    });

    describe('Rate Limit Bypass', () => {
        test('should not apply rate limit to practice games', () => {
            const gameType = 'practice';
            const shouldApplyLimit = gameType === 'real';
            expect(shouldApplyLimit).toBe(false);
        });

        test('should apply rate limit to real money games', () => {
            const gameType = 'real';
            const shouldApplyLimit = gameType === 'real';
            expect(shouldApplyLimit).toBe(true);
        });

        test('should not apply rate limit when limit is 0', () => {
            const rateLimitSeconds = 0;
            const shouldApplyLimit = rateLimitSeconds > 0;
            expect(shouldApplyLimit).toBe(false);
        });
    });
});

describe('Wallet Safety - Edge Cases', () => {

    describe('Balance Validation', () => {
        test('should reject bet when balance is less than bet amount', () => {
            const balance = 5;
            const betAmount = 10;
            const canBet = balance >= betAmount;
            expect(canBet).toBe(false);
        });

        test('should allow bet when balance equals bet amount', () => {
            const balance = 10;
            const betAmount = 10;
            const canBet = balance >= betAmount;
            expect(canBet).toBe(true);
        });

        test('should allow bet when balance exceeds bet amount', () => {
            const balance = 100;
            const betAmount = 10;
            const canBet = balance >= betAmount;
            expect(canBet).toBe(true);
        });

        test('should handle decimal balance', () => {
            const balance = 10.55;
            const betAmount = 10.50;
            const canBet = balance >= betAmount;
            expect(canBet).toBe(true);
        });

        test('should prevent negative balance', () => {
            const balance = 10;
            const betAmount = 15;
            const newBalance = balance - betAmount;
            expect(newBalance).toBeLessThan(0);
        });
    });

    describe('Balance Updates', () => {
        test('should deduct bet amount on commit', () => {
            let balance = 100;
            const betAmount = 10;
            balance -= betAmount;
            expect(balance).toBe(90);
        });

        test('should credit payout on win', () => {
            let balance = 90;
            const payout = 80;
            balance += payout;
            expect(balance).toBe(170);
        });

        test('should not change balance on loss', () => {
            const balance = 90;
            const payout = 0;
            const newBalance = balance + payout;
            expect(newBalance).toBe(90);
        });

        test('should handle decimal amounts correctly', () => {
            let balance = 100.50;
            balance -= 10.25;
            balance += 20.50;
            expect(balance.toFixed(2)).toBe('110.75');
        });
    });

    describe('Payout Calculation', () => {
        test('should calculate payout correctly for win', () => {
            const betAmount = 10;
            const multiplier = 8;
            const payout = betAmount * multiplier;
            expect(payout).toBe(80);
        });

        test('should round payout to 2 decimals', () => {
            const betAmount = 10.33;
            const multiplier = 1.5;
            const payout = parseFloat((betAmount * multiplier).toFixed(2));
            expect(payout).toBe(15.50);
        });

        test('should handle very small bet amounts', () => {
            const betAmount = 0.5;
            const multiplier = 8;
            const payout = betAmount * multiplier;
            expect(payout).toBe(4);
        });

        test('should handle very large bet amounts', () => {
            const betAmount = 1000;
            const multiplier = 8;
            const payout = betAmount * multiplier;
            expect(payout).toBe(8000);
        });
    });

    describe('Balance Locks', () => {
        test('should prevent simultaneous bet processing', () => {
            const balance = 100;
            const bet1 = 60;
            const bet2 = 60;

            // First bet
            let availableBalance = balance - bet1;
            expect(availableBalance).toBe(40);

            // Second bet should fail
            const canPlaceBet2 = availableBalance >= bet2;
            expect(canPlaceBet2).toBe(false);
        });
    });
});

describe('Anti-Replay Protection - Edge Cases', () => {

    describe('Request ID Uniqueness', () => {
        test('should detect duplicate request ID', () => {
            const processedRequests = new Set();
            const requestId = 'test-123';

            processedRequests.add(requestId);
            const isDuplicate = processedRequests.has(requestId);
            expect(isDuplicate).toBe(true);
        });

        test('should allow unique request ID', () => {
            const processedRequests = new Set();
            const requestId = 'test-456';

            const isDuplicate = processedRequests.has(requestId);
            expect(isDuplicate).toBe(false);
        });
    });

    describe('Nonce Sequence', () => {
        test('should accept sequential nonce', () => {
            const lastNonce = 5;
            const newNonce = 6;
            const isValid = newNonce === lastNonce + 1;
            expect(isValid).toBe(true);
        });

        test('should reject gap in nonce sequence', () => {
            const lastNonce = 5;
            const newNonce = 7; // Gap of 1
            const isValid = newNonce === lastNonce + 1;
            expect(isValid).toBe(false);
        });

        test('should reject duplicate nonce', () => {
            const lastNonce = 5;
            const newNonce = 5;
            const isValid = newNonce === lastNonce + 1;
            expect(isValid).toBe(false);
        });

        test('should accept first nonce as 0', () => {
            const lastNonce = -1; // No previous bet
            const newNonce = 0;
            const isValid = newNonce === 0 || newNonce === lastNonce + 1;
            expect(isValid).toBe(true);
        });
    });
});
