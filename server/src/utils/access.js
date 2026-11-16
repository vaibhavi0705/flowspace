import mongoose from 'mongoose';
import Board from '../models/Board.js';
import { HttpError } from './HttpError.js';

// The single authorization check used by every board, list and card route (and the socket join).
// It returns the board only if the user is a member, otherwise it throws.
export async function getBoardForUser(boardId, userId) {
  if (!mongoose.isValidObjectId(boardId)) throw new HttpError(404, 'Board not found');
  const board = await Board.findById(boardId);
  if (!board) throw new HttpError(404, 'Board not found');
  if (!board.members.some((m) => m.equals(userId))) {
    throw new HttpError(403, 'You are not a member of this board');
  }
  return board;
}

export function assertOwner(board, userId) {
  if (!board.owner.equals(userId)) throw new HttpError(403, 'Only the board owner can do that');
}

export function assertObjectId(id, label = 'Item') {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, `${label} not found`);
}
