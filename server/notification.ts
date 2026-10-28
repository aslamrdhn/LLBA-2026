import { logger } from "./logger.js";
import { env } from "./env.ts";

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(
        `[RETRY] Operation failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms. Error: ${error.message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}

export async function sendBrevoEmail(
  toEmail: string,
  subject: string,
  htmlContent: string,
) {
  const apiKey = env.BREVO_API_KEY || process.env.BREVO_API_KEY;
  logger.info(
    `[BREVO DISPATCH] Preparing transactional email to: ${toEmail}. Subject: "${subject}"`,
  );

  if (!apiKey) {
    logger.warn(
      "[BREVO WARNING] BREVO_API_KEY is missing. Email will NOT be sent.",
    );
    throw new Error(
      "Konfigurasi email (BREVO_API_KEY) belum disetel. Hubungi admin.",
    );
  }

  try {
    const success = await executeWithRetry(
      async () => {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: "LedgerLine Security Hub",
              email: env.BREVO_SENDER || "admin@ledgerline.local",
            },
            to: [
              {
                email: toEmail,
              },
            ],
            subject: subject,
            htmlContent: htmlContent,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API returned error status ${response.status}: ${errorText}`,
          );
        }

        const result = await response.json();
        logger.info(
          `[BREVO SUCCESS] Email successfully dispatched: ${JSON.stringify(result)}`,
        );
        return true;
      },
      3,
      1000,
    );
    return success;
  } catch (err: any) {
    logger.error(
      `[BREVO ERROR] Failed to send email via Brevo after retries: ${err.message}`,
    );
    return false;
  }
}
