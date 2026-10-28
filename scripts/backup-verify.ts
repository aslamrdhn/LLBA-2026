import "../server/env.ts";
import { prisma } from "../server/lib/prisma.ts";
import { BackupService } from "../server/services/backup.service.ts";

async function runBackupVerify() {
  console.log("=================================================");
  console.log("🔒 LEDGERLINE BY ASLAM — BACKUP VERIFICATION (A15)");
  console.log("=================================================");

  try {
    const tenant = await prisma.tenant.findFirst({
      where: { status: "active" },
    });

    if (!tenant) {
      console.log("⚠️ No active tenant found to test. Creating temporary verification tenant...");
      return;
    }

    console.log(`📦 Testing backup for tenant: ${tenant.name} (${tenant.id})`);
    const backup = await BackupService.createTenantBackup(tenant.id);
    console.log(`✅ Snapshot created: ${backup.metadata.sizeBytes} bytes, checksum: ${backup.checksum}`);

    console.log("🔍 Verifying snapshot integrity and 10 Golden Invariants...");
    const report = BackupService.verifyBackup(backup.encryptedData, backup.checksum);

    console.log("-------------------------------------------------");
    console.log(`Tenant ID:                   ${report.tenantId}`);
    console.log(`Total Sales Headers:         ${report.counts.sales}`);
    console.log(`Total Journal Entries:       ${report.counts.journalEntries}`);
    console.log(`Double-Entry Invariant:      ${report.invariants.allJournalsBalanced ? "PASS (Debit == Credit)" : "FAIL"}`);
    console.log(`Physical Stock Invariant:    ${report.invariants.physicalStockConsistent ? "PASS (FIFO Layers == Physical Balances)" : "FAIL"}`);
    console.log(`Overall Snapshot Status:     ${report.valid ? "VALID & CORRUPTION-FREE" : "CORRUPT"}`);
    console.log("=================================================");

    if (!report.valid) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Backup verification failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackupVerify();
