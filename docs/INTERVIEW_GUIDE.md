# Interview Guide: Flowspace

How to explain, demo and defend this project. Read it once end to end, then run the app and follow each flow in the code with the guide beside you. Answers are written in the first person so you can say them aloud.

> **Before any interview:** run the project locally, click through every feature, and open the files mentioned below. Then make one small change of your own (rename something, add a field to a card, add a label). Being able to say "I added this" and show the diff is the strongest signal in a project interview.

---

## 1. The 30-second pitch

> "Flowspace is a real-time collaborative board, similar to Trello. Teams create boards with columns and cards, and when one person moves a card, everyone else on the board sees it instantly. I built it with the MERN stack and Socket.io. The interesting parts were real-time sync with rooms, optimistic drag-and-drop, presence tracking, and making sure every route and socket event checks board membership."

## 2. The 2-minute walkthrough (use this for the demo)

1. Landing page → **Try the live demo** (guest account, starter board created for you).
2. Drag a card to another column, then drag a whole column. "These update the UI immediately and sync to the server in the background."
3. Open a card: labels, due date, assignee, comment.
4. **Share** → copy invite link → open it in a private window as a second user.
5. Move a card in one window. "The other window updates without a refresh, via a Socket.io room for this board."
6. Point at the **online** avatars and the **activity** panel.
7. Toggle dark mode. "Theme is CSS variables, so it is a single attribute change."

## 3. Why this stack

| Choice | Reason |
| --- | --- |
| **MongoDB** | Board data is document-shaped (a card with labels, assignees, comments). Embedding comments in the card avoids joins, and the flexible schema made iterating fast. |
| **Express** | Minimal and explicit. I organised it as routes → middleware → models so each layer has one job. |
| **React + Vite** | Component model suits a board (List → Card). Vite gives fast dev and build. |
| **Socket.io** | Gives rooms, automatic reconnection and a fallback to long-polling. Raw WebSockets would have meant building that myself. |
| **Zod** | Validates and cleans request bodies in one place, with readable error messages. |
| **JWT** | Stateless auth that works the same for REST and for the socket handshake. |
| **`@hello-pangea/dnd`** | Maintained fork of react-beautiful-dnd with good accessibility and keyboard support. |

## 4. Folder walkthrough

### Server (`server/src`)

| File | What it does |
| --- | --- |
| `index.js` | Entry point. Checks env vars, connects to MongoDB, then starts listening. |
| `app.js` | Builds the Express app and Socket.io server, applies Helmet, CORS, JSON parsing, rate limiting, mounts routes. Separated from `index.js` so it can be imported in tests. |
| `models/*.js` | Mongoose schemas: **User, Board, List, Card, Activity**. |
| `routes/auth.js` | Register, login, guest, and `me`. |
| `routes/boards.js` | Board CRUD, full snapshot, join by invite code, member management. |
| `routes/lists.js` | Create, rename, delete, reorder lists. |
| `routes/cards.js` | Create, update, move, comment on, delete cards. |
| `middleware/auth.js` | `requireAuth`: verifies the JWT and attaches `req.user`. |
| `middleware/validate.js` | Runs a Zod schema against `req.body`. |
| `middleware/error.js` | One place that turns thrown errors into JSON responses. |
| `sockets/index.js` | Authenticates socket connections, manages board rooms, tracks presence. |
| `utils/access.js` | `getBoardForUser`: the single membership check used everywhere. |
| `utils/realtime.js` | `broadcast`, `broadcastAll`, `logChange`: emit to a board room and save activity. |
| `utils/starterBoard.js` | Seeds a sample board for new users so they never see an empty app. |

### Client (`client/src`)

| File | What it does |
| --- | --- |
| `App.jsx` | Provider stack and routes. |
| `context/AuthContext.jsx` | Holds the user, restores the session from the saved token, opens the socket. |
| `api/client.js` | Axios instance that adds the token and the socket id to every request. |
| `socket.js` | One shared Socket.io connection. |
| `pages/Board.jsx` | The core page: loads the snapshot, joins the room, handles drag and drop and all mutations. |
| `components/ListColumn.jsx`, `CardItem.jsx` | Draggable columns and cards. |
| `components/CardModal.jsx` | Card details: labels, due date, assignees, comments. |
| `components/ShareModal.jsx` | Invite link, add by email, member list. |
| `utils/board.js` | `moveCardLocal`: pure function for the optimistic move. |
| `index.css` | Design tokens (CSS variables) and all styles, light and dark. |

## 5. Data model

