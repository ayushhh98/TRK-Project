const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
const backendEnvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(backendEnvPath)) {
    require('dotenv').config({ path: backendEnvPath });
} else {
    require('dotenv').config();
}

const GuessRound = require('../src/models/GuessRound');

const resetRounds = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trk-project');
        console.log('Connected.');

        console.log('Clearing GuessRound collection...');
        const result = await GuessRound.deleteMany({});
        console.log(`Successfully cleared ${result.deletedCount} rounds.`);

        console.log('Reset complete. The next round will start from #1.');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting rounds:', error);
        process.exit(1);
    }
};

resetRounds();
