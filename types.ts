export enum ProcessStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  UNPACKING = 'unpacking',
  ENCRYPTING_DEX = 'encrypting_dex',
  INJECTING_STUB = 'injecting_stub',
  ALIGNING = 'aligning',
  SIGNING = 'signing',
  COMPLETE = 'complete',
  ERROR = 'error',
}

export interface ProcessStep {
  name: string;
  status: ProcessStatus;
  duration: number;
}
