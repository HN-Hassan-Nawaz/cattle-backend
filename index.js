// backend/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ConnectDB from './db/ConnectDB.js';

const app = express();

// CORS: add your deployed frontend when ready
app.use(cors({
    origin: [
        'http://localhost:8081',
        'http://127.0.0.1:8081',
        'http://localhost:19006',
        'http://127.0.0.1:19006',
        'http://192.168.0.103:8081',
        'http://10.10.3.151:8000',
        // 'https://cattle-frontend.vercel.app', // uncomment after frontend deploy
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----- Ensure one DB connection per lambda (serverless-safe)
let dbReady;
async function ensureDB() {
    if (!dbReady) dbReady = ConnectDB(); // must be idempotent
    return dbReady;
}
app.use(async (req, res, next) => {
    try { await ensureDB(); next(); } catch (err) { next(err); }
});

// Health & root
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.send('Hello....'));

// Routes
import UserRoutes from './routes/UserRoutes.js';
import cattleRoutes from './routes/CattleRoutes.js';
import milkRoutes from './routes/MilkRoutes.js';

app.use('/api/users', UserRoutes);
app.use('/api/cattle', cattleRoutes);
app.use('/api/milk', milkRoutes);

// Error handler (so you see the real problem in Vercel logs)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);       // shows stack in Function logs
    res.status(500).json({ error: 'Server error' });
});

// Export the app for Vercel
export default app;

// Local dev only (DON'T run on Vercel)
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    (async () => {
        try {
            await ensureDB();
            app.listen(PORT, () =>
                console.log(`🚀 Server running at http://localhost:${PORT}`)
            );
        } catch (err) {
            console.error('❌ Failed to start server:', err);
            process.exit(1);
        }
    })();
}