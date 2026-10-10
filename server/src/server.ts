import app from './app';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import mongoose from 'mongoose';

dotenv.config();

const PORT = process.env.PORT || 3000;

// --- Minimal env validation ---
// MONGODB_URI is always required: the server must never silently fall back to
// a localhost database outside local development.
// In production, JWT_SECRET and FRONTEND_URL are also required so a deployed
// instance can never fall back to a known default signing secret or to a
// localhost-only CORS allowlist (both would be silent security/config failures).
const requiredEnvVars: string[] = ['MONGODB_URI'];
if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('JWT_SECRET', 'FRONTEND_URL');
}

const missing = requiredEnvVars.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(
    '[startup] Missing required environment variables:',
    missing.join(', ')
  );
  console.error('[startup] Copy server/.env.example to server/.env (locally) or set them in the hosting dashboard (e.g. Render).');
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

