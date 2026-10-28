import { prisma, withTenant, PrismaTransaction } from "../lib/prisma.ts";
import { LedgerError } from "../utils/errorCodes.ts";
import { Decimal } from "../utils/money.ts";
import { reserveNumbers } from "./numbering.service.ts";
import { CostEngineFactory } from "../domain/cost-engine/CostEngineFactory.ts";

export interface CreatePOItemInput {
  catalogId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreatePOParams {
  tenantId: string;
  supplierId: string;
  outletId: string;
  items: CreatePOItemInput[];
  notes?: string;
  createdBy?: string;
}

export interface ReceivePOItemInput {
  catalogId: string;
  itemId: string;
  quantityReceived: number;
  unitCost: number;
}

export interface ReceivePOParams {
  tenantId: string;
  purchaseOrderId: string;
  outletId: string;
  warehouseId: string;
  items: ReceivePOItemInput[];
  receivedBy?: string;
  notes?: string;
  receivedAt?: Date;
}

export class ProcurementService {
  /**
   * Internal Procurement: Create Purchase Order (§8.16)
   */
  static async createPurchaseOrder(params: CreatePOParams): Promise<{
    id: string;
    poNumber: string;
    totalAmount: Decimal;
  }> {
    const { tenantId, supplierId, outletId, items, notes, createdBy } = params;

    if (!items || items.length === 0) {
      throw new LedgerError("VAL-001", "Daftar item PO tidak boleh kosong.");
    }

    const year = new Date().getFullYear().toString();
    const [poSeq] = await reserveNumbers(prisma, tenantId, "PO", 1);
    const poNumber = `PO-${year}-${String(poSeq).padStart(6, "0")}`;

    let totalAmount = new Decimal(0);
    const poDetailsData = [];

    for (const item of items) {
      const qty = new Decimal(item.quantity);
      const price = new Decimal(item.unitPrice);

      if (qty.isNegative() || qty.isZero()) {
        throw new LedgerError("VAL-001", "Kuantitas pesanan PO harus lebih besar dari nol.");
      }

      if (price.isNegative()) {
        throw new LedgerError("VAL-001", "Harga satuan PO tidak boleh negatif.");
      }

      const lineTotal = qty.times(price).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
      totalAmount = totalAmount.plus(lineTotal);

      poDetailsData.push({
        catalogId: item.catalogId,
        quantity: qty.toNumber(),
        unitPrice: price.toNumber(),
        totalPrice: lineTotal.toNumber(),
        notes: item.notes,
      });
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        tenantId,
        supplierId,
        status: "PENDING",
        notes,
        createdBy,
        details: {
          create: poDetailsData,
        },
      },
    });

