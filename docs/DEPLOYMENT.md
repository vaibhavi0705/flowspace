# Deployment Guide

From your computer to a live link on your resume. Total time: about 45 minutes the first time.

**What goes where**

| Part | Service | Cost |
| --- | --- | --- |
| Database | MongoDB Atlas | Free (M0 cluster) |
| API (Express + Socket.io) | Render | Free tier |
| Frontend (React) | Vercel | Free |
| Code | GitHub | Free |

> Websockets need a server that stays running, so the API goes on **Render**, not Vercel. Service dashboards change their labels now and then, so if a button is named slightly differently, look for the closest match.

---

## Step 0: Run it locally first

Make sure it works on your machine before you deploy.

```bash
npm run install:all
cp server/.env.example server/.env      # Windows: copy server\.env.example server\.env
```

Edit `server/.env`:

- `MONGODB_URI`: use `mongodb://127.0.0.1:27017/flowspace` if MongoDB is installed locally, or your Atlas string from Step 2.
- `JWT_SECRET`: generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Start both parts in two terminals:

```bash
npm run dev:server     # terminal 1
npm run dev:client     # terminal 2
```

Open http://localhost:5173 → **Try the live demo**. Drag a card. Open the Share dialog, copy the link, open it in a private window and check that both windows update.

---

## Step 1: Upload to GitHub

### 1.1 Install and set up Git (once)

```bash
git --version                                   # if this fails, install Git from https://git-scm.com
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 1.2 Create the repository on GitHub

1. Sign in at https://github.com and click **New repository** (the **+** icon, top right).
2. Name it `flowspace`.
3. Add a short description, for example: *Real-time collaborative board built with the MERN stack and Socket.io.*
4. Choose **Public** (recruiters need to see it).
5. **Do not** tick "Add a README", ".gitignore" or a license. The project already has them.
6. Click **Create repository**. Keep the page open; you will need the URL.

### 1.3 Push your code

Run these from the **project root** (the folder that contains `client`, `server` and `README.md`):

```bash
git init
git add .
git status                  # check: you should NOT see .env or node_modules in this list
git commit -m "Initial commit: Flowspace real-time collaboration platform"
git branch -M main
git remote add origin https://github.com/<your-username>/flowspace.git
git push -u origin main
```

If Git asks you to sign in, use your GitHub username and a **personal access token** as the password (GitHub → Settings → Developer settings → Personal access tokens), or sign in through the browser prompt / GitHub Desktop / VS Code's "Publish to GitHub" button.

> **Safety check:** open your repo on GitHub and confirm there is no `.env` file anywhere. Only `.env.example` files should be there. If you ever commit a real secret by accident, change it immediately (new `JWT_SECRET`, new database password).

### 1.4 Make the repo look professional

- Add **topics** (gear icon next to "About"): `mern`, `react`, `nodejs`, `express`, `mongodb`, `socket-io`, `real-time`.
- Add your live link in the "About" website field once deployed.
- Pin the repo on your GitHub profile.
- Add 2 or 3 screenshots to the README (create a `docs/screenshots` folder, then reference them with `![Board](docs/screenshots/board.png)`).
- Make small, meaningful commits as you improve things. A history with several commits looks more natural than one giant commit.

---

## Step 2: Database on MongoDB Atlas

1. Sign up at https://www.mongodb.com/atlas and create a **free (M0)** cluster. Pick a region near you (for example Mumbai).
2. **Database Access** → **Add New Database User**: choose a username and a password. Use letters and numbers only for the password, so you do not need to URL-encode it. Give it **Read and write to any database**.
3. **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`). Render's IP addresses change, so this is needed on the free tier.
4. **Database** → **Connect** → **Drivers** → copy the connection string. It looks like:

   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

5. Replace `<password>` with your password and add the database name before the `?`:

   ```
   mongodb+srv://myuser:mypass123@cluster0.xxxxx.mongodb.net/flowspace?retryWrites=true&w=majority
   ```

Keep this string; it is your `MONGODB_URI`. You can also put it in `server/.env` to test your local server against Atlas.

---

## Step 3: Deploy the API on Render

1. Sign up at https://render.com with your GitHub account.
2. **New +** → **Web Service** → connect your `flowspace` repository.
3. Fill in:

   | Field | Value |
   | --- | --- |
   | Name | `flowspace-api` (this becomes part of the URL) |
   | Region | Closest to you |
   | Branch | `main` |
   | **Root Directory** | `server` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free |

4. Under **Environment Variables**, add:

   | Key | Value |
   | --- | --- |
   | `MONGODB_URI` | Your Atlas string from Step 2 |
   | `JWT_SECRET` | A long random string (generate a new one for production) |
   | `CLIENT_URL` | `http://localhost:5173` for now (you will change it in Step 5) |
   | `NODE_ENV` | `production` |