```
User      { name, email (unique), password (hashed, select:false), color, isGuest }
Board     { title, color, owner → User, members[] → User, inviteCode (unique) }
List      { board → Board, title, position }
Card      { board → Board, list → List, title, description, position,
            labels[], dueDate, assignees[] → User, comments[{ user, text }] }
Activity  { board → Board, user → User, text, createdAt }
```

- **Members live on the board** as an array that includes the owner, so "can this user see this board?" is a single check.
- **Cards store `board` as well as `list`**, so loading a whole board is one query (`Card.find({ board })`) instead of one per list.
- **Comments are embedded** in the card because they are always read with it and never queried on their own.
- **Indexes:** `Board.members`, `List.board`, `Card.board`, `Card.list`, and `Activity (board, createdAt)` for the activity feed.

## 6. Key flows (be able to trace these)

### A. Sign-in and session
1. `POST /api/auth/login` validates the body (Zod), loads the user with the password, compares with bcrypt, returns `{ token, user }`.
2. The client stores the token in `localStorage` and opens the Socket.io connection with the token in the handshake.
3. On a page refresh, `AuthContext` calls `GET /api/auth/me` with the saved token to restore the session.

### B. Moving a card (the most important flow)
1. `Board.jsx → onDragEnd` runs `moveCardLocal`, a pure function that returns a new cards array. The UI updates **immediately** (optimistic update).
2. The client sends `POST /api/cards/:id/move { toListId, index }`.
3. The server checks membership, rebuilds the destination order with the card inserted at `index`, closes the gap in the source list, and writes everything with one `bulkWrite`.
4. `logChange` saves an `Activity` document, emits `activity:new` to the whole room, and emits `board:sync` to everyone **except** the sender.
5. Other clients receive `board:sync` and refetch the board (debounced 150 ms).
6. If the request fails, the client shows a toast and reloads the real state, which rolls back the optimistic change.

### C. Real-time rooms and presence
- When a board opens, the client emits `board:join`. The server **checks membership first**, then joins the socket to the room `board:<id>`.
- Presence is a `Map(boardId → Map(userId → sockets))`. A user with two tabs appears once, and only disappears when both tabs close. Every change triggers `presence:update` to the room.

### D. Excluding the sender from broadcasts
The client sends its socket id in the `x-socket-id` header. The server calls `io.to(room).except(socketId)`, so the person who made the change does not refetch data they already have.

## 7. Design decisions and trade-offs (interviewers love these)

| Decision | Alternative | Why I chose this |
| --- | --- | --- |
| On `board:sync`, **refetch the snapshot** | Send granular events and patch state | Far simpler and always consistent. The cost is more data per update. For larger boards I would move to granular events. |
| **Integer positions**, reindexed on each move | Fractional indexing / linked list | Reindexing a list is one `bulkWrite` and boards are small. Fractional indexing avoids rewriting siblings and is the better choice at scale. |
| **JWT in `localStorage`** | httpOnly cookie | Simple and works across Vercel and Render domains. Trade-off: exposed to XSS, so a production app handling sensitive data should use httpOnly cookies with CSRF protection. |
| **Presence in memory** | Redis | Fine for one server instance. With several instances I would add the Socket.io Redis adapter and keep presence in Redis. |
| **Optimistic UI for drag and drop** | Wait for the server | Dragging must feel instant. Rollback by refetching keeps it safe. |
| **Guest accounts** | Demo only via sign-up | Lets a recruiter try the app in one click. They are real users with a random password. |

## 8. Likely questions and strong answers

**1. How does the real-time part work?**
Each board is a Socket.io room. After a mutation succeeds, the server emits an event to that room. Clients listening on the board page react by refetching or by appending the activity entry.

**2. How do you stop someone from joining a board's room without access?**
`board:join` runs the same `getBoardForUser` check as the REST routes. If the user is not a member, the server never joins them to the room. The socket connection itself also requires a valid JWT in the handshake.

**3. What happens if two people move cards at the same time?**
Each move is a separate request and the server applies them in the order they arrive (last write wins for position). Both clients end up consistent because they refetch after `board:sync`. A stricter approach is versioning (optimistic concurrency) or operational transforms, which I did not need for a task board.

**4. What if the network drops?**
Socket.io reconnects automatically. On `connect`, the client re-emits `board:join`, so presence is restored. Missed updates are picked up the next time a `board:sync` arrives or the page reloads. A further improvement is to refetch on reconnect.

**5. Why do you refetch instead of sending the changed data?**
Simplicity and correctness first. One code path produces the state, so clients cannot drift out of sync. I would optimise later if payload size became a problem.

