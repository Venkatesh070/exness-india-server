import {
  AuthUser,
  EmailOtp,
  RefreshToken,
  Profile,
  Kyc,
  BankAccount,
  type AuthUserDoc,
  type ProfileDoc,
  type KycDoc,
} from "../models/index.js";

function mapAuthUser(doc: AuthUserDoc) {
  return {
    id: doc._id,
    firebaseUid: doc.firebaseUid ?? null,
    email: doc.email,
    passwordHash: doc.passwordHash,
    emailVerified: doc.emailVerified,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function loadUserWithRelations(userId: string) {
  const user = await AuthUser.findById(userId).lean();
  if (!user) return null;
  const [profile, kyc, bankAccounts] = await Promise.all([
    Profile.findOne({ userId }).lean(),
    Kyc.findOne({ userId }).lean(),
    BankAccount.find({ userId }).lean(),
  ]);
  return {
    ...mapAuthUser(user as AuthUserDoc),
    profile: profile
      ? {
          id: profile._id,
          userId: profile.userId,
          firstName: profile.firstName ?? null,
          lastName: profile.lastName ?? null,
          dob: profile.dob ?? null,
          gender: profile.gender ?? null,
          occupation: profile.occupation ?? null,
          income: profile.income ?? null,
          address: profile.address ?? null,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }
      : null,
    kyc: kyc
      ? {
          id: kyc._id,
          userId: kyc.userId,
          status: kyc.status,
          pan: kyc.pan ?? null,
          panVerified: kyc.panVerified,
          aadhaarReference: kyc.aadhaarReference ?? null,
          aadhaarVerified: kyc.aadhaarVerified,
          selfieUrl: kyc.selfieUrl ?? null,
          addressVerified: kyc.addressVerified,
          createdAt: kyc.createdAt,
          updatedAt: kyc.updatedAt,
        }
      : null,
    bankAccounts: bankAccounts.map((a) => ({
      id: a._id,
      userId: a.userId,
      bankName: a.bankName,
      accountHolder: a.accountHolder,
      accountNumberEncrypted: a.accountNumberEncrypted,
      ifsc: a.ifsc,
      verified: a.verified,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
  };
}

export const userRepo = {
  findByEmail: async (email: string) => {
    const doc = await AuthUser.findOne({ email: email.toLowerCase() }).lean();
    return doc ? mapAuthUser(doc as AuthUserDoc) : null;
  },
  findById: (id: string) => loadUserWithRelations(id),
  create: async (data: {
    email: string;
    passwordHash: string;
    firebaseUid: string | null;
    emailVerified: boolean;
  }) => {
    const user = await AuthUser.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      firebaseUid: data.firebaseUid ?? undefined,
      emailVerified: data.emailVerified,
      status: "ACTIVE",
    });
    await Promise.all([
      Profile.create({ userId: user._id }),
      Kyc.create({ userId: user._id }),
    ]);
    return loadUserWithRelations(user._id);
  },
  update: async (
    id: string,
    data: Partial<{
      passwordHash: string;
      firebaseUid: string | null;
      emailVerified: boolean;
      status: "ACTIVE" | "SUSPENDED" | "PENDING";
    }>,
  ) => {
    await AuthUser.findByIdAndUpdate(id, {
      ...data,
      firebaseUid: data.firebaseUid ?? undefined,
    });
    return loadUserWithRelations(id);
  },
};

export const otpRepo = {
  create: async (data: {
    email: string;
    otpHash: string;
    passwordEnc: string;
    expiresAt: Date;
    purpose?: "register" | "login";
    name?: string;
    country?: string;
    userId?: string;
  }) => {
    const doc = await EmailOtp.create(data);
    return {
      id: doc._id,
      email: doc.email,
      purpose: doc.purpose as "register" | "login",
      otpHash: doc.otpHash,
      passwordEnc: doc.passwordEnc,
      name: doc.name ?? null,
      country: doc.country ?? null,
      expiresAt: doc.expiresAt,
      attempts: doc.attempts,
      verified: doc.verified,
      createdAt: doc.createdAt,
      userId: doc.userId ?? null,
    };
  },
  findLatest: async (email: string, purpose?: "register" | "login") => {
    const query: Record<string, unknown> = {
      email: email.toLowerCase(),
      verified: false,
    };
    if (purpose) query.purpose = purpose;

    const doc = await EmailOtp.findOne(query).sort({ createdAt: -1 }).lean();
    if (!doc) return null;
    return {
      id: doc._id,
      email: doc.email,
      purpose: doc.purpose as "register" | "login",
      otpHash: doc.otpHash,
      passwordEnc: doc.passwordEnc,
      name: doc.name ?? null,
      country: doc.country ?? null,
      expiresAt: doc.expiresAt,
      attempts: doc.attempts,
      verified: doc.verified,
      createdAt: doc.createdAt,
      userId: doc.userId ?? null,
    };
  },
  markVerified: (id: string) => EmailOtp.findByIdAndUpdate(id, { verified: true }),
  incrementAttempts: (id: string) =>
    EmailOtp.findByIdAndUpdate(id, { $inc: { attempts: 1 } }),
  invalidateOld: (email: string, purpose?: "register" | "login") => {
    const query: Record<string, unknown> = {
      email: email.toLowerCase(),
      verified: false,
    };
    if (purpose) query.purpose = purpose;
    return EmailOtp.updateMany(query, { verified: true });
  },
};

export const refreshTokenRepo = {
  create: async (userId: string, token: string, expiresAt: Date) => {
    const doc = await RefreshToken.create({ userId, token, expiresAt });
    return {
      id: doc._id,
      userId: doc.userId,
      token: doc.token,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    };
  },
  findByToken: async (token: string) => {
    const doc = await RefreshToken.findOne({ token }).lean();
    if (!doc) return null;
    return {
      id: doc._id,
      userId: doc.userId,
      token: doc.token,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    };
  },
  deleteByToken: (token: string) => RefreshToken.deleteOne({ token }),
  deleteAllForUser: (userId: string) => RefreshToken.deleteMany({ userId }),
};

export const profileRepo = {
  upsert: async (userId: string, data: Partial<ProfileDoc>) => {
    const doc = await Profile.findOneAndUpdate(
      { userId },
      { $set: data, $setOnInsert: { userId } },
      { upsert: true, new: true, lean: true },
    );
    return {
      id: doc!._id,
      userId: doc!.userId,
      firstName: doc!.firstName ?? null,
      lastName: doc!.lastName ?? null,
      dob: doc!.dob ?? null,
      gender: doc!.gender ?? null,
      occupation: doc!.occupation ?? null,
      income: doc!.income ?? null,
      address: doc!.address ?? null,
      createdAt: doc!.createdAt,
      updatedAt: doc!.updatedAt,
    };
  },
  findByUserId: async (userId: string) => {
    const doc = await Profile.findOne({ userId }).lean();
    if (!doc) return null;
    return {
      id: doc._id,
      userId: doc.userId,
      firstName: doc.firstName ?? null,
      lastName: doc.lastName ?? null,
      dob: doc.dob ?? null,
      gender: doc.gender ?? null,
      occupation: doc.occupation ?? null,
      income: doc.income ?? null,
      address: doc.address ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
};

export const kycRepo = {
  upsert: async (userId: string, data: Partial<KycDoc>) => {
    const doc = await Kyc.findOneAndUpdate(
      { userId },
      { $set: data, $setOnInsert: { userId } },
      { upsert: true, new: true, lean: true },
    );
    return {
      id: doc!._id,
      userId: doc!.userId,
      status: doc!.status,
      pan: doc!.pan ?? null,
      panVerified: doc!.panVerified,
      aadhaarReference: doc!.aadhaarReference ?? null,
      aadhaarVerified: doc!.aadhaarVerified,
      selfieUrl: doc!.selfieUrl ?? null,
      addressVerified: doc!.addressVerified,
      createdAt: doc!.createdAt,
      updatedAt: doc!.updatedAt,
    };
  },
  findByUserId: async (userId: string) => {
    const doc = await Kyc.findOne({ userId }).lean();
    if (!doc) return null;
    return {
      id: doc._id,
      userId: doc.userId,
      status: doc.status,
      pan: doc.pan ?? null,
      panVerified: doc.panVerified,
      aadhaarReference: doc.aadhaarReference ?? null,
      aadhaarVerified: doc.aadhaarVerified,
      selfieUrl: doc.selfieUrl ?? null,
      addressVerified: doc.addressVerified,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
};

export const bankRepo = {
  create: async (data: {
    userId: string;
    bankName: string;
    accountHolder: string;
    accountNumberEncrypted: string;
    ifsc: string;
  }) => {
    const doc = await BankAccount.create(data);
    return {
      id: doc._id,
      userId: doc.userId,
      bankName: doc.bankName,
      accountHolder: doc.accountHolder,
      accountNumberEncrypted: doc.accountNumberEncrypted,
      ifsc: doc.ifsc,
      verified: doc.verified,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
  findByUserId: async (userId: string) => {
    const docs = await BankAccount.find({ userId }).lean();
    return docs.map((doc) => ({
      id: doc._id,
      userId: doc.userId,
      bankName: doc.bankName,
      accountHolder: doc.accountHolder,
      accountNumberEncrypted: doc.accountNumberEncrypted,
      ifsc: doc.ifsc,
      verified: doc.verified,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  },
  verifyById: async (id: string) => {
    const doc = await BankAccount.findByIdAndUpdate(id, { verified: true }, { new: true, lean: true });
    if (!doc) return null;
    return {
      id: doc._id,
      userId: doc.userId,
      bankName: doc.bankName,
      accountHolder: doc.accountHolder,
      accountNumberEncrypted: doc.accountNumberEncrypted,
      ifsc: doc.ifsc,
      verified: doc.verified,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
};

export function sanitizeUser(
  user: Awaited<ReturnType<typeof loadUserWithRelations>> extends infer T ? NonNullable<T> : never,
) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    status: user.status,
    createdAt: user.createdAt,
    profile: user.profile,
    kyc: user.kyc ? { status: user.kyc.status, panVerified: user.kyc.panVerified } : null,
  };
}
