import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ConnectDB from './db/ConnectDB.js';

const app = express();

app.use(cors({
    origin: ['*'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

import UserRoutes from './routes/UserRoutes.js';
import cattleRoutes from './routes/CattleRoutes.js'
import milkRoutes from './routes/MilkRoutes.js';



// Routes
app.get('/hello', (_req, res) => res.send('Hello....'));

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