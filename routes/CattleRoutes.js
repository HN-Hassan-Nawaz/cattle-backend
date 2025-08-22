import { Router } from 'express';
import { body, param } from 'express-validator';
import { addCattle, getMyCattle, getCattleById, updateCattle, deleteCattle } from '../controllers/CattleController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';

const router = Router();

/** List mine */
router.get('/', requireAuth, getMyCattle);

/** Get one (mine) */
router.get(
    '/:id',
    requireAuth,
    [param('id').isMongoId().withMessage('Invalid id')],
    validateRequest,
    getCattleById
);

/** Add */
router.post(
    '/add',
    requireAuth,
    [
        body('tagNo').trim().isLength({ min: 1, max: 10 }).withMessage('tagNo (1–10 chars) is required'),
        body('name').trim().isLength({ min: 1, max: 100 }).withMessage('name is required (max 100 chars)'),
        body('breed').optional().isString().isLength({ max: 100 }).withMessage('breed max length is 100'),
        body('notes').optional().isString().isLength({ max: 2000 }).withMessage('notes max length is 2000'),
        body('entryDate').optional().isISO8601().withMessage('entryDate must be a valid date (YYYY-MM-DD)'),
    ],
    validateRequest,
    addCattle
);

/** Update */
router.put(
    '/:id',
    requireAuth,
    [
        param('id').isMongoId().withMessage('Invalid id'),
        body('tagNo').optional().trim().isLength({ min: 1, max: 10 }).withMessage('tagNo must be 1–10 chars'),
        body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('name max 100 chars'),
        body('breed').optional().isString().isLength({ max: 100 }).withMessage('breed max 100 chars'),
        body('notes').optional().isString().isLength({ max: 2000 }).withMessage('notes max 2000 chars'),
        body('entryDate').optional().isISO8601().withMessage('entryDate must be a valid date (YYYY-MM-DD)'),
    ],
    validateRequest,
    updateCattle
);


router.delete(
    '/:id',
    requireAuth,
    [param('id').isMongoId().withMessage('Invalid id')],
    validateRequest,
    deleteCattle
);

export default router;