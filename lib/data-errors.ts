export class DataUnavailableError extends Error {
  readonly code = "service.unavailable" as const;
  readonly referenceId: string;

  constructor(referenceId: string) {
    super(`FarmerBook data is temporarily unavailable. Reference ${referenceId}.`);
    this.name = "DataUnavailableError";
    this.referenceId = referenceId;
  }
}

export function throwDataUnavailable(area: string): never {
  const referenceId = crypto.randomUUID();
  console.error("FarmerBook data source unavailable", { area, referenceId });
  throw new DataUnavailableError(referenceId);
}
