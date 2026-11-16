import mongoose from 'mongoose';
import { USER_COLORS } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select:false keeps the hash out of every query unless explicitly requested
    password: { type: String, required: true, select: false },
    color: {
      type: String,
      default: () => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
    },
    isGuest: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The only shape of a user that is ever sent to a client
userSchema.methods.toPublic = function toPublic() {
  return { _id: this._id, name: this.name, email: this.email, color: this.color, isGuest: this.isGuest };
};

export default mongoose.model('User', userSchema);
