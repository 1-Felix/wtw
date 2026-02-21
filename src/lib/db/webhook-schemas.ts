import { z } from "zod/v4";

export const webhookFiltersSchema = z.object({
  onReady: z.boolean().default(true),
  onAlmostReady: z.boolean().default(false),
});

export const createWebhookSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  url: z.url("Must be a valid URL"),
  type: z.enum(["discord", "generic"]),
  enabled: z.boolean().optional(),
  filters: webhookFiltersSchema.optional(),
});

export const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.url().optional(),
  type: z.enum(["discord", "generic"]).optional(),
  enabled: z.boolean().optional(),
  filters: webhookFiltersSchema.optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