**6. How is authentication implemented?**
bcrypt-hashed passwords, a JWT signed with a secret and a 7-day expiry. The `requireAuth` middleware verifies it and loads the user. The same token authenticates the Socket.io handshake.

**7. How do you secure the API?**
Helmet headers, CORS limited to my frontend origin, Zod validation on every body, rate limiting on auth routes, passwords excluded from queries, generic login errors so emails cannot be probed, and a membership check on every board-related route.

**8. Why separate `app.js` and `index.js`?**
`app.js` builds the app without starting it, so tests can import it and call it directly. `index.js` handles real-world startup concerns (env checks, DB connection, listening).

**9. How does drag and drop persist order?**
Each list and card has a numeric `position`. After a move, the server rebuilds the order of the affected lists and writes all positions in a single `bulkWrite`, so the database never has gaps or duplicates.

**10. Why are comments embedded but activity a separate collection?**
Comments are always read with their card and stay small. Activity grows without bound, is queried independently (latest 50 per board) and needs its own index, so it belongs in its own collection.

**11. How would you scale this?**
Run several API instances behind a load balancer, add the Socket.io Redis adapter so events reach clients on any instance, move presence into Redis, add database indexes for hot queries, paginate the activity feed, and cache board snapshots where useful.

**12. How would you test it?**
Unit-test pure functions like `moveCardLocal`. Integration-test the API with Jest and Supertest against an in-memory MongoDB. Test the socket flow with two `socket.io-client` instances in one test. End-to-end test the drag flow with Playwright.

**13. What is the hardest bug or challenge you hit?**
Ordering after a card moves between lists: I had to close the gap in the source list and insert at the right index in the destination, using the same logic on the client (optimistic) and the server so they agree. The other was making sure the person who made a change is not told to refetch, which I solved with the socket-id header.

**14. What would you improve with more time?**
Granular real-time events, Redis for scaling, automated tests and CI, httpOnly cookie auth, file attachments, notifications, and cleanup of old guest accounts.

**15. How do invite links work?**
Each board has a random `inviteCode`. Visiting `/join/<code>` requires being signed in (or continuing as a guest), then `POST /api/boards/join` adds the user to `members`. A production version would add expiry and the ability to revoke the code.

**16. What does `select: false` on the password do?**
Mongoose leaves the field out of every query unless I ask for it with `.select('+password')`. Only the login route does that, so the hash cannot leak through another endpoint by mistake.

**17. What is the `x-socket-id` header for?**
It tells the server which socket made the request so it can exclude that socket when broadcasting. Without it, the sender would refetch data it just updated.

**18. Why Vite and not Create React App?**
Faster dev server and builds, and Create React App is no longer maintained.

**19. How does dark mode work?**
All colours are CSS custom properties. A `data-theme` attribute on `<html>` swaps the values. A small inline script sets it before first paint to avoid a flash.

**20. How do you handle errors on the client?**
A single `errMsg` helper turns any Axios error into a friendly message, shown as a toast. For drag and drop, a failure reloads the server state to undo the optimistic change.

## 9. Honest limitations (say these before they ask)

- No automated tests yet (I describe how I would add them above).
- Presence is in memory, so it works for a single server instance.
- Guest accounts are not cleaned up automatically.
- On a free hosting tier the API sleeps when idle, so the first request can take about 30 to 60 seconds.

## 10. Be ready to code live

Small changes an interviewer might ask for, and where to make them:

| Request | Where |
| --- | --- |
| Add a **priority** field to cards | `models/Card.js`, the Zod `updateSchema` in `routes/cards.js`, then `CardModal.jsx` and `CardItem.jsx` |
| Add a new label | `config/constants.js` (server) and `utils/constants.js` (client) |
| Limit the number of members per board | `POST /api/boards/:id/members` and `/join` in `routes/boards.js` |
| Show a "typing" or "viewing card" indicator | New socket event in `sockets/index.js`, listener in `Board.jsx` |
| Add search or filter by label | Client-side filter in `ListColumn.jsx` |
| Archive instead of delete | Add `archived: Boolean` to `Card`, filter it in the snapshot query |

## 11. Resume bullets

- Built **Flowspace**, a real-time collaborative Kanban platform (React, Node, Express, MongoDB, Socket.io) with live presence, activity feed, and optimistic drag-and-drop.
- Designed per-board Socket.io rooms with server-side membership checks, sender-excluded broadcasts, and multi-tab presence tracking.
- Implemented JWT authentication, role-based board access, Zod request validation, rate limiting, and secure headers.
- Deployed the client on Vercel, the API on Render, and the database on MongoDB Atlas, with a one-click guest demo.
