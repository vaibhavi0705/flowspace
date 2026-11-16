import { Router } from 'express';
import { z } from 'zod';
import List from '../models/List.js';
import Card from '../models/Card.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { getBoardForUser, assertObjectId } from '../utils/access.js';
import { logChange } from '../utils/realtime.js';

const router = Router();
router.use(requireAuth);

const titleSchema = z.object({ title: z.string().trim().min(1, 'Title is required').max(80) });

async function loadList(id, userId) {
  assertObjectId(id, 'List');
  const list = await List.findById(id);
  if (!list) throw new HttpError(404, 'List not found');
  await getBoardForUser(list.board, userId); // membership check
  return list;
}

// Create a list at the end of the board
router.post(
  '/boards/:boardId/lists',
  validate(titleSchema),
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.boardId, req.user._id);
    const last = await List.findOne({ board: board._id }).sort('-position').select('position');
    const list = await List.create({
      board: board._id,
      title: req.body.title,
      position: last ? last.position + 1 : 0,
    });
    await logChange(req, board._id, `added the list "${list.title}"`);
    res.status(201).json(list);
  })
);

// Persist a new column order: the client sends every list id in its new order
router.post(
  '/boards/:boardId/lists/reorder',
  validate(z.object({ orderedIds: z.array(z.string()).min(1).max(100) })),
  asyncHandler(async (req, res) => {
    const board = await getBoardForUser(req.params.boardId, req.user._id);
    const existing = await List.find({ board: board._id }).select('_id');
    const valid = new Set(existing.map((l) => String(l._id)));
    const ids = req.body.orderedIds.filter((id) => valid.has(id));

    await List.bulkWrite(
      ids.map((id, position) => ({ updateOne: { filter: { _id: id }, update: { $set: { position } } } }))
    );
    await logChange(req, board._id, 'reordered the lists');
    res.json({ ok: true });
  })
);

router.patch(
  '/lists/:id',
  validate(titleSchema),
  asyncHandler(async (req, res) => {
    const list = await loadList(req.params.id, req.user._id);
    list.title = req.body.title;
    await list.save();
    await logChange(req, list.board, `renamed a list to "${list.title}"`);
    res.json(list);
  })
);

router.delete(
  '/lists/:id',
  asyncHandler(async (req, res) => {
    const list = await loadList(req.params.id, req.user._id);
    await Card.deleteMany({ list: list._id });
    await list.deleteOne();
    await logChange(req, list.board, `deleted the list "${list.title}"`);
    res.json({ ok: true });
  })
);

export default router;
