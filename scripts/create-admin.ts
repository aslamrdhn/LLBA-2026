import { prisma } from "../server/lib/prisma.ts";
import { z } from "zod";

const emailSchema = z.string().email("Format email tidak valid");

async function main() {
  const args = process.argv.slice(2);
  let email: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      email = args[i + 1].trim().toLowerCase();
      break;
    }
  }

  if (!email) {
    console.error("❌ Argumen --email diperlukan. Contoh: npm run admin:create -- --email admin@example.com");
    process.exit(1);
  }

  const parseResult = emailSchema.safeParse(email);
  if (!parseResult.success) {
    console.error(`❌ ${parseResult.error.issues[0].message}`);
    process.exit(1);
  }

  const validEmail = parseResult.data;

  try {
    const existing = await prisma.userProfile.findUnique({
      where: { email: validEmail },
    });

    if (existing) {
      const updated = await prisma.userProfile.update({
        where: { id: existing.id },
        data: {
          role: "SUPER_ADMIN",
          status: "active",
        },
      });
      console.log(`✅ User Profile '${validEmail}' berhasil diangkat menjadi SUPER_ADMIN (ID: ${updated.id})`);
    } else {
      const created = await prisma.userProfile.create({
        data: {
          userId: `admin_${Date.now()}`,
          email: validEmail,
          fullName: "Super Admin",
          role: "SUPER_ADMIN",
          status: "active",
        },
      });
      console.log(`✅ Super Admin baru berhasil dibuat untuk '${validEmail}' (ID: ${created.id})`);
    }
  } catch (error: any) {
    console.error("❌ Gagal membuat/memperbarui Super Admin:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
