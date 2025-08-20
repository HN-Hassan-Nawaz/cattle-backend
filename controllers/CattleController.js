import Cattle from '../models/CattleModels.js';


export const addCattle = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { tagNo, name, breed = '', notes = '', entryDate } = req.body || {};

        if (!tagNo || !name) {
            return res.status(400).json({ message: 'tagNo and name are required.' });
        }

        const norm = {
            user: userId,
            tagNo: String(tagNo).trim().toUpperCase(),
            name: String(name).trim(),
            breed: String(breed || '').trim(),
            notes: String(notes || '').trim(),
        };

        if (entryDate) {
            const parsed = entryDate instanceof Date ? entryDate : new Date(entryDate);
            if (Number.isNaN(parsed.getTime())) {
                return res
                    .status(400)
                    .json({ message: 'entryDate must be a valid date (e.g., YYYY-MM-DD).' });
            }
            norm.entryDate = parsed;
        }

        const cattle = await Cattle.create(norm);

        return res.status(201).json({
            message: 'Cattle added successfully.',
            data: cattle,
        });
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(409).json({
                message: 'The tag number is already used by you. Please choose a different tagNo.',
                details: err.keyValue,
            });
        }
        if (err?.name === 'ValidationError') {
            const details = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ message: 'Validation failed.', details });
        }
        console.error('addCattle error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};


export const getMyCattle = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
        const q = (req.query.q || '').trim();
        const breed = (req.query.breed || '').trim();

        // whitelist sort fields
        const sortParam = (req.query.sort || '-createdAt').trim();
        const allowed = ['createdAt', 'entryDate', 'name', 'tagNo'];
        const base = sortParam.replace(/^-/, '');
        const sort = allowed.includes(base) ? sortParam : '-createdAt';

        const filter = { user: userId };
        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { tagNo: { $regex: q, $options: 'i' } },
            ];
        }
        if (breed) filter.breed = { $regex: `^${breed}$`, $options: 'i' };

        const [items, total] = await Promise.all([
            Cattle.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
            Cattle.countDocuments(filter),
        ]);

        return res.json({
            message: 'ok',
            data: items,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit) || 1,
            },
        });
    } catch (err) {
        console.error('getMyCattle error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};


export const getCattleById = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const doc = await Cattle.findOne({ _id: req.params.id, user: userId });
        if (!doc) return res.status(404).json({ message: 'Cattle not found' });
        return res.json({ message: 'ok', data: doc });
    } catch (err) {
        console.error('getCattleById error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};


export const updateCattle = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const updates = {};
        if (req.body.tagNo !== undefined) updates.tagNo = String(req.body.tagNo).trim().toUpperCase();
        if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
        if (req.body.breed !== undefined) updates.breed = String(req.body.breed || '').trim();
        if (req.body.notes !== undefined) updates.notes = String(req.body.notes || '').trim();
        if (req.body.entryDate !== undefined && req.body.entryDate !== '') {
            const d = req.body.entryDate instanceof Date ? req.body.entryDate : new Date(req.body.entryDate);
            if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'entryDate must be a valid date (YYYY-MM-DD).' });
            updates.entryDate = d;
        }

        const updated = await Cattle.findOneAndUpdate(
            { _id: req.params.id, user: userId },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updated) return res.status(404).json({ message: 'Cattle not found' });
        return res.json({ message: 'Cattle updated successfully.', data: updated });
    } catch (err) {
        if (err?.code === 11000) return res.status(409).json({ message: 'Duplicate tagNo for this user.', details: err.keyValue });
        if (err?.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed.', details: Object.values(err.errors).map(e => e.message) });
        }
        console.error('updateCattle error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};


export const deleteCattle = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { id } = req.params;

        const deleted = await Cattle.findOneAndDelete({ _id: id, user: userId });
        if (!deleted) return res.status(404).json({ message: 'Cattle not found' });

        return res.json({ message: 'Cattle deleted successfully.', data: { id: deleted._id } });
    } catch (err) {
        console.error('deleteCattle error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};


export default { addCattle, getMyCattle, getCattleById, updateCattle, deleteCattle };