import { z } from "zod";

export const relationshipSchema = z.object({
  profileId: z.string().min(1),
  active: z.boolean(),
});
