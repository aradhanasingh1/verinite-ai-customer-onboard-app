// app/api/audit/risk-tolerance/storage.ts
// Shared in-memory storage for risk tolerance
// In production, this would be replaced with a database

export interface RiskToleranceRecord {
  level: 'HIGH' | 'LOW';
  setBy: string;
  setAt: string;
  previousLevel?: 'HIGH' | 'LOW';
}

// Singleton storage instance
class RiskToleranceStorage {
  private store = new Map<string, RiskToleranceRecord>();

  get(applicationId: string): RiskToleranceRecord | undefined {
    return this.store.get(applicationId);
  }

  set(applicationId: string, record: RiskToleranceRecord): void {
    this.store.set(applicationId, record);
  }

  has(applicationId: string): boolean {
    return this.store.has(applicationId);
  }

  delete(applicationId: string): boolean {
    return this.store.delete(applicationId);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

// Export singleton instance
export const riskToleranceStorage = new RiskToleranceStorage();
