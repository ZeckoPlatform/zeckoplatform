import { db } from "@db";
import { analyticsLogs } from "@db/schema";
import { eq, and, gte } from "drizzle-orm";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

interface LoginAttempt {
  ip: string;
  email: string;
  timestamp: Date;
  successful: boolean;
  userId?: number;
}

export async function checkLoginAttempts(ip: string, email: string): Promise<{
  allowed: boolean;
  remainingAttempts?: number;
  lockoutEndTime?: Date;
}> {
  const lockoutStart = new Date(Date.now() - LOCKOUT_DURATION);

  // Get recent failed login attempts
  const recentAttempts = await db
    .select()
    .from(analyticsLogs)
    .where(
      and(
        eq(analyticsLogs.event_type, "login"),
        eq(analyticsLogs.ip_address, ip),
        gte(analyticsLogs.created_at, lockoutStart)
      )
    );

  // Filter failed attempts and get the count
  const failedAttempts = recentAttempts.filter(
    (attempt) => attempt.metadata?.successful === false
  );

  if (failedAttempts.length >= MAX_LOGIN_ATTEMPTS) {
    const mostRecentAttempt = failedAttempts[failedAttempts.length - 1];
    const lockoutEnd = new Date(
      new Date(mostRecentAttempt.created_at).getTime() + LOCKOUT_DURATION
    );

    if (lockoutEnd > new Date()) {
      return {
        allowed: false,
        lockoutEndTime: lockoutEnd,
      };
    }
  }

  return {
    allowed: true,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - failedAttempts.length,
  };
}

export async function recordLoginAttempt(attempt: LoginAttempt) {
  await db.insert(analyticsLogs).values({
    user_id: attempt.userId || 0, // Use 0 for unsuccessful attempts
    event_type: "login",
    ip_address: attempt.ip,
    metadata: {
      email: attempt.email,
      successful: attempt.successful,
    },
    created_at: attempt.timestamp,
  });
}