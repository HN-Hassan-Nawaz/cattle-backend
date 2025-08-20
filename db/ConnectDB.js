import mongoose from 'mongoose';

const ConnectDB = async () => {
    const { MONGODB_URI, DB_NAME } = process.env;

    if (!MONGODB_URI) throw new Error('MONGODB_URI is missing in .env');
    if (!DB_NAME) throw new Error('DB_NAME is missing in .env');

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });

    mongoose.connection.on('connected', () => {
        console.log(`✅ MongoDB connected (db: ${DB_NAME})`);
    });
    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
    });
};

export default ConnectDB;

// Optional: graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
});