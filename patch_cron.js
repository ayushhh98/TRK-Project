const fs = require('fs');
const path = './backend/src/services/cron.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Game required
if (!content.includes("const Game = require('../models/Game');")) {
    content = content.replace("const User = require('../models/User');", "const User = require('../models/User');\nconst Game = require('../models/Game');");
}

// 2. Add Practice Game Resolution logic before final module.exports
const practiceLogic = `        // 4. PRACTICE GAME RESOLUTION (Runs every 1 hour alongside Lucky Draw)
        console.log("🎲 Resolving Pending Practice Games...");
        try {
            const pendingGames = await Game.find({ gameType: 'practice', status: 'pending' }).populate('user');
            
            if (pendingGames.length > 0) {
                // Generate the global lucky numbers for each variant
                const luckyNumbers = {
                    guess: Math.floor(Math.random() * 10), // 0-9
                    dice: Math.floor(Math.random() * 8) + 1, // 1-8
                    spin: Math.floor(Math.random() * 8) + 1 // 1-8
                };
                
                console.log(\`Global Practice Draw: Guess[\${luckyNumbers.guess}], Dice[\${luckyNumbers.dice}], Spin[\${luckyNumbers.spin}]\`);

                const userUpdates = {}; // Map of user._id -> user document
                
                for (const game of pendingGames) {
                    if (!game.user) continue;

                    let isWin = false;
                    let luckyNumber = 'Simulated';
                    let multiplier = 8; // Default Practice Multiplier

                    if (game.gameVariant === 'guess') {
                        luckyNumber = luckyNumbers.guess;
                        isWin = game.pickedNumber === luckyNumber;
                    } else if (game.gameVariant === 'dice') {
                         luckyNumber = luckyNumbers.dice;
                         isWin = game.pickedNumber === luckyNumber;
                    } else if (game.gameVariant === 'spin') {
                         luckyNumber = luckyNumbers.spin;
                         isWin = game.pickedNumber === luckyNumber;
                    } else {
                         // Fallback
                         luckyNumber = Math.floor(Math.random() * 10);
                         isWin = game.pickedNumber === luckyNumber;
                    }

                    const payout = isWin ? game.betAmount * multiplier : 0;
                    
                    game.isWin = isWin;
                    game.luckyNumber = luckyNumber;
                    game.payout = payout;
                    game.multiplier = multiplier;
                    game.status = 'resolved';
                    game.resolvedAt = new Date();
                    
                    await game.save();

                    const userId = game.user._id.toString();

                    if (isWin) {
                        if (!userUpdates[userId]) {
                             userUpdates[userId] = await User.findById(userId);
                        }
                        if (userUpdates[userId]) {
                            userUpdates[userId].practiceBalance = (userUpdates[userId].practiceBalance || 0) + payout;
                            userUpdates[userId].gamesWon = (userUpdates[userId].gamesWon || 0) + 1;
                            userUpdates[userId].totalWinnings = (userUpdates[userId].totalWinnings || 0) + (payout - game.betAmount);
                        }
                    }
                    
                    if (typeof io !== 'undefined' && io) {
                        const currentBalance = userUpdates[userId] 
                            ? userUpdates[userId].practiceBalance 
                            : game.user.practiceBalance;

                        io.to(userId).emit('game_result', {
                            isWin,
                            payout,
                            luckyNumber,
                            gameType: 'practice',
                            gameVariant: game.gameVariant,
                            newBalance: currentBalance,
                            status: 'resolved',
                            pickedNumber: game.pickedNumber
                        });
                    }
                }
                
                // Save all batch-updated users
                let resolvedUsersCount = 0;
                for (const userId in userUpdates) {
                    if (userUpdates[userId]) {
                        await userUpdates[userId].save();
                        resolvedUsersCount++;
                    }
                }

                console.log(\`Successfully resolved \${pendingGames.length} practice games.\`);
            }
        } catch (error) {
            console.error("Practice Game Resolution Error:", error);
        }
    });
};`;

// replace the end of the file
content = content.replace(/\s*\}\);\s*\}\;\s*module\.exports = \{ startCronJobs \};\s*$/, '\n' + practiceLogic + '\n\nmodule.exports = { startCronJobs };\n');

fs.writeFileSync(path, content, 'utf8');
console.log('cron.js patched successfully');
