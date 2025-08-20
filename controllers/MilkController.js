// server/controllers/MilkController.js
import mongoose from 'mongoose';
import MilkProduction from '../models/MilkProduction.js';
import MilkSale from '../models/MilkSale.js';
import Cattle from '../models/CattleModels.js';

const { Types } = mongoose;

const isYMD = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const toObjId = (v) => (Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : null);
const toYMD = (d) => new Date(d).toISOString().slice(0, 10);

/** Ensure the cattle belongs to the user */
async function assertMyCattle(userId, cattleId) {
    const ok = await Cattle.exists({ _id: cattleId, user: userId });
    if (!ok) {
        const err = new Error('Cattle not found');
        err.status = 404;
        throw err;
    }
}

/** ISO week helpers (UTC) */
function isoWeekStartUTC(isoYear, isoWeek) {
    // Thursday of ISO week 1 always in isoYear
    const jan4 = new Date(Date.UTC(isoYear, 0, 4));
    const jan4Dow = (jan4.getUTCDay() || 7); // 1..7, Monday=1
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1));
    const mondayTarget = new Date(mondayWeek1);
    mondayTarget.setUTCDate(mondayWeek1.getUTCDate() + (isoWeek - 1) * 7);
    return mondayTarget; // Monday 00:00:00 UTC of ISO week
}
function isoWeekEndUTC(isoYear, isoWeek) {
    const start = isoWeekStartUTC(isoYear, isoWeek);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6); // Sunday
    return end;
}

