// middlewares/validateRequest.js (ESM)

import { validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array(),
    });
};

export default { validateRequest };