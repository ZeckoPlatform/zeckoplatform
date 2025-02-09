import { db } from "@db";
import { trialHistory, users } from "@db/schema";
import { eq, or, and } from "drizzle-orm";
import { addDays } from "date-fns";

export async function checkTrialEligibility(data: {
  email: string;
  companyNumber?: string;
  vatNumber?: string;
  utrNumber?: string;
  userType: "free" | "business" | "vendor";
}): Promise<{ eligible: boolean; reason?: string }> {
  try {
    // Check if email has been used for a trial before
    const [existingTrial] = await db
      .select()
      .from(trialHistory)
      .where(eq(trialHistory.email, data.email));

    if (existingTrial) {
      return {
        eligible: false,
        reason: "This email has already been used for a trial period",
      };
    }

    // For business accounts, check company number
    if (data.userType === "business" && data.companyNumber) {
      const [existingCompanyTrial] = await db
        .select()
        .from(trialHistory)
        .where(eq(trialHistory.company_number, data.companyNumber));

      if (existingCompanyTrial) {
        return {
          eligible: false,
          reason: "This company has already used a trial period",
        };
      }
    }

    // For vendor accounts or businesses with VAT, check VAT number
    if (data.vatNumber) {
      const [existingVatTrial] = await db
        .select()
        .from(trialHistory)
        .where(eq(trialHistory.vat_number, data.vatNumber));

      if (existingVatTrial) {
        return {
          eligible: false,
          reason: "This VAT number has already been used for a trial period",
        };
      }
    }

    // For vendors or self-employed businesses, check UTR
    if (data.utrNumber) {
      const [existingUtrTrial] = await db
        .select()
        .from(trialHistory)
        .where(eq(trialHistory.utr_number, data.utrNumber));

      if (existingUtrTrial) {
        return {
          eligible: false,
          reason: "This UTR number has already been used for a trial period",
        };
      }
    }

    // If we get here, the user is eligible for a trial
    return { eligible: true };
  } catch (error) {
    console.error("Error checking trial eligibility:", error);
    throw error;
  }
}

export async function recordTrialUsage(userId: number, data: {
  email: string;
  companyNumber?: string;
  vatNumber?: string;
  utrNumber?: string;
  userType: "business" | "vendor";
}): Promise<void> {
  try {
    const trialStartDate = new Date();
    const trialEndDate = addDays(trialStartDate, 30);

    await db.insert(trialHistory).values({
      email: data.email,
      company_number: data.companyNumber,
      vat_number: data.vatNumber,
      utr_number: data.utrNumber,
      trial_start_date: trialStartDate,
      trial_end_date: trialEndDate,
      user_type: data.userType,
    });

  } catch (error) {
    console.error("Error recording trial usage:", error);
    throw error;
  }
}

export async function isTrialExpired(userId: number): Promise<boolean> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    // Only check trial expiry for business and vendor accounts
    if (user.userType === "free") {
      return false;
    }

    const [trialRecord] = await db
      .select()
      .from(trialHistory)
      .where(eq(trialHistory.email, user.email));

    if (!trialRecord) {
      return false;
    }

    return new Date() > new Date(trialRecord.trial_end_date);
  } catch (error) {
    console.error("Error checking trial expiry:", error);
    throw error;
  }
}

// Function to check if account deletion is allowed
export async function canDeleteAccount(userId: number): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is in trial period
    const [trialRecord] = await db
      .select()
      .from(trialHistory)
      .where(eq(trialHistory.email, user.email));

    if (trialRecord && new Date() <= new Date(trialRecord.trial_end_date)) {
      return {
        allowed: false,
        reason: "Account cannot be deleted during trial period. Please wait until the trial expires or upgrade to a paid plan.",
      };
    }

    // Check if user has an active subscription
    if (user.subscriptionActive) {
      return {
        allowed: false,
        reason: "Please cancel your subscription before deleting your account.",
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Error checking account deletion eligibility:", error);
    throw error;
  }
}