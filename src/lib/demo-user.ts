/**
 * Demo mode: returns the seeded demo user ID.
 * In v2, replace with real session/auth (NextAuth etc.)
 */
export const DEMO_USER_ID = 1;

export function getDemoUserId(): number {
  return DEMO_USER_ID;
}
