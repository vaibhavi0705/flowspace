import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ board: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
