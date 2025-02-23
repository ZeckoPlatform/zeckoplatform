import { z } from "zod";

export const postSchema = z.object({
  id: z.number(),
  content: z.string(),
  type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"]),
  createdAt: z.string().datetime(),
  images: z.array(z.string()).optional(),
  user: z.object({
    id: z.number(),
    email: z.string(),
    userType: z.string(),
    businessName: z.string().nullable(),
    profile: z.object({
      bio: z.string(),
      name: z.string()
    }).nullable()
  }).nullable()
});

export type Post = z.infer<typeof postSchema>;

export interface PostsResponse {
  success: boolean;
  data: Post[];
}