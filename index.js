import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ConnectDB from './db/ConnectDB.js';

const app = express();

app.use(cors({
    origin: ['*'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
}));


// app.use(cors({
//     origin: [
//         'http://localhost:8081',      // Expo web (your screenshot)
//         'http://10.10.3.151:8081',    // if you open via LAN IP
//         'http://localhost:19006'      // Expo web default, if you use it
//     ],
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//     credentials: true
// }));


app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

import UserRoutes from './routes/UserRoutes.js';
import cattleRoutes from './routes/CattleRoutes.js'
import milkRoutes from './routes/MilkRoutes.js';



// Routes
app.get('/', (_req, res) => res.send('Hello This is Home Page....'));
app.get('/hello', (_req, res) => res.send('Hello This is Hello Page....'));

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