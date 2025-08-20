// server/routes/MilkRoutes.js
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
    setProduction,
    deleteProduction,
    addSale,
    deleteSale,
    getCattleDailyStats,
    getCattleRangeSummary,
    getSummaryByCattle,
    getRevenueDaily,
    getRevenueWeekly,
    getRevenueMonthly,
} from '../controllers/MilkController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';

const router = Router();
const isYMD = /^\d{4}-\d{2}-\d{2}$/;

/* Production */
router.post(
    '/production',
    requireAuth,
    [
        body('cattleId').isMongoId(),
        body('localDate').matches(isYMD),
        body('shift').isIn(['morning', 'evening']),
        body('liters').isFloat({ min: 0 }),
        body('notes').optional().isString().isLength({ max: 500 }),
    ],
    validateRequest,
    setProduction
);

router.delete(
    '/production/:id',
    requireAuth,
    [param('id').isMongoId()],
    validateRequest,
    deleteProduction
);

/* Sales */
router.post(
    '/sales',
    requireAuth,
    [
        body('cattleId').isMongoId(),
        body('localDate').matches(isYMD),
        body('liters').isFloat({ min: 0 }),
        body('pricePerLiter').optional().isFloat({ min: 0 }),
        body('buyer').optional().isString().isLength({ max: 120 }),
        body('notes').optional().isString().isLength({ max: 500 }),
        body('when').optional().isISO8601().toDate(),
    ],
    validateRequest,
    addSale
);

router.delete(
    '/sales/:id',
    requireAuth,
    [param('id').isMongoId()],
    validateRequest,
    deleteSale
);

/* Stats */
router.get(
    '/stats/daily',
    requireAuth,
    [query('cattleId').isMongoId(), query('from').matches(isYMD), query('to').matches(isYMD)],
    validateRequest,
    getCattleDailyStats
);

router.get(
    '/stats/summary',
    requireAuth,
    [query('cattleId').isMongoId(), query('from').matches(isYMD), query('to').matches(isYMD)],
    validateRequest,
    getCattleRangeSummary
);

router.get(
    '/stats/summary-by-cattle',
    requireAuth,
    [query('from').matches(isYMD), query('to').matches(isYMD)],
    validateRequest,
    getSummaryByCattle
);


router.get(
    '/stats/revenue-daily',
    requireAuth,
    [
        query('from').matches(isYMD),
        query('to').matches(isYMD),
        query('rate').optional().isFloat({ min: 0 }),
    ],
    validateRequest,
    getRevenueDaily
);

router.get(
    '/stats/revenue-weekly',
    requireAuth,
    [
        query('from').matches(isYMD),
        query('to').matches(isYMD),
        query('rate').optional().isFloat({ min: 0 }),
    ],
    validateRequest,
    getRevenueWeekly
);

router.get(
    '/stats/revenue-monthly',
    requireAuth,
    [
        query('from').matches(isYMD),
        query('to').matches(isYMD),
        query('rate').optional().isFloat({ min: 0 }),
    ],
    validateRequest,
    getRevenueMonthly
);


export default router;