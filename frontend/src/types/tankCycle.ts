export type TankDisplayStatus =
  | "NORMAL"
  | "WARNING"
  | "REPLACEMENT_REQUIRED";

export type TankCycleStatus =
  | "ACTIVE"
  | "REPLACED";

export interface TankCycle {
  id: number;
  currentLoads: number;
  maximumLoads: number;
  status: TankCycleStatus;
  startedAt: string;
  replacedAt?: string | null;
  replacedBy?: string | null;
  replacementNotes?: string | null;
}

export interface TankStatus extends TankCycle {
  remainingLoads: number;
  percentage: number;
  displayStatus: TankDisplayStatus;
  replacementRequired: boolean;
}

export interface TankHistoryItem extends TankCycle {
  _count?: {
    loadEntries: number;
  };
}

export interface TankHistoryResponse {
  count: number;
  history: TankHistoryItem[];
}

export interface ReplaceTankResponse {
  message: string;
  replacedCycle: TankCycle;
  currentCycle: TankCycle;
}