import { z } from "zod";

export const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Write a message first.").max(2000),
});
