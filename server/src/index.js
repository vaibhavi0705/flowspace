import 'dotenv/config';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

const { PORT = 5000, MONGODB_URI, JWT_SECRET } = process.env;

if (!MONGODB_URI || !JWT_SECRET) {
  console.error('Missing MONGODB_URI or JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const { server } = createApp();

connectDB(MONGODB_URI)
  .then(() => {
    server.listen(PORT, () => console.log(`Flowspace API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
