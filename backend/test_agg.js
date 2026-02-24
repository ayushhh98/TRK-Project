const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('./src/models/User');

async function test() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Running aggregation...');
        const statsDataAgg = await User.aggregate([
            {
                $project: {
                    deposits: { $ifNull: ['$activation.totalDeposited', 0] },
                    withdraws: {
                        $reduce: {
                            input: { $ifNull: ['$withdrawals', []] },
                            initialValue: 0,
                            in: { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] }
                        }
                    },
                    club: { $ifNull: ['$realBalances.club', 0] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalDeposited: { $sum: '$deposits' },
                    totalWithdrawn: { $sum: '$withdraws' },
                    totalClubAllocated: { $sum: '$club' }
                }
            }
        ]);

        console.log('Result:', JSON.stringify(statsDataAgg, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('FAILED:', err);
        process.exit(1);
    }
}

test();
