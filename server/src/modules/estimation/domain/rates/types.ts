export interface RateContext {
  location: string;
  brand?: string;
  grade?: string;
  supplier?: string;
  date: Date;
}

export interface MaterialRate {
  id: string;
  materialId: string;
  amount: number;
  currency: string;
  unit: string;
  source: 'user-entered' | 'supplier' | 'market-observation' | 'official-source' | 'imported' | 'system-default';
  context: RateContext;
  effectiveFrom: Date;
  effectiveTo?: Date;
}
