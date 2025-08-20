// backend/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ConnectDB from './db/ConnectDB.js';

const app = express();

// CORS (add your web domain later if you deploy a web frontend)
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:8081',
        'http://127.0.0.1:8081'
        // 'https://your-frontend.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// one Mongo connection per lambda
let dbReady;
async function ensureDB() {
    if (!dbReady) dbReady = ConnectDB();
    return dbReady;
}
app.use(async (req, res, next) => {
    try { await ensureDB(); next(); } catch (e) { next(e); }
});

// basic routes
app.get('/', (_req, res) => res.send('Hello....'));
app.get('/health', (_req, res) => res.json({ ok: true }));

// your routes (be careful with filename **case**)
import UserRoutes from './routes/UserRoutes.js';
import CattleRoutes from './routes/CattleRoutes.js';
import MilkRoutes from './routes/MilkRoutes.js';
app.use('/api/users', UserRoutes);
app.use('/api/cattle', CattleRoutes);
app.use('/api/milk', MilkRoutes);

// error handler (shows stack in Vercel “Functions” logs)
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Server error' });
});

// export app for serverless
export default app;

// local dev only
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    (async () => {
        try { await ensureDB(); app.listen(PORT, () => console.log(`http://localhost:${PORT}`)); }
        catch (e) { console.error('Failed to start:', e); process.exit(1); }
    })();
}