export interface AuthenticatedUser {
  id: string;
  userId: string;
  email: string;
  name: string;
  authProvider: string;
  sessionId: string;
}