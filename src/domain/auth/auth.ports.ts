import type {
  AuthResult,
  LoginInput,
  PasswordResetInput,
  RegisterInput,
  UserProfile,
} from "./auth.types";

export interface AuthRepository {
  signInWithPassword(input: LoginInput): Promise<AuthResult<UserProfile>>;
  signUp(input: RegisterInput): Promise<AuthResult<UserProfile>>;
  signOut(): Promise<AuthResult<{ signedOut: true }>>;
  resetPasswordForEmail(
    input: PasswordResetInput
  ): Promise<AuthResult<{ emailSent: true }>>;
  getCurrentSessionProfile(): Promise<AuthResult<UserProfile | null>>;
  updateOwnProfile(params: {
    userId: string;
    displayName: string;
    avatarPath: string | null;
  }): Promise<AuthResult<UserProfile>>;
}
