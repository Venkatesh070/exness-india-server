import { connectDatabase } from "../config/database.js";
import {
  AppUser,
  Admin,
  AuthUser,
  EmailOtp,
  RefreshToken,
  Profile,
  Kyc,
  BankAccount,
} from "../models/index.js";

/** Ensure MongoDB collections and indexes exist. */
export async function runMigrations(): Promise<void> {
  await connectDatabase();
  await Promise.all([
    AppUser.init(),
    Admin.init(),
    AuthUser.init(),
    EmailOtp.init(),
    RefreshToken.init(),
    Profile.init(),
    Kyc.init(),
    BankAccount.init(),
  ]);
}
