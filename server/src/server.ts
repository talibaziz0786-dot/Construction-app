import app from './app';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import mongoose from 'mongoose';

dotenv.config();

const PORT = process.env.PORT || 3000;

// --- Environment config with sensible defaults for MVP ---
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/construction-app';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// --- Minimal env validation ---
const requiredEnvVars: Array<{ name: string; fallback?: string }> = [
  { name: 'MONGODB_URI' },
];

const missing = requiredEnvVars.filter(({ name, fallback }) => {
  if (process.env[name]) return false;
  if (fallback) return false;
  return true;
});

if (missing.length > 0) {
  console.error(
    '[startup] Missing required environment variables:',
    missing.map((v) => v.name).join(', ')
  );
  console.error('[startup] Copy server/.env.example to server/.env and configure values.');
  process.exit(1);
}

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  process.on('unhandledRejection', (err: Error) => {
    console.error(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(async () => {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(async () => {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
      process.exit(0);
    });
  });
};

startServer();

