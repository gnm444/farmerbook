import { z } from "zod";

export const postSchema = z.object({
  body: z.string().trim().min(1, "Write something before sharing.").max(2000),
  category: z.enum(["discussion", "question", "opportunity"]),
  imagePath: z.string().max(500).optional(),
});

export const commentSchema = z.object({
  postId: z.uuid(),
  body: z.string().trim().min(1, "Write a comment first.").max(500),
});

export const updatePostSchema = postSchema
  .pick({ body: true, category: true })
  .extend({ postId: z.string().min(1) });

export const demoCommentSchema = commentSchema.extend({
  postId: z.string().min(1),
});
