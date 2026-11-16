# Flowspace

A real-time collaborative board for teams, built with the **MERN stack** and **Socket.io**.
Create boards, organise work in drag-and-drop columns, invite teammates with a link, and watch every change appear on everyone's screen instantly.

**Live demo:** _add your Vercel link here_ &nbsp;|&nbsp; **API:** _add your Render link here_

> Tip: click **Try the live demo**, then open the Share dialog, copy the invite link and open it in a private window. Move a card in one window and watch the other update.

---

## Features

- **Real-time sync.** Card and list changes propagate to every open tab through Socket.io rooms.
- **Live presence.** See who is on the board right now (a user with two tabs counts once).
- **Activity feed.** Every change is logged, saved and pushed live.
- **Drag and drop.** Reorder cards and move them between columns; reorder whole columns. Updates are optimistic, so the UI never waits for the network.
- **Rich cards.** Labels, due dates (with overdue / due soon states), assignees, descriptions and comments.
- **Collaboration.** Invite by link or by email, owner and member roles, leave or remove members.
- **Authentication.** JWT sessions, bcrypt-hashed passwords, protected routes, and a one-click guest account for demos.
- **Polished UI.** Responsive layout, dark mode, skeleton loaders, toasts, keyboard support (Esc, Enter), reduced-motion support.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, Vite, React Router, Axios, `@hello-pangea/dnd`, Socket.io client, plain CSS with design tokens |
| Backend | Node.js, Express, Socket.io, Zod (validation), Helmet, CORS, express-rate-limit |
| Database | MongoDB with Mongoose |
| Auth | JSON Web Tokens, bcryptjs |
| Deployment | Vercel (client), Render (API), MongoDB Atlas (database) |

## Architecture

```
 React (Vite)                         Express + Socket.io                  MongoDB
┌──────────────────┐   REST (JSON)   ┌────────────────────────┐          ┌──────────┐
│ Pages, state,    │ ──────────────▶ │ Routes → validation →  │ ───────▶ │ Users    │
│ optimistic UI    │                 │ authorisation → Mongoose│          │ Boards   │
│                  │ ◀────────────── │                        │ ◀─────── │ Lists    │
│ Socket.io client │   WebSocket     │ Socket.io rooms        │          │ Cards    │
│                  │ ◀─────────────▶ │ (one room per board)   │          │ Activity │
└──────────────────┘  presence/sync  └────────────────────────┘          └──────────┘
```

**How a change travels:** dragging a card updates the local state immediately, then sends `POST /api/cards/:id/move`. The server validates and saves it, then emits `board:sync` to everyone else in the board's room (the sender is excluded using its socket id). Those clients refetch the board snapshot. The activity entry is emitted to everyone, including the sender.

## Project structure

```
flowspace/
├── client/                      # React app (Vite)
│   └── src/
│       ├── api/client.js        # Axios instance: token + socket-id headers, error helper
│       ├── context/             # Auth, Theme and Toast providers
│       ├── components/          # ListColumn, CardItem, CardModal, ShareModal, ...
│       ├── pages/               # Landing, AuthPage, Dashboard, Board, JoinBoard
│       ├── utils/               # board.js (optimistic move), format.js, constants.js
│       ├── socket.js            # Single shared Socket.io connection
│       └── index.css            # Design tokens, light/dark themes, all styles
├── server/
│   └── src/
│       ├── app.js               # Builds Express + Socket.io, mounts middleware and routes
│       ├── index.js             # Entry point: connect to MongoDB, then listen
│       ├── models/              # User, Board, List, Card, Activity
│       ├── routes/              # auth, boards, lists, cards
│       ├── middleware/          # auth (JWT), validate (Zod), error handling
│       ├── sockets/index.js     # Socket auth, board rooms, presence tracking
│       └── utils/               # access control, realtime helpers, starter board
└── docs/
    ├── INTERVIEW_GUIDE.md       # How to explain and defend every part of the project
    └── DEPLOYMENT.md            # GitHub, MongoDB Atlas, Render and Vercel step by step
```

## Getting started

**Prerequisites:** Node.js 18+, and either a local MongoDB or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
# 1. Install everything
npm run install:all

# 2. Configure the server
cp server/.env.example server/.env
#    then edit server/.env: set MONGODB_URI and a long random JWT_SECRET

# 3. Run the API (terminal 1)
npm run dev:server        # http://localhost:5000

# 4. Run the client (terminal 2)
npm run dev:client        # http://localhost:5173
```

Open http://localhost:5173 and click **Try the live demo**.

### Environment variables

| File | Variable | Purpose |
| --- | --- | --- |
| `server/.env` | `MONGODB_URI` | MongoDB connection string |
| `server/.env` | `JWT_SECRET` | Secret used to sign tokens |
| `server/.env` | `CLIENT_URL` | Allowed frontend origin(s) for CORS and Socket.io |
| `server/.env` | `PORT` | API port (default 5000) |
| `client/.env` | `VITE_API_URL` | API origin in production (empty in development) |

## API overview

All routes except `/api/auth/*` and `/api/health` require `Authorization: Bearer <token>`.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` · `/login` · `/guest` | Create account, sign in, or start a guest session |
| GET | `/api/auth/me` | Current user |
| GET / POST | `/api/boards` | List my boards / create a board |
| GET | `/api/boards/:id` | Full board snapshot (lists, cards, members, activity) |
| PATCH / DELETE | `/api/boards/:id` | Rename or recolour / delete (owner) |
| POST | `/api/boards/join` | Join through an invite code |
| POST / DELETE | `/api/boards/:id/members[/:userId]` | Add by email, remove or leave |
| POST | `/api/boards/:boardId/lists` · `/lists/reorder` | Create a list / save column order |
| PATCH / DELETE | `/api/lists/:id` | Rename / delete a list |
| POST | `/api/lists/:listId/cards` | Create a card |
| PATCH / DELETE | `/api/cards/:id` | Update fields / delete |
| POST | `/api/cards/:id/move` | Move or reorder a card |
| POST | `/api/cards/:id/comments` | Add a comment |

### Socket events

| Direction | Event | Meaning |
| --- | --- | --- |
| client → server | `board:join` / `board:leave` | Enter or leave a board room (membership is checked) |
| server → client | `presence:update` | Current list of online users on the board |
| server → client | `board:sync` | Someone else changed the board, so refetch it |
| server → client | `activity:new` | A new activity entry |
| server → client | `member:removed` / `board:deleted` | Access changed |

## Security notes

- Passwords are hashed with bcrypt and never returned by queries (`select: false`).
- Every board, list and card route re-checks that the caller is a member of the board; the socket join does the same.
- Request bodies are validated with Zod; Helmet sets secure headers; auth routes are rate limited.
- CORS and Socket.io only accept the origins listed in `CLIENT_URL`.

## Ideas for future work

- Redis adapter for Socket.io so the API can scale across multiple instances
- Granular socket events (patching state) instead of refetching the snapshot
- Automated tests (Jest and Supertest) and a GitHub Actions pipeline
- File attachments, notifications, and cleanup of old guest accounts

## License

MIT
