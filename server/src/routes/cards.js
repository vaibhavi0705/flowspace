import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Card from '../models/Card.js';
import List from '../models/List.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/HttpError.js';
import { getBoardForUser, assertObjectId } from '../utils/access.js';
import { logChange } from '../utils/realtime.js';
import { CARD_LABELS } from '../config/constants.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({ title: z.string().trim().min(1, 'Title is required').max(200) });

const updateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(5000).optional(),
  labels: z.array(z.enum(CARD_LABELS)).max(CARD_LABELS.length).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assignees: z.array(z.string()).max(30).optional(),
});

const moveSchema = z.object({ toListId: z.string(), index: z.number().int().min(0) });
const commentSchema = z.object({ text: z.string().trim().min(1, 'Write something first').max(1000) });

async function loadCard(id, userId) {
  assertObjectId(id, 'Card');
  const card = await Card.findById(id);
  if (!card) throw new HttpError(404, 'Card not found');
  const board = await getBoardForUser(card.board, userId);
  return { card, board };
}

// Cards are always sent back with comment authors filled in
const serialize = (id) => Card.findById(id).populate('comments.user', 'name color').lean();

// ---------- Create ----------
router.post(
  '/lists/:listId/cards',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.listId, 'List');
    const list = await List.findById(req.params.listId);
    if (!list) throw new HttpError(404, 'List not found');
    const board = await getBoardForUser(list.board, req.user._id);

    const last = await Card.findOne({ list: list._id }).sort('-position').select('position');
    const card = await Card.create({
      board: board._id,
      list: list._id,
      title: req.body.title,
      position: last ? last.position + 1 : 0,
      createdBy: req.user._id,
    });
    await logChange(req, board._id, `added "${card.title}" to ${list.title}`);
    res.status(201).json(await serialize(card._id));
  })
);

// ---------- Update fields ----------
router.patch(
  '/cards/:id',
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { card, board } = await loadCard(req.params.id, req.user._id);
    const { assignees, dueDate, ...rest } = req.body;

    Object.assign(card, rest);
    if (dueDate !== undefined) card.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignees !== undefined) {
      // Only people who are actually on the board can be assigned
      card.assignees = assignees
        .filter((id) => mongoose.isValidObjectId(id))
        .filter((id) => board.members.some((m) => m.equals(id)));
    }

    await card.save();
    await logChange(req, board._id, `updated "${card.title}"`);
    res.json(await serialize(card._id));
  })
);

// ---------- Move (between lists or within one) ----------
router.post(
  '/cards/:id/move',
  validate(moveSchema),
  asyncHandler(async (req, res) => {
    const { card, board } = await loadCard(req.params.id, req.user._id);
    const { toListId, index } = req.body;

    assertObjectId(toListId, 'List');
    const [toList, fromList] = await Promise.all([List.findById(toListId), List.findById(card.list)]);
    if (!toList || !toList.board.equals(card.board)) throw new HttpError(400, 'That list is not on this board');

    const fromListId = card.list;
    const sameList = fromListId.equals(toList._id);

    // Rebuild the destination order with the card inserted at the requested index
    const destination = await Card.find({ list: toList._id, _id: { $ne: card._id } })
      .sort('position')
      .select('_id');
    const ids = destination.map((c) => c._id);
    ids.splice(Math.min(index, ids.length), 0, card._id);

    const ops = ids.map((id, position) => ({
      updateOne: { filter: { _id: id }, update: { $set: { position, list: toList._id } } },
    }));

    // When the card changes list, close the gap it left behind in the source list
    if (!sameList) {
      const source = await Card.find({ list: fromListId }).sort('position').select('_id');
      source.forEach((c, position) =>
        ops.push({ updateOne: { filter: { _id: c._id }, update: { $set: { position } } } })
      );
    }

    await Card.bulkWrite(ops);
    await logChange(
      req,
      board._id,
      sameList
        ? `reordered "${card.title}" in ${toList.title}`
        : `moved "${card.title}" from ${fromList?.title ?? 'a list'} to ${toList.title}`
    );
    res.json({ ok: true });
  })
);

// ---------- Comment ----------
router.post(
  '/cards/:id/comments',
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    const { card, board } = await loadCard(req.params.id, req.user._id);
    card.comments.push({ user: req.user._id, text: req.body.text });
    await card.save();
    await logChange(req, board._id, `commented on "${card.title}"`);
    res.status(201).json(await serialize(card._id));
  })
);

// ---------- Delete ----------
router.delete(
  '/cards/:id',
  asyncHandler(async (req, res) => {
    const { card, board } = await loadCard(req.params.id, req.user._id);
    await card.deleteOne();
    await logChange(req, board._id, `deleted "${card.title}"`);
    res.json({ ok: true });
  })
);

export default router;
