import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import Activity from '../models/Activity.js';

const day = 24 * 60 * 60 * 1000;

// A ready-made board so a new visitor never lands on an empty screen
export async function createStarterBoard(user) {
  const board = await Board.create({
    title: 'Welcome to Flowspace',
    description: 'A sample board. Drag cards around, open one, and invite a teammate to watch it update live.',
    color: 'indigo',
    owner: user._id,
    members: [user._id],
  });

  const lists = await List.insertMany(
    ['To do', 'In progress', 'Done'].map((title, position) => ({ board: board._id, title, position }))
  );

  const samples = [
    [0, 'Invite a teammate with the Share button', ['feature'], 'Open Share, copy the invite link, and open it in a private window. Every move you make shows up there instantly.', 2],
    [0, 'Drag this card into another column', [], 'Cards and columns can both be reordered by dragging.', null],
    [0, 'Open a card to add details', ['docs'], 'Labels, due dates, assignees and comments all live in here.', 5],
    [1, 'Design the onboarding flow', ['design', 'urgent'], 'Keep it under three steps.', 1],
    [1, 'Fix the sign-in redirect bug', ['bug'], '', -1],
    [2, 'Set up the project', ['feature'], '', null],
  ];

  const counters = {};
  await Card.insertMany(
    samples.map(([listIndex, title, labels, description, dueInDays]) => {
      counters[listIndex] = (counters[listIndex] ?? -1) + 1;
      return {
        board: board._id,
        list: lists[listIndex]._id,
        title,
        labels,
        description,
        position: counters[listIndex],
        dueDate: dueInDays === null ? null : new Date(Date.now() + dueInDays * day),
        assignees: listIndex === 1 ? [user._id] : [],
        createdBy: user._id,
      };
    })
  );

  await Activity.create({ board: board._id, user: user._id, text: 'created this board' });
  return board;
}
