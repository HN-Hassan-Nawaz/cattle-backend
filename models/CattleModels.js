import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const CattleSchema = new Schema(
    {
        // Who created/owns this cattle record
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        tagNo: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 10,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        breed: {
            type: String,
            trim: true,
            default: '',
            maxlength: 100,
        },
        notes: {
            type: String,
            trim: true,
            default: '',
            maxlength: 2000,
        },
        entryDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Ensure a user can add many cattle, but each user cannot reuse the same tagNo
CattleSchema.index({ user: 1, tagNo: 1 }, { unique: true });

const Cattle = model('Cattle', CattleSchema);
export default Cattle;