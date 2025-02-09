import { MailService } from '@sendgrid/mail';
import { db } from '@db';
import { users, emailTemplates, newsletters } from '@db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@zecko.app';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await mailService.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendNewsletterToAllUsers(newsletterId: number): Promise<{
  success: boolean;
  totalSent: number;
  errors: number;
}> {
  try {
    const [newsletter] = await db
      .select()
      .from(newsletters)
      .where(eq(newsletters.id, newsletterId))
      .limit(1);

    if (!newsletter) {
      throw new Error('Newsletter not found');
    }

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.active, true));

    let successCount = 0;
    let errorCount = 0;

    // Send emails in batches of 100
    const batchSize = 100;
    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);
      const emailPromises = batch.map(user =>
        sendEmail({
          to: user.email,
          subject: newsletter.subject,
          html: newsletter.htmlContent,
          text: newsletter.textContent,
        }).then(success => {
          if (success) successCount++;
          else errorCount++;
        })
      );

      await Promise.all(emailPromises);
    }

    // Update newsletter status and metadata
    await db
      .update(newsletters)
      .set({
        status: 'sent',
        sentAt: new Date(),
        metadata: {
          recipientCount: successCount,
        },
      })
      .where(eq(newsletters.id, newsletterId));

    return {
      success: true,
      totalSent: successCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error('Error sending mass email:', error);
    return {
      success: false,
      totalSent: 0,
      errors: 0,
    };
  }
}

export async function createNewsletterFromTemplate(
  templateId: number,
  subject: string,
  scheduledFor?: Date
): Promise<number | null> {
  try {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw new Error('Template not found');
    }

    const [newsletter] = await db
      .insert(newsletters)
      .values({
        subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        status: scheduledFor ? 'scheduled' : 'draft',
        scheduledFor,
      })
      .returning({ id: newsletters.id });

    return newsletter.id;
  } catch (error) {
    console.error('Error creating newsletter:', error);
    return null;
  }
}
