// Pure helper used for optimistic drag-and-drop: returns a new cards array with one card moved.
// It mirrors the logic of POST /cards/:id/move on the server, so both sides agree on the result.
export function moveCardLocal(cards, cardId, toListId, index) {
  const next = cards.map((c) => ({ ...c }));
  const card = next.find((c) => c._id === cardId);
  if (!card) return cards;

  const fromListId = card.list;
  const byPosition = (a, b) => a.position - b.position;

  const destination = next.filter((c) => c.list === toListId && c._id !== cardId).sort(byPosition);
  destination.splice(Math.min(index, destination.length), 0, card);
  card.list = toListId;
  destination.forEach((c, i) => (c.position = i));

  if (fromListId !== toListId) {
    next
      .filter((c) => c.list === fromListId)
      .sort(byPosition)
      .forEach((c, i) => (c.position = i));
  }
  return next;
}

export function cardsForList(cards, listId) {
  return cards.filter((c) => c.list === listId).sort((a, b) => a.position - b.position);
}
