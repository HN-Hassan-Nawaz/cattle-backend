// server/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ConnectDB from './db/ConnectDB.js';

const app = express();

// CORS: allow Expo Web origins (adjust if your web runs on a different port)
app.use(cors({
    origin: [
        'http://localhost:8081',
        'http://127.0.0.1:8081',
        // keep old Expo web port as a fallback
        'http://localhost:19006',
        'http://127.0.0.1:19006',
        'http://192.168.0.103:8081',
        'http://10.10.3.151:8000'
    ],



    credentials: false, // set true only if you use cookies
}));

// Body parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));




import UserRoutes from './routes/UserRoutes.js';
import cattleRoutes from './routes/CattleRoutes.js'
import milkRoutes from './routes/MilkRoutes.js';



// Routes
app.use('/api/users', UserRoutes);
app.use('/api/cattle', cattleRoutes);
app.use('/api/milk', milkRoutes);





const PORT = process.env.PORT || 5000;

(async () => {
    try {
        await ConnectDB();
        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
})();