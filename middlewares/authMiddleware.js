// middlewares/authMiddleware.js (ESM)

import jwt from 'jsonwebtoken';
import User from '../models/UserModels.js';

/**
 * Strict JWT auth — requires a valid Bearer token.
 * Sets req.user = { id, name, email }
 */
export const requireAuth = async (req, res, next) => {
    try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('_id name email');
        if (!user) return res.status(401).json({ message: 'User not found' });

        req.user = { id: user._id.toString(), name: user.name, email: user.email };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

/**
 * Optional auth — attaches req.user if a valid token is present,
 * otherwise continues without failing.
 */
export const attachUserIfPresent = async (req, _res, next) => {
    try {
        const auth = req.headers.authorization || '';
        if (auth.startsWith('Bearer ')) {
            const token = auth.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('_id name email');
            if (user) req.user = { id: user._id.toString(), name: user.name, email: user.email };
        }
    } catch {
        // ignore token errors here
    } finally {
        next();
    }
};

/**
 * Dev-only fallback — lets you pass x-user-id in headers without JWT.
 * DO NOT use in production.
 */
export const devAuth = (req, res, next) => {
    const uid = req.header('x-user-id') || req.header('x-user');
    if (!uid) return res.status(401).json({ message: 'Unauthorized' });
    req.user = { id: uid };
    next();
};