    return {
      id: po.id,
      poNumber: po.poNumber,
      totalAmount,
    };
  }

  /**
   * Internal Procurement: QC Receiving & Physical Inbound with Balanced Journal Entry (§8.16)
   */
  static async receivePurchaseOrder(params: ReceivePOParams): Promise<{
    receivingId: string;
    journalNumber: string;
    totalValue: Decimal;
    itemsCount: number;
  }> {
    const {
      tenantId,
      purchaseOrderId,
      outletId,
      warehouseId,
      items,
      receivedBy,
      notes,
      receivedAt = new Date(),
    } = params;

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
      include: { supplier: true },
    });

    if (!po) {
      throw new LedgerError("VAL-002", "Purchase Order tidak ditemukan pada tenant ini.");
    }

    if (po.status === "COMPLETED") {
      throw new LedgerError("VAL-001", "Purchase Order ini sudah selesai diterima (status COMPLETED).");
    }

    if (!items || items.length === 0) {
      throw new LedgerError("VAL-001", "Daftar barang yang diterima tidak boleh kosong.");
    }

    return withTenant(tenantId, async (tx: PrismaTransaction) => {
      const engine = await CostEngineFactory.getEngine(tenantId);
      let totalValue = new Decimal(0);
      const receivingDetailsData = [];

      for (const item of items) {
        const qtyDec = new Decimal(item.quantityReceived);
        const costDec = new Decimal(item.unitCost);

        if (qtyDec.isNegative() || qtyDec.isZero()) {
          throw new LedgerError("VAL-001", "Kuantitas penerimaan barang harus bernilai positif.");
        }

        if (costDec.isNegative() || costDec.isZero()) {
          throw new LedgerError("VAL-001", "Biaya satuan barang masuk harus lebih besar dari 0.");
        }

        const lineTotal = qtyDec.times(costDec).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
        totalValue = totalValue.plus(lineTotal);

        // 1. Process physical stock & costing engine
        await engine.processPurchase(
          {
            itemId: item.itemId,
            quantity: qtyDec,
            unitCost: costDec,
            warehouseId,
            purchaseOrderId: po.id,
          },
          tenantId,
          tx,
        );

        // 2. Append-only inventory ledger
        const currentBal = await tx.inventoryBalance.findFirst({
          where: { tenantId, itemId: item.itemId, warehouseId },
        });

        await tx.inventoryLedger.create({
          data: {
            tenantId,
            outletId,
            warehouseId,
            itemId: item.itemId,
            movementType: "PURCHASE_RECEIVING",
            referenceType: "PURCHASE_ORDER",
            referenceId: po.id,
            businessDate: receivedAt,
            qtyIn: qtyDec.toNumber(),
            qtyOut: 0,
            balanceAfter: currentBal?.currentStock || qtyDec.toNumber(),
            unitCost: costDec.toNumber(),
            costMethod: "FIFO/AVERAGE",
            unitSnapshot: "pcs",
          },
        });

        receivingDetailsData.push({
          catalogId: item.catalogId,
          itemId: item.itemId,
          quantityReceived: qtyDec.toNumber(),
          unitCost: costDec.toNumber(),
        });
      }

      // 3. Create Receiving and ReceivingDetails
      const receiving = await tx.receiving.create({
        data: {
          purchaseOrderId: po.id,
          tenantId,
          outletId,
          receivedAt,
          receivedBy,
          notes,
          details: {
            create: receivingDetailsData,
          },
        },
      });

      // 4. Update PO status
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: "COMPLETED",
          deliveredAt: receivedAt,
        },
      });

      // 5. Post Balanced Double-Entry Journal: Debit Persediaan (1100), Credit Hutang Usaha (2100)
      const year = receivedAt.getFullYear().toString();
      const [journalSeq] = await reserveNumbers(tx, tenantId, "JRN", 1);
      const journalNumber = `JRN-${year}-${String(journalSeq).padStart(6, "0")}`;

      const getOrCreateAccount = async (
        code: string,
        name: string,
        type: string,
        normalBalance: string,
      ) => {
        let acc = await tx.account.findUnique({
          where: { tenantId_code: { tenantId, code } },
        });
        if (!acc) {
          acc = await tx.account.create({
            data: {
              tenantId,
              code,
              name,
              type,
              normalBalance,
            },
          });
        }
        return acc;
      };

      const inventoryAccount = await getOrCreateAccount(
        "PERSEDIAAN",
        "Persediaan Bahan Baku",
        "ASSET",
        "DEBIT",
      );

      const payableAccount = await getOrCreateAccount(
        "HUTANG_USAHA",
        "Hutang Usaha Dagang",
        "LIABILITY",
        "CREDIT",
      );

      const valNum = totalValue.toNumber();

      await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber: journalNumber,
          entryDate: receivedAt,
          referenceType: "PURCHASE_RECEIVING",
          referenceId: receiving.id,
          description: `Penerimaan Barang PO ${po.poNumber} (${po.supplier?.name || "Supplier"})`,
          status: "POSTED",
          lines: {
            create: [
              { accountId: inventoryAccount.id, debit: valNum, credit: 0 },
              { accountId: payableAccount.id, debit: 0, credit: valNum },
            ],
          },
        },
      });

      return {
        receivingId: receiving.id,
        journalNumber,
        totalValue,
        itemsCount: receivingDetailsData.length,
      };
    });
  }
}
