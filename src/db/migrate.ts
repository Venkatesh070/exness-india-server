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
  UserWallet,
  UserTrading,
  NewsArticle,
  PaymentSettings,
  DepositRequest,
  WithdrawalRequest,
} from "../models/index.js";
import { generateUniqueAccountId } from "../utils/accountId.js";
import { seedNewsArticles } from "./seedNews.js";

async function backfillAccountIds(): Promise<void> {
  const users = await AppUser.find({
    $or: [{ accountId: { $exists: false } }, { accountId: null }, { accountId: "" }],
  })
    .select("_id")
    .lean();

  for (const user of users) {
    const accountId = await generateUniqueAccountId();
    await AppUser.findByIdAndUpdate(user._id, { accountId });
  }
}

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
    UserWallet.init(),
    UserTrading.init(),
    NewsArticle.init(),
    PaymentSettings.init(),
    DepositRequest.init(),
    WithdrawalRequest.init(),
  ]);
  await backfillAccountIds();
  await seedNewsArticles();
}
