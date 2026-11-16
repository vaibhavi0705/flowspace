import { Router } from 'express';
import { z } from 'zod';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { getBoardForUser, assertOwner, assertObjectId } from '../utils/access.js';
import { broadcast, broadcastAll, logChange } from '../utils/realtime.js';
import { BOARD_COLORS } from '../config/constants.js';

const router = Router();
router.use(requireAuth);

const MEMBER_FIELDS = 'name email color isGuest';

const createSchema = z.object({
  title: z.string().trim().min(1, 'Give your board a title').max(80),
  description: z.string().trim().max(300).optional(),
  color: z.enum(BOARD_COLORS).optional(),
});
const updateSchema = createSchema.partial();

// ---------- List my boards ----------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const boards = await Board.find({ members: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('members', MEMBER_FIELDS)
      .lean();

    const counts = await Card.aggregate([
      { $match: { board: { $in: boards.map((b) => b._id) } } },
      { $group: { _id: '$board', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

    res.json(boards.map((b) => ({ ...b, cardCount: countMap[String(b._id)] || 0 })));
  })
);

// ---------- Create a board ----------
router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const board = await Board.create({ ...req.body, owner: req.user._id, members: [req.user._id] });
    await List.insertMany(
      ['To do', 'In progress', 'Done'].map((title, position) => ({ board: board._id, title, position }))
    );
    await Activity.create({ board: board._id, user: req.user._id, text: 'created this board' });
    res.status(201).json(board);
  })
);

// ---------- Join through an invite link ----------
// Declared before "/:id" routes so "join" is never treated as an id
router.post(
  '/join',
  validate(z.object({ code: z.string().trim().min(4).max(40) })),
  asyncHandler(async (req, res) => {
    const board = await Board.findOne({ inviteCode: req.body.code });
    if (!board) throw new HttpError(404, 'This invite link is not valid');

    if (!board.members.some((m) => m.equals(req.user._id))) {
      board.members.push(req.user._id);
      await board.save();
      await logChange(req, board._id, 'joined the board');
    }
    res.json({ boardId: board._id });
  })
);

// ---------- Full snapshot of one board ----------
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.id, req.user._id);
    await board.populate('members', MEMBER_FIELDS);

    const [lists, cards, activity] = await Promise.all([
      List.find({ board: board._id }).sort('position').lean(),
      Card.find({ board: board._id }).sort('position').populate('comments.user', 'name color').lean(),
      Activity.find({ board: board._id }).sort('-createdAt').limit(50).populate('user', 'name color').lean(),
    ]);

    res.json({ board, lists, cards, activity });
  })
);

// ---------- Rename / recolor ----------
router.patch(
  '/:id',
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.id, req.user._id);
    Object.assign(board, req.body);
    await board.save();
    await logChange(req, board._id, 'updated the board details');
    res.json(board);
  })
);

// ---------- Delete (owner only) ----------
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.id, req.user._id);
    assertOwner(board, req.user._id);

    broadcast(req, board._id, 'board:deleted');
    await Promise.all([
      Card.deleteMany({ board: board._id }),
      List.deleteMany({ board: board._id }),
      Activity.deleteMany({ board: board._id }),
      board.deleteOne(),
    ]);
    res.json({ ok: true });
  })
);

// ---------- Invite someone by email (owner only) ----------
router.post(
  '/:id/members',
  validate(z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address') })),
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.id, req.user._id);
    assertOwner(board, req.user._id);

    const invitee = await User.findOne({ email: req.body.email });
    if (!invitee) throw new HttpError(404, 'No account with that email yet. Share the invite link instead');
    if (board.members.some((m) => m.equals(invitee._id))) throw new HttpError(409, 'Already a member');

    board.members.push(invitee._id);
    await board.save();
    await logChange(req, board._id, `added ${invitee.name} to the board`);
    res.status(201).json({ ok: true });
  })
);

// ---------- Remove a member, or leave the board ----------
router.delete(
  '/:id/members/:userId',
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.id, req.user._id);
    const { userId } = req.params;
    assertObjectId(userId, 'Member');

    const leavingSelf = req.user._id.equals(userId);
    if (!leavingSelf) assertOwner(board, req.user._id);
    if (board.owner.equals(userId)) throw new HttpError(400, 'The owner cannot be removed');

    board.members = board.members.filter((m) => !m.equals(userId));
    await board.save();
    await Card.updateMany({ board: board._id }, { $pull: { assignees: userId } });

    broadcastAll(req, board._id, 'member:removed', { userId });

    // Kick the removed person's open tabs out of the live room so they stop receiving updates
    const io = req.app.get('io');
    const sockets = await io.in(`board:${board._id}`).fetchSockets();
    sockets.filter((s) => s.data.userId === String(userId)).forEach((s) => s.leave(`board:${board._id}`));

    await logChange(req, board._id, leavingSelf ? 'left the board' : 'removed a member');
    res.json({ ok: true });
  })
);

export default router;
