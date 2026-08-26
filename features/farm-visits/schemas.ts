import { z } from "zod";

export const INDIA_STATES_AND_UNION_TERRITORIES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

const singleLine = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum).refine(
    (value) => !/[\u0000-\u001f\u007f]/u.test(value),
    "Use plain text without line breaks or control characters.",
  );

const optionalTrimmedText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    singleLine(2, maximum).optional(),
  );

export const farmVisitRequestSchema = z.strictObject({
  phone: z
    .string()
    .trim()
    .regex(/^\+91[6-9]\d{9}$/, "Use an Indian mobile number such as +919876543210."),
  addressLine1: singleLine(4, 160),
  addressLine2: optionalTrimmedText(160),
  locality: singleLine(2, 100),
  district: singleLine(2, 100),
  state: z.enum(INDIA_STATES_AND_UNION_TERRITORIES),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid six-digit Indian PIN code."),
  farmingInterest: z.enum(["organic", "natural", "both", "general"]),
  partySize: z.coerce.number().int().min(1).max(20),
  preferredSchedule: z.enum(["weekday", "weekend", "either"]),
  visitorType: z.enum(["individual", "school", "fpo", "corporate", "other"]),
  organizationName: optionalTrimmedText(160),
  contactRole: optionalTrimmedText(100),
  notes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(2).max(500).refine(
      (value) => !/[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value),
      "Use plain text without control characters.",
    ).optional(),
  ),
  consent: z.literal(true, { error: "Consent is required." }),
  idempotencyKey: z.uuid(),
  website: z.string().trim().max(0).optional().default(""),
}).superRefine((value, context) => {
  if (
    (value.visitorType === "school" || value.visitorType === "fpo" || value.visitorType === "corporate") &&
    (!value.organizationName || !value.contactRole)
  ) {
    if (!value.organizationName) {
      context.addIssue({ code: "custom", path: ["organizationName"], message: "Enter the organisation name." });
    }
    if (!value.contactRole) {
      context.addIssue({ code: "custom", path: ["contactRole"], message: "Enter your role in the organisation." });
    }
  }
  if (
    (value.visitorType === "individual" || value.visitorType === "other") &&
    (value.organizationName || value.contactRole)
  ) {
    context.addIssue({
      code: "custom",
      path: ["organizationName"],
      message: "Organisation details are only accepted for school, FPO or corporate visits.",
    });
  }
});

export type FarmVisitRequestInput = z.infer<typeof farmVisitRequestSchema>;

export const farmVisitRpcResultSchema = z.object({
  code: z.enum(["CREATED", "IDEMPOTENT_REPLAY", "OPEN_REQUEST_EXISTS"]),
  request_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  notification_state: z.enum(["pending", "sent", "failed", "unknown"]),
});
