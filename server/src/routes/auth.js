import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { createStarterBoard } from '../utils/starterBoard.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const session = (user) => ({ token: signToken(user), user: user.toPublic() });

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');

    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    await createStarterBoard(user);
    res.status(201).json(session(user));
  })
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    // Same message for "no such user" and "wrong password" so emails cannot be probed
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) throw new HttpError(401, 'Incorrect email or password');
    res.json(session(user));
  })
);

// One-click demo account so recruiters can try the app without signing up
router.post(
  '/guest',
  asyncHandler(async (req, res) => {
    const suffix = crypto.randomBytes(3).toString('hex');
    const user = await User.create({
      name: `Guest ${Math.floor(100 + Math.random() * 900)}`,
      email: `guest-${suffix}@flowspace.demo`,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 8),
      isGuest: true,
    });
    await createStarterBoard(user);
    res.status(201).json(session(user));
  })
);

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

export default router;
