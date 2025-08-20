import { Router } from 'express';
import { body } from 'express-validator';
import { signup, login } from '../controllers/UserController.js';

const router = Router();

router.post(
    '/signup',
    [
        body('name').optional().isString().isLength({ max: 100 }).withMessage('Invalid name'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    signup
);

router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    login
);

export default router;