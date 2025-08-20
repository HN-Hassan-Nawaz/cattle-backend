import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ConnectDB from './db/ConnectDB.js';

const app = express();

// CORS: browsers only. Mobile fetches don’t send Origin.
// Add your Vercel frontend domain once you deploy it.
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

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: false
}));


// Body parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));




import UserRoutes from './routes/UserRoutes.js';
import cattleRoutes from './routes/CattleRoutes.js'
import milkRoutes from './routes/MilkRoutes.js';



// Routes
app.get('/health', (req, res) => res.json({ ok: true }));

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