// backend/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ConnectDB from './db/ConnectDB.js';

const app = express();

// CORS (add your deployed frontend domain after you deploy it)
app.use(cors({
    origin: [
        'http://localhost:8081',
        'http://127.0.0.1:8081',
        'http://localhost:19006',
        'http://127.0.0.1:19006',
        'http://192.168.0.103:8081',
        'http://10.10.3.151:8000',
        // 'https://cattle-frontend.vercel.app' // uncomment after frontend is deployed
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: false,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));         // keep modest for serverless
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Ensure DB connection (cached) ------------------------------------------
let dbReady; // Promise cache
async function ensureDB() {
    if (!dbReady) dbReady = ConnectDB();  // your ConnectDB should be idempotent
    return dbReady;
}
// middleware to guarantee DB before routes
app.use(async (req, res, next) => {
    try { await ensureDB(); next(); } catch (err) { next(err); }
});
// ---------------------------------------------------------------------------

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Routes
import UserRoutes from './routes/UserRoutes.js';
import cattleRoutes from './routes/CattleRoutes.js';
import milkRoutes from './routes/MilkRoutes.js';

app.use('/api/users', UserRoutes);
app.use('/api/cattle', cattleRoutes);
app.use('/api/milk', milkRoutes);

// ---- Export the app (required by Vercel)
export default app;

// ---- Local dev only (DON'T run on Vercel)
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    // Local: ensure DB then listen
    (async () => {
        try {
            await ensureDB();
            app.listen(PORT, () => {
                console.log(`🚀 Server running at http://localhost:${PORT}`);
            });
        } catch (err) {
            console.error('❌ Failed to start server:', err.message);
            process.exit(1);
        }
    })();
}