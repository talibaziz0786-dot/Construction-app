export enum WastageMethod {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  PRODUCT_SPECIFIC = 'product_specific',
  NONE = 'none',
}

export interface WastageRule {
  id: string;
  categoryOrMaterialId: string;
  method: WastageMethod;
  factor: number; // e.g., 0.05 for 5%
  source: string;
  version: string;
}
