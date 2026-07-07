import mongoose from "mongoose";
import { env } from "./env.js";

const globalForMongoose = globalThis as unknown as { mongooseConn?: typeof mongoose };

export async function connectDatabase(): Promise<void> {
  if (globalForMongoose.mongooseConn?.connection.readyState === 1) return;
  await mongoose.connect(env.MONGODB_URI);
  globalForMongoose.mongooseConn = mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export async function checkDatabaseConnection(): Promise<boolean> {
  return mongoose.connection.readyState === 1;
}

export { mongoose };
