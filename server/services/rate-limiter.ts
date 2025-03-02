import { db } from "@db";
import { analyticsLogs } from "@db/schema";
import { eq, and, gte } from "drizzle-orm";
import { log } from "../vite";

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
  lockoutMinutes?: number;
}> {
  try {
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

    log(`Found ${recentAttempts.length} recent login attempts for IP ${ip}`);

    // Filter failed attempts and get the count
    const failedAttempts = recentAttempts.filter(
      (attempt) => attempt.metadata && attempt.metadata.successful === false
    );

    if (failedAttempts.length >= MAX_LOGIN_ATTEMPTS) {
      const mostRecentAttempt = failedAttempts[failedAttempts.length - 1];
      if (mostRecentAttempt && mostRecentAttempt.created_at) {
        const lockoutEnd = new Date(
          mostRecentAttempt.created_at.getTime() + LOCKOUT_DURATION
        );

        if (lockoutEnd > new Date()) {
          const remainingMs = lockoutEnd.getTime() - Date.now();
          const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

          log(`Account locked out for ${remainingMinutes} more minutes`);
          return {
            allowed: false,
            lockoutEndTime: lockoutEnd,
            lockoutMinutes: remainingMinutes
          };
        }
      }
    }

    const remainingAttempts = MAX_LOGIN_ATTEMPTS - failedAttempts.length;
    log(`${remainingAttempts} login attempts remaining`);

    return {
      allowed: true,
      remainingAttempts,
    };
  } catch (error) {
    log(`Error checking login attempts: ${error}`);
    // On error, allow the login attempt but log the error
    return {
      allowed: true,
      remainingAttempts: MAX_LOGIN_ATTEMPTS,
    };
  }
}

export async function recordLoginAttempt(attempt: LoginAttempt) {
  try {
    await db.insert(analyticsLogs).values({
      user_id: attempt.userId || null,
      event_type: "login",
      ip_address: attempt.ip,
      metadata: {
        email: attempt.email,
        successful: attempt.successful,
      },
      created_at: attempt.timestamp,
    });

    log(`Login attempt recorded - Success: ${attempt.successful}, IP: ${attempt.ip}`);
  } catch (error) {
    log(`Error recording login attempt: ${error}`);
    // Don't throw the error - we don't want to break the login flow
    // if analytics logging fails
  }
}