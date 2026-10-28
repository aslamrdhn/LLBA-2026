import { Decimal } from "decimal.js";
import { PrismaTransaction } from "../../lib/prisma.ts";

export interface IAllocationItem {
  itemId: string;
  quantity: Decimal;
  warehouseId: string;
  salesDetailId: string;
}

export interface IAllocateCostResult {
  totalHpp: Decimal;
  items: {
    itemId: string;
    quantity: Decimal;
    unitCost: Decimal;
    totalCost: Decimal;
    salesDetailId: string;
  }[];
}

export interface IPurchaseCostResult {
  newAverageCost: Decimal;
  fifoLayersUpdated: number;
}

export interface ICostEngine {
  getCurrentUnitCost(
    itemId: string,
    tenantId: string,
    warehouseId: string,
  ): Promise<Decimal>;
  allocateSalesCost(
    allocations: IAllocationItem[],
    salesId: string,
    tenantId: string,
    outletId: string,
    tx?: PrismaTransaction,
  ): Promise<IAllocateCostResult>;
  processPurchase(
    purchase: {
      itemId: string;
      quantity: Decimal;
      unitCost: Decimal;
      warehouseId: string;
      purchaseOrderId: string;
    },
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<IPurchaseCostResult>;
  rollbackSalesAllocation(
    salesId: string,
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<void>;
  adjustStock(
    adjustment: {
      itemId: string;
      quantity: Decimal;
      warehouseId: string;
      reason: string;
      unitCost?: Decimal;
    },
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<void>;
}
