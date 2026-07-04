export interface UserProfile {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  createdAt: number;
  country: string;
  twoFA: boolean;
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface AuthTokens {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface FirebaseSignInResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
  displayName?: string;
}

export interface DecodedToken {
  uid: string;
  email?: string;
  role?: string;
  emailVerified?: boolean;
}
