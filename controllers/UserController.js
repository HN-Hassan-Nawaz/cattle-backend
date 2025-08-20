import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/UserModels.js';

export const signup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ message: 'Email is already registered' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, passwordHash });

        return res.status(201).json({
            message: 'Signup successful',
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        if (err?.code === 11000) return res.status(409).json({ message: 'Email already registered' });
        console.error('Signup error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};


export const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+passwordHash');
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

        // sign JWT
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,                                  // must exist
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};