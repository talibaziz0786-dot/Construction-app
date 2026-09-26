import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017/construction-app';
  
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB Connected...');
  } catch (err: unknown) {
    // Graceful degradation - log warning, continue with in-memory store
    const message = err instanceof Error ? err.message : 'MongoDB connection failed';
    console.warn(`[database] MongoDB unavailable, using in-memory fallback: ${message}`);
    // Do NOT exit; let routes operate in guest/in-memory mode
  }
};

export default connectDB;
