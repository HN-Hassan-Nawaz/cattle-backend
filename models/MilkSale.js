// server/models/MilkSale.js
import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const MilkSaleSchema = new Schema(
    {
        user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
        cattle: { type: Types.ObjectId, ref: 'Cattle', required: true, index: true },

        // Exact moment of sale (for audit)
        when: { type: Date, default: () => new Date() },

        // Grouping key like 'YYYY-MM-DD' in user's local date
        localDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },

        liters: { type: Number, required: true, min: 0 },
        pricePerLiter: { type: Number, required: true, min: 0 }, // <- REQUIRED now
        buyer: { type: String, trim: true, maxlength: 120, default: '' },
        notes: { type: String, trim: true, maxlength: 500, default: '' },
    },
    { timestamps: true }
);

// Useful indexes for reports / filtering
MilkSaleSchema.index({ user: 1, cattle: 1, localDate: 1 });
MilkSaleSchema.index({ user: 1, localDate: 1 });

const MilkSale = model('MilkSale', MilkSaleSchema);
export default MilkSale;