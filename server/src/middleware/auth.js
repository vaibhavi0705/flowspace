import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { HttpError } from '../utils/HttpError.js';

export const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Verifies the Bearer token, loads the user, and attaches it to req.user
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Please sign in to continue');

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new HttpError(401, 'Your session has expired. Please sign in again');
    }

    const user = await User.findById(payload.id);
    if (!user) throw new HttpError(401, 'This account no longer exists');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