/** --------- Production: upsert one shift --------- */
export const setProduction = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { cattleId, localDate, shift, liters, notes = '' } = req.body || {};
        const cid = toObjId(cattleId);
        if (!cid) return res.status(400).json({ message: 'cattleId is required' });
        if (!isYMD(localDate)) return res.status(400).json({ message: 'localDate must be YYYY-MM-DD' });
        if (!['morning', 'evening'].includes(shift)) return res.status(400).json({ message: "shift must be 'morning' or 'evening'" });
        const qty = Number(liters);
        if (!Number.isFinite(qty) || qty < 0) return res.status(400).json({ message: 'liters must be a non-negative number' });

        await assertMyCattle(userId, cid);

        const doc = await MilkProduction.findOneAndUpdate(
            { user: userId, cattle: cid, localDate, shift },
            { $set: { liters: qty, notes: String(notes || '') } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.json({ message: 'Production saved.', data: doc });
    } catch (err) {
        if (err?.status) return res.status(err.status).json({ message: err.message });
        if (err?.code === 11000) return res.status(409).json({ message: 'Duplicate production for this shift.' });
        console.error('setProduction error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

/** Delete a production row (one shift). Prevents sold > produced for that day. */
export const deleteProduction = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { id } = req.params;
        const prod = await MilkProduction.findOne({ _id: id, user: userId });
        if (!prod) return res.status(404).json({ message: 'Production not found' });

        const [sumProd, sumSale] = await Promise.all([
            MilkProduction.aggregate([
                { $match: { user: Types.ObjectId.createFromHexString(String(userId)), cattle: prod.cattle, localDate: prod.localDate } },
                { $group: { _id: null, total: { $sum: '$liters' } } }
            ]),
            MilkSale.aggregate([
                { $match: { user: Types.ObjectId.createFromHexString(String(userId)), cattle: prod.cattle, localDate: prod.localDate } },
                { $group: { _id: null, total: { $sum: '$liters' } } }
            ])
        ]);
        const producedTotal = sumProd[0]?.total || 0;
        const soldTotal = sumSale[0]?.total || 0;

        if (soldTotal > producedTotal - prod.liters + 1e-9) {
            return res.status(409).json({ message: 'Cannot delete. Sales for this day would exceed production.' });
        }

        await prod.deleteOne();
        return res.json({ message: 'Production deleted.', data: { id: prod._id } });
    } catch (err) {
        console.error('deleteProduction error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

/** --------- Sales: add one row (validates against production) --------- */
export const addSale = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { cattleId, localDate, liters, pricePerLiter, buyer = '', notes = '', when } = req.body || {};
        const cid = toObjId(cattleId);
        if (!cid) return res.status(400).json({ message: 'cattleId is required' });
        if (!isYMD(localDate)) return res.status(400).json({ message: 'localDate must be YYYY-MM-DD' });
        const qty = Number(liters);
        if (!Number.isFinite(qty) || qty < 0) return res.status(400).json({ message: 'liters must be a non-negative number' });

        await assertMyCattle(userId, cid);

        const [prodAgg, saleAgg] = await Promise.all([
            MilkProduction.aggregate([
                { $match: { user: toObjId(userId), cattle: cid, localDate } },
                { $group: { _id: null, total: { $sum: '$liters' } } }
            ]),
            MilkSale.aggregate([
                { $match: { user: toObjId(userId), cattle: cid, localDate } },
                { $group: { _id: null, total: { $sum: '$liters' } } }
            ])
        ]);
        const producedTotal = prodAgg[0]?.total || 0;
        const soldTotal = saleAgg[0]?.total || 0;

        if (soldTotal + qty > producedTotal + 1e-9) {
            return res.status(409).json({
                message: 'Sale exceeds available production for the day.',
                details: { producedTotal, soldSoFar: soldTotal, requestedSale: qty, remaining: Math.max(0, producedTotal - soldTotal) }
            });
        }

        const doc = await MilkSale.create({
            user: userId,
            cattle: cid,
            localDate,
            liters: qty,
            pricePerLiter: pricePerLiter !== undefined ? Number(pricePerLiter) : undefined,
            buyer: String(buyer || ''),
            notes: String(notes || ''),
            when: when ? new Date(when) : new Date()
        });

        return res.json({ message: 'Sale added.', data: doc });
    } catch (err) {
        if (err?.status) return res.status(err.status).json({ message: err.message });
        console.error('addSale error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const deleteSale = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { id } = req.params;
        const sale = await MilkSale.findOneAndDelete({ _id: id, user: userId });
        if (!sale) return res.status(404).json({ message: 'Sale not found' });

        return res.json({ message: 'Sale deleted.', data: { id: sale._id } });
    } catch (err) {
        console.error('deleteSale error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

/** --------- Per-day stats for a cattle --------- */
export const getCattleDailyStats = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { cattleId, from, to } = req.query || {};
        const cid = toObjId(cattleId);
        if (!cid) return res.status(400).json({ message: 'cattleId is required' });
        if (!isYMD(from) || !isYMD(to)) return res.status(400).json({ message: 'from/to must be YYYY-MM-DD' });

        await assertMyCattle(userId, cid);

        const match = { user: toObjId(userId), cattle: cid, localDate: { $gte: from, $lte: to } };

        const [prod, sales] = await Promise.all([
            MilkProduction.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$localDate',
                        morning: { $sum: { $cond: [{ $eq: ['$shift', 'morning'] }, '$liters', 0] } },
                        evening: { $sum: { $cond: [{ $eq: ['$shift', 'evening'] }, '$liters', 0] } },
                        producedTotal: { $sum: '$liters' },
                    },
                },
            ]),
            MilkSale.aggregate([
                { $match: match },
                { $group: { _id: '$localDate', soldTotal: { $sum: '$liters' } } },
            ]),
        ]);

        const byDay = new Map();
        for (const p of prod) {
            byDay.set(p._id, {
                localDate: p._id,
                morning: p.morning || 0,
                evening: p.evening || 0,
                producedTotal: p.producedTotal || 0,
                soldTotal: 0,
            });
        }
        for (const s of sales) {
            const row = byDay.get(s._id) || { localDate: s._id, morning: 0, evening: 0, producedTotal: 0, soldTotal: 0 };
            row.soldTotal = s.soldTotal || 0;
            byDay.set(s._id, row);
        }

        const result = [...byDay.values()]
            .map((r) => ({ ...r, remaining: (r.producedTotal || 0) - (r.soldTotal || 0) }))
            .sort((a, b) => a.localDate.localeCompare(b.localDate));

        return res.json({ data: result });
    } catch (err) {
        if (err?.status) return res.status(err.status).json({ message: err.message });
        console.error('getCattleDailyStats error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

/** --------- Range summary for a cattle --------- */
export const getCattleRangeSummary = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { cattleId, from, to } = req.query || {};
        const cid = toObjId(cattleId);
        if (!cid) return res.status(400).json({ message: 'cattleId is required' });
        if (!isYMD(from) || !isYMD(to)) return res.status(400).json({ message: 'from/to must be YYYY-MM-DD' });

        await assertMyCattle(userId, cid);

        // call ourselves to get folded totals
        const tmp = await getCattleDailyStats({ ...req, query: { cattleId, from, to } }, { json: (d) => d });
        const days = tmp?.data || [];

        const totals = days.reduce(
            (acc, d) => ({
                morning: acc.morning + (d.morning || 0),
                evening: acc.evening + (d.evening || 0),
                producedTotal: acc.producedTotal + (d.producedTotal || 0),
                soldTotal: acc.soldTotal + (d.soldTotal || 0),
                remaining: acc.remaining + ((d.producedTotal || 0) - (d.soldTotal || 0)),
            }),
            { morning: 0, evening: 0, producedTotal: 0, soldTotal: 0, remaining: 0 }
        );

        return res.json({ data: totals });
    } catch (err) {
        if (err?.status) return res.status(err.status).json({ message: err.message });
        console.error('getCattleRangeSummary error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

/** --------- Summary by cattle (produced, sold, actual revenue) --------- */
export const getSummaryByCattle = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { from, to } = req.query || {};
        if (!isYMD(from) || !isYMD(to)) return res.status(400).json({ message: 'from/to must be YYYY-MM-DD' });

        const userObj = Types.ObjectId.createFromHexString(String(userId));

        const prod = await MilkProduction.aggregate([
            { $match: { user: userObj, localDate: { $gte: from, $lte: to } } },
            { $group: { _id: '$cattle', producedTotal: { $sum: '$liters' } } },
        ]);

        const sales = await MilkSale.aggregate([
            { $match: { user: userObj, localDate: { $gte: from, $lte: to } } },
            {
                $group: {
                    _id: '$cattle',
                    soldTotal: { $sum: '$liters' },
                    revenueFromSales: { $sum: { $multiply: ['$liters', { $ifNull: ['$pricePerLiter', 0] }] } },
                },
            },
        ]);

        const map = new Map();
        for (const p of prod) map.set(String(p._id), { cattleId: String(p._id), producedTotal: p.producedTotal || 0, soldTotal: 0, revenueFromSales: 0 });
        for (const s of sales) {
            const k = String(s._id);
            const row = map.get(k) || { cattleId: k, producedTotal: 0, soldTotal: 0, revenueFromSales: 0 };
            row.soldTotal += (s.soldTotal || 0);
            row.revenueFromSales += (s.revenueFromSales || 0);
            map.set(k, row);
        }

        const ids = [...map.keys()].map((id) => new Types.ObjectId(id));
        const cattleDocs = await Cattle.find({ _id: { $in: ids }, user: userObj }).select('_id tagNo name').lean();
        const labelById = new Map(cattleDocs.map((c) => [String(c._id), c]));

        const rows = [...map.values()].map((r) => ({
            cattle: labelById.get(r.cattleId) || { _id: r.cattleId, tagNo: '—', name: 'Unknown' },
            producedTotal: r.producedTotal || 0,
            soldTotal: r.soldTotal || 0,
            revenueFromSales: r.revenueFromSales || 0,
        }));

        rows.sort((a, b) => {
            const at = (a.cattle?.tagNo || '').localeCompare(b.cattle?.tagNo || '');
            return at !== 0 ? at : (a.cattle?.name || '').localeCompare(b.cattle?.name || '');
        });

        return res.json({ data: rows });
    } catch (err) {
        console.error('getSummaryByCattle error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};




function parseRate(q) {
    if (q == null || q === '') return null;
    const r = Number(q);
    return Number.isFinite(r) && r >= 0 ? r : null;
}

export const getRevenueDaily = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { from, to, cattleId, rate: rateQ } = req.query || {};
        if (!isYMD(from) || !isYMD(to)) return res.status(400).json({ message: 'from/to must be YYYY-MM-DD' });

        const match = {
            user: Types.ObjectId.createFromHexString(String(userId)),
            localDate: { $gte: from, $lte: to },
        };
        if (cattleId) {
            if (!Types.ObjectId.isValid(cattleId)) return res.status(400).json({ message: 'Invalid cattleId' });
            match.cattle = new Types.ObjectId(cattleId);
        }

        const overrideRate = parseRate(rateQ);

        const rows = await MilkSale.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$localDate',
                    sold: { $sum: '$liters' },
                    revenue: { $sum: { $multiply: ['$liters', { $ifNull: ['$pricePerLiter', 0] }] } },
                }
            },
            { $sort: { _id: 1 } },
        ]);

        const data = rows.map(r => ({
            localDate: r._id,
            sold: r.sold || 0,
            revenue: overrideRate != null ? (r.sold || 0) * overrideRate : (r.revenue || 0),
        }));
        return res.json({ data, appliedRate: overrideRate });
    } catch (err) {
        console.error('getRevenueDaily error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const getRevenueWeekly = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { from, to, cattleId, rate: rateQ } = req.query || {};
        if (!isYMD(from) || !isYMD(to)) return res.status(400).json({ message: 'from/to must be YYYY-MM-DD' });

        const match = {
            user: Types.ObjectId.createFromHexString(String(userId)),
            localDate: { $gte: from, $lte: to },
        };
        if (cattleId) {
            if (!Types.ObjectId.isValid(cattleId)) return res.status(400).json({ message: 'Invalid cattleId' });
            match.cattle = new Types.ObjectId(cattleId);
        }

        const overrideRate = parseRate(rateQ);

        const rows = await MilkSale.aggregate([
            { $match: match },
            { $addFields: { d: { $dateFromString: { dateString: '$localDate' } } } },
            {
                $group: {
                    _id: { y: { $isoWeekYear: '$d' }, w: { $isoWeek: '$d' } },
                    sold: { $sum: '$liters' },
                    revenue: { $sum: { $multiply: ['$liters', { $ifNull: ['$pricePerLiter', 0] }] } },
                }
            },
            { $sort: { '_id.y': 1, '_id.w': 1 } },
        ]);

        const data = rows.map(r => {
            const y = r._id.y, w = r._id.w;
            const start = isoWeekStartUTC(y, w);
            const end = isoWeekEndUTC(y, w);
            const sold = r.sold || 0;
            return {
                isoYear: y,
                isoWeek: w,
                weekLabel: `${y}-W${String(w).padStart(2, '0')}`,
                rangeFrom: toYMD(start),
                rangeTo: toYMD(end),
                sold,
                revenue: overrideRate != null ? sold * overrideRate : (r.revenue || 0),
            };
        });

        return res.json({ data, appliedRate: overrideRate });
    } catch (err) {
        console.error('getRevenueWeekly error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const getRevenueMonthly = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { from, to, cattleId, rate: rateQ } = req.query || {};
        if (!isYMD(from) || !isYMD(to)) return res.status(400).json({ message: 'from/to must be YYYY-MM-DD' });

        const match = {
            user: Types.ObjectId.createFromHexString(String(userId)),
            localDate: { $gte: from, $lte: to },
        };
        if (cattleId) {
            if (!Types.ObjectId.isValid(cattleId)) return res.status(400).json({ message: 'Invalid cattleId' });
            match.cattle = new Types.ObjectId(cattleId);
        }

        const overrideRate = parseRate(rateQ);

        const rows = await MilkSale.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $substr: ['$localDate', 0, 7] }, // YYYY-MM
                    sold: { $sum: '$liters' },
                    revenue: { $sum: { $multiply: ['$liters', { $ifNull: ['$pricePerLiter', 0] }] } },
                }
            },
            { $sort: { _id: 1 } },
        ]);

        const data = rows.map(r => {
            const sold = r.sold || 0;
            return { month: r._id, sold, revenue: overrideRate != null ? sold * overrideRate : (r.revenue || 0) };
        });
        return res.json({ data, appliedRate: overrideRate });
    } catch (err) {
        console.error('getRevenueMonthly error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
