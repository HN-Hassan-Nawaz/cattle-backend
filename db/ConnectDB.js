// backend/db/ConnectDB.js
import mongoose from 'mongoose';

let cached = global.mongooseConn;
if (!cached) cached = global.mongooseConn = { conn: null, promise: null };

export default async function ConnectDB() {
    if (cached.conn) return cached.conn;

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');

    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            dbName: process.env.MONGODB_DB || undefined,
            bufferCommands: false,
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 5000
        }).then(m => m.connection);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}