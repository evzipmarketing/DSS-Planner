/**
 * Phase 2 will call the owner's Panchang engine through this interface.
 * Phase 1 keeps the contract and a client that fails closed.
 */
export type PanchangRequest = {
  dateIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  timeZone: string;
};

export type PanchangDay = {
  dateIso: string;
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunrise?: string;
  sunset?: string;
  notes?: string;
};

export interface PanchangClient {
  getDay(request: PanchangRequest): Promise<PanchangDay>;
}

export class UnconfiguredPanchangClient implements PanchangClient {
  async getDay(_request: PanchangRequest): Promise<PanchangDay> {
    throw new Error("Panchang engine is not configured.");
  }
}
