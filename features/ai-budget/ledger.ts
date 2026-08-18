import {
  FLEET_MONTHLY_BUDGET_MICROS,
  WORKSTREAM_BUDGET_MICROS,
  type AiWorkstream,
} from "./contracts";

export type ReservationDecision =
  | "ACCEPTED"
  | "WORKSTREAM_BUDGET_REACHED"
  | "FLEET_BUDGET_REACHED";

export function evaluateReservation(input: {
  workstream: AiWorkstream;
  fleetChargedMicros: number;
  workstreamChargedMicros: number;
  requestedMicros: number;
}): ReservationDecision {
  const values = [
    input.fleetChargedMicros,
    input.workstreamChargedMicros,
    input.requestedMicros,
  ];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error("AI_BUDGET_TOTAL_INVALID");
  }
  if (
    input.workstreamChargedMicros + input.requestedMicros >
    WORKSTREAM_BUDGET_MICROS[input.workstream]
  ) {
    return "WORKSTREAM_BUDGET_REACHED";
  }
  if (
    input.fleetChargedMicros + input.requestedMicros >
    FLEET_MONTHLY_BUDGET_MICROS
  ) {
    return "FLEET_BUDGET_REACHED";
  }
  return "ACCEPTED";
}
