import crypto from 'crypto';
import mongoose from 'mongoose';
import { BOARD_COLORS } from '../config/constants.js';

const boardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 300 },
    color: { type: String, enum: BOARD_COLORS, default: 'indigo' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // The owner is always included in members, so one query answers "who can see this board?"
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    inviteCode: { type: String, default: () => crypto.randomBytes(6).toString('hex'), unique: true },
  },
  { timestamps: true }
);

boardSchema.index({ members: 1, updatedAt: -1 });

export default mongoose.model('Board', boardSchema);
