const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trk-blockchain';
        console.log(`🔌 Attempting to connect to MongoDB...`);
        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Ensure unique index on walletAddress allows multiple nulls (partial index)
        try {
            const usersCollection = conn.connection.db.collection('users');
            const indexes = await usersCollection.indexes();
            const walletIndex = indexes.find((idx) => idx.name === 'walletAddress_1');

            const isPartial = walletIndex?.partialFilterExpression?.walletAddress;
            const isSparse = walletIndex?.sparse === true;

            if (walletIndex && !isSparse && !isPartial) {
                console.warn('Rebuilding walletAddress index to allow nulls...');
                await usersCollection.dropIndex('walletAddress_1');
                await usersCollection.createIndex(
                    { walletAddress: 1 },
                    { unique: true, partialFilterExpression: { walletAddress: { $type: 'string' } } }
                );
                console.log('walletAddress index rebuilt with partial filter');
            }
        } catch (indexError) {
            console.error('Index check/rebuild failed:', indexError.message || indexError);
        }
    } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        // Don't exit in development - allow server to run without DB
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

module.exports = connectDB;
