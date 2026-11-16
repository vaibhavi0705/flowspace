import mongoose from 'mongoose';
import { CARD_LABELS } from '../config/constants.js';

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const cardSchema = new mongoose.Schema(
  {
    // board is stored on the card too, so one query loads a whole board's cards
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 5000 },
    position: { type: Number, required: true, default: 0 },
    labels: [{ type: String, enum: CARD_LABELS }],
    dueDate: { type: Date, default: null },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Card', cardSchema);
