import crypto from 'node:crypto';
import Decimal from 'decimal.js';

export interface RecipeItemComponent {
  componentType: 'MATERIAL' | 'PACKAGING' | 'MODIFIER';
  itemId: string;
  itemName: string;
  quantity: Decimal.Value;
  unit: string;
  wastePercent: Decimal.Value;
}

export interface MenuRecipeSnapshotInput {
  tenantId: string;
  menuId: string;
  menuName: string;
  version: number;
  components: RecipeItemComponent[];
  effectiveFrom?: Date;
}

export interface RecipeVersionSnapshotData {
  tenantId: string;
  menuId: string;
  version: number;
  recipeHash: string;
  snapshotJson: string;
  effectiveFrom: Date;
}

/**
 * Creates a deterministic, SHA-256 signed RecipeVersionSnapshot (§5.2, §8.1)
 */
export function createRecipeSnapshot(input: MenuRecipeSnapshotInput): RecipeVersionSnapshotData {
  // Sort components deterministically by itemId and componentType
  const sortedComponents = [...input.components].sort((a, b) => {
    const compDiff = a.componentType.localeCompare(b.componentType);
    if (compDiff !== 0) return compDiff;
    return a.itemId.localeCompare(b.itemId);
  });

  const normalizedComponents = sortedComponents.map((c) => ({
    componentType: c.componentType,
    itemId: c.itemId,
    itemName: c.itemName,
    quantity: new Decimal(c.quantity).toString(),
    unit: c.unit,
    wastePercent: new Decimal(c.wastePercent).toString(),
  }));

  const snapshotObject = {
    menuId: input.menuId,
    menuName: input.menuName,
    version: input.version,
    components: normalizedComponents,
  };

  const snapshotJson = JSON.stringify(snapshotObject);
  const recipeHash = crypto.createHash('sha256').update(snapshotJson).digest('hex');

  return {
    tenantId: input.tenantId,
    menuId: input.menuId,
    version: input.version,
    recipeHash,
    snapshotJson,
    effectiveFrom: input.effectiveFrom || new Date(),
  };
}
