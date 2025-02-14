import { db } from "@db";
import { leads } from "@db/schema";
import { lt } from "drizzle-orm";
import { log } from "../vite";

export async function cleanupExpiredLeads() {
  try {
    const now = new Date();
    log(`Running lead cleanup at ${now.toISOString()}`);

    // Archive expired leads
    const [result] = await db
      .update(leads)
      .set({
        status: "expired",
        archived: true
      })
      .where(lt(leads.expires_at, now))
      .returning();

    const updatedCount = result?.id ? 1 : 0;
    log(`Archived ${updatedCount} expired leads`);

    return { success: true, archivedCount: updatedCount };
  } catch (error) {
    log(`Error during lead cleanup: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, error: String(error) };
  }
}
