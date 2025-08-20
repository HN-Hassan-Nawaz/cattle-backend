// server/models/MilkProduction.js
import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const MilkProductionSchema = new Schema(
    {
        user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
        cattle: { type: Types.ObjectId, ref: 'Cattle', required: true, index: true },

        // Grouping key like '2025-08-13'
        localDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },

        // One record per shift per day
        shift: { type: String, enum: ['morning', 'evening'], required: true },

        liters: { type: Number, required: true, min: 0 },
        notes: { type: String, trim: true, maxlength: 500, default: '' },
    },
    { timestamps: true }
);

// Ensure no duplicates for the same user+cattle+date+shift
MilkProductionSchema.index(
    { user: 1, cattle: 1, localDate: 1, shift: 1 },
    { unique: true }
);

// Helpful for range queries
MilkProductionSchema.index({ user: 1, cattle: 1, localDate: 1 });

const MilkProduction = model('MilkProduction', MilkProductionSchema);
export default MilkProduction;