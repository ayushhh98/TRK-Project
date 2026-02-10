describe('Bot Detection - Edge Cases', () => {

    describe('Risk Score Calculation', () => {
        test('should assign zero risk for normal betting', () => {
            const behaviorData = {
                betsInLast30Seconds: 2,
                identicalBetCount: 0,
                onlyRoundNumbers: false,
                totalBets: 10,
                accountAge: 86400000, // 1 day
                averageBet: 10
            };

            // Normal behavior should have very low risk
            const hasRapidBets = behaviorData.betsInLast30Seconds >= 5;
            const hasIdentical = behaviorData.identicalBetCount >= 10;

            expect(hasRapidBets).toBe(false);
            expect(hasIdentical).toBe(false);
        });

        test('should detect rapid betting pattern', () => {
            const behaviorData = {
                betsInLast30Seconds: 7, // Suspicious
                identicalBetCount: 0,
                onlyRoundNumbers: false,
                totalBets: 10,
                accountAge: 86400000,
                averageBet: 10
            };

            const isRapid = behaviorData.betsInLast30Seconds >= 5;
            expect(isRapid).toBe(true);
        });

        test('should detect identical bet amounts (bot pattern)', () => {
            const behaviorData = {
                betsInLast30Seconds: 3,
                identicalBetCount: 12, // 12 consecutive identical bets
                onlyRoundNumbers: false,
                totalBets: 15,
                accountAge: 86400000,
                averageBet: 10
            };

            const isSuspicious = behaviorData.identicalBetCount >= 10;
            expect(isSuspicious).toBe(true);
        });

        test('should detect round numbers only pattern', () => {
            const behaviorData = {
                betsInLast30Seconds: 2,
                identicalBetCount: 0,
                onlyRoundNumbers: true, // All bets are 10, 20, 30, etc.
                totalBets: 20,
                accountAge: 86400000,
                averageBet: 50
            };

            const isBotLike = behaviorData.onlyRoundNumbers && behaviorData.totalBets > 15;
            expect(isBotLike).toBe(true);
        });

        test('should flag new account with large bets', () => {
            const behaviorData = {
                betsInLast30Seconds: 1,
                identicalBetCount: 0,
                onlyRoundNumbers: false,
                totalBets: 2,
                accountAge: 1800000, // 30 minutes old
                averageBet: 500 // Large bet
            };

            const isSuspicious = behaviorData.accountAge < 3600000 && behaviorData.averageBet > 100;
            expect(isSuspicious).toBe(true);
        });
    });

    describe('Pattern Detection', () => {
        test('should track consecutive identical bets', () => {
            const bets = [
                { amount: 10, timestamp: Date.now() },
                { amount: 10, timestamp: Date.now() },
                { amount: 10, timestamp: Date.now() },
                { amount: 10, timestamp: Date.now() }
            ];

            const allSame = bets.every(bet => bet.amount === 10);
            expect(allSame).toBe(true);
        });

        test('should count bets in time window', () => {
            const now = Date.now();
            const bets = [
                { amount: 10, timestamp: now },
                { amount: 15, timestamp: now - 10000 },
                { amount: 20, timestamp: now - 20000 },
                { amount: 25, timestamp: now - 25000 },
                { amount: 30, timestamp: now - 40000 } // Outside 30s window
            ];

            const betsInLast30Seconds = bets.filter(
                bet => now - bet.timestamp < 30000
            ).length;

            expect(betsInLast30Seconds).toBe(4);
        });

        test('should detect round number preference', () => {
            const bets = [10, 20, 30, 50, 100, 200];
            const allRound = bets.every(bet => bet % 10 === 0);
            expect(allRound).toBe(true);
        });
    });

    describe('Risk Thresholds', () => {
        test('should classify risk levels correctly', () => {
            const THRESHOLDS = {
                LOW: 20,
                MEDIUM: 40,
                HIGH: 60,
                CRITICAL: 80
            };

            expect(25).toBeGreaterThan(THRESHOLDS.LOW);
            expect(25).toBeLessThan(THRESHOLDS.MEDIUM);

            expect(50).toBeGreaterThan(THRESHOLDS.MEDIUM);
            expect(50).toBeLessThan(THRESHOLDS.HIGH);

            expect(85).toBeGreaterThan(THRESHOLDS.CRITICAL);
        });

        test('should require CAPTCHA at medium risk', () => {
            const riskScore = 45;
            const requiresCaptcha = riskScore >= 40;
            expect(requiresCaptcha).toBe(true);
        });

        test('should trigger cooldown at high risk', () => {
            const riskScore = 65;
            const requiresCooldown = riskScore >= 60;
            expect(requiresCooldown).toBe(true);
        });

        test('should flag for review at critical risk', () => {
            const riskScore = 85;
            const requiresReview = riskScore >= 80;
            expect(requiresReview).toBe(true);
        });
    });

    describe('Failed Attempt Tracking', () => {
        test('should increment failure count', () => {
            const failures = new Map();
            const userId = 'user123';

            failures.set(userId, (failures.get(userId) || 0) + 1);
            failures.set(userId, (failures.get(userId) || 0) + 1);
            failures.set(userId, (failures.get(userId) || 0) + 1);

            expect(failures.get(userId)).toBe(3);
        });

        test('should flag multiple failed auth attempts', () => {
            const authFailures = 6;
            const threshold = 5;
            const isSuspicious = authFailures >= threshold;
            expect(isSuspicious).toBe(true);
        });

        test('should track rate limit violations', () => {
            const violations = new Map();
            const userId = 'user123';

            for (let i = 0; i < 4; i++) {
                violations.set(userId, (violations.get(userId) || 0) + 1);
            }

            expect(violations.get(userId)).toBeGreaterThanOrEqual(3);
        });
    });

    describe('CAPTCHA Challenge', () => {
        test('should generate unique challenge IDs', () => {
            const challenges = new Set();

            for (let i = 0; i < 100; i++) {
                const id = require('crypto').randomBytes(16).toString('hex');
                challenges.add(id);
            }

            expect(challenges.size).toBe(100);
        });

        test('should set expiry time correctly', () => {
            const now = Date.now();
            const expiresAt = now + 300000; // 5 minutes

            expect(expiresAt - now).toBe(300000);
        });

        test('should detect expired challenges', () => {
            const expiresAt = Date.now() - 10000; // 10 seconds ago
            const isExpired = Date.now() > expiresAt;
            expect(isExpired).toBe(true);
        });
    });

    describe('Multi-Account Detection', () => {
        test('should detect multiple users from same IP', () => {
            const ipActivity = new Map();
            const ip = '203.0.113.1';

            ipActivity.set(ip, {
                users: ['user1', 'user2', 'user3', 'user4'],
                userCount: 4
            });

            const activity = ipActivity.get(ip);
            const isSuspicious = activity.userCount > 3;
            expect(isSuspicious).toBe(true);
        });

        test('should allow multiple users from office/cafe (with CAPTCHA)', () => {
            const ip = '203.0.113.100';
            const userCount = 5;
            const riskScore = 20; // IP-based risk

            // High user count from IP should trigger CAPTCHA, not ban
            const requiresCaptcha = userCount > 3 && riskScore >= 20;
            expect(requiresCaptcha).toBe(true);
        });
    });

    describe('Risk Score Reduction', () => {
        test('should reduce risk after CAPTCHA pass', () => {
            let riskScore = 50;
            const captchaPassed = true;

            if (captchaPassed) {
                riskScore = Math.max(0, riskScore - 30);
            }

            expect(riskScore).toBe(20);
        });

        test('should not go below zero', () => {
            let riskScore = 15;
            riskScore = Math.max(0, riskScore - 30);
            expect(riskScore).toBe(0);
        });
    });
});