5. Click **Create Web Service** and wait for the deploy to finish ("Your service is live").
6. Open `https://<your-service>.onrender.com/api/health`. You should see `{"status":"ok", ...}`.

Copy your API URL (for example `https://flowspace-api.onrender.com`).

---

## Step 4: Deploy the frontend on Vercel

1. Sign up at https://vercel.com with GitHub.
2. **Add New…** → **Project** → import `flowspace`.
3. Configure:

   | Field | Value |
   | --- | --- |
   | **Root Directory** | `client` (click Edit and choose the folder) |
   | Framework Preset | Vite (detected automatically) |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

4. Under **Environment Variables**, add:

   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | Your Render URL, for example `https://flowspace-api.onrender.com` (no trailing slash, no `/api`) |

5. Click **Deploy**. When it finishes you get a URL such as `https://flowspace.vercel.app`.

> `client/vercel.json` is already included. It makes page refreshes on routes like `/board/123` work.

---

## Step 5: Connect the two

The API only accepts requests from origins it knows about.

1. Go back to **Render → your service → Environment**.
2. Change `CLIENT_URL` to your Vercel URL, exactly, with no trailing slash:
   `https://flowspace.vercel.app`
   (Several origins can be separated by commas, for example if you add a custom domain later.)
3. Save. Render redeploys automatically.

If you change `VITE_API_URL` later, redeploy the frontend on Vercel, because Vite bakes it in at build time.

---

## Step 6: Test checklist

Open your Vercel URL and check each item:

- [ ] Landing page loads, **Try the live demo** opens the dashboard
- [ ] You see the sample board with cards
- [ ] Drag a card between columns, refresh, and it stays there
- [ ] Open a card: add a label, due date, comment
- [ ] **Share** → copy the invite link → open it in a private window → continue as guest
- [ ] Move a card in one window; the other updates without refresh
- [ ] The **online** avatars show both users
- [ ] Register with a real email, sign out, sign in again
- [ ] Dark mode toggle works

Once this passes, update the README with your live links and add them to your resume, LinkedIn and the GitHub "About" box.

---

## Step 7: Live demo script (2 to 3 minutes)

Before the interview, open the site once so the free API is awake.

1. **Open with the point:** "This is Flowspace, a real-time Kanban board. Everything you see syncs live between users."
2. Click **Try the live demo**. "This creates a guest account and a starter board, so there is no sign-up friction."
3. **Drag a card** and then a **column**. "These updates are optimistic: the UI changes instantly and the server catches up."
4. **Open a card**: add a label, due date, assignee, comment.
5. Click **Share**, copy the link, open it in a **private window** and continue as guest. "Second user, same board."
6. Put both windows side by side. Move a card in one. "Notice the other window updates with no refresh. That is a Socket.io room for this board."
7. Point at the **online avatars** and the **Activity** panel.
8. Close with architecture in one sentence: "React on Vercel, Express and Socket.io on Render, MongoDB Atlas, JWT auth, and every route and socket join checks board membership."

If something is slow, say so calmly: "The free hosting tier sleeps when idle, so the first request takes a moment." It is normal and interviewers have seen it before.

---

## Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| First load takes 30 to 60 seconds | Render's free tier sleeps after about 15 minutes idle. Open the site before a demo. You can also ping `/api/health` every 10 minutes with a free uptime monitor to keep it awake. |
| Browser console shows a **CORS error** | `CLIENT_URL` on Render does not exactly match your Vercel URL (check `https`, no trailing slash, no typos). Fix it and let Render redeploy. |
| Login or guest button says it cannot reach the server | `VITE_API_URL` is missing or wrong on Vercel. Fix it, then **redeploy** the frontend. |
| Real-time updates do not work but the rest does | Same cause as CORS: the socket origin is checked against `CLIENT_URL`. Also confirm `VITE_API_URL` points to the Render URL. |
| Render logs show `MongooseServerSelectionError` | Atlas Network Access does not allow `0.0.0.0/0`, or the password in the URI is wrong. Special characters in a password must be URL-encoded. |
| Render logs show `Missing MONGODB_URI or JWT_SECRET` | Environment variables were not saved on Render. |
| Page refresh on `/board/...` gives a 404 on Vercel | The Root Directory is not set to `client`, so `vercel.json` was not picked up. |
| `git push` rejected or asks for a password | Use a personal access token instead of your account password, or sign in through GitHub Desktop or VS Code. |
| `.env` shows up in `git status` | The `.gitignore` is missing from the project root. Run `git rm --cached server/.env`, then commit. |

---

## After deploying

- Add the live link and the repo link to your resume, LinkedIn "Projects" section and GitHub profile.
- Record a 60 to 90 second screen capture of the two-window demo and add it to the README as a GIF or link. It is often the first thing a recruiter watches.
- Read `docs/INTERVIEW_GUIDE.md` again and practise the demo script twice out loud.
