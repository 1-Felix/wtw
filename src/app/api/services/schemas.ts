import { z } from "zod/v4";

/** POST /api/services/jellyfin/test */
export const jellyfinTestSchema = z.object({
  url: z.url(),
});

/** POST /api/services/jellyfin/auth */
export const jellyfinAuthSchema = z.object({
  serverUrl: z.url(),
  username: z.string().min(1),
  password: z.string(),
});

/** POST /api/services/sonarr/test and POST /api/services/radarr/test */
export const arrTestSchema = z.object({
  url: z.url(),
  apiKey: z.string().min(1),
});

/** PUT /api/services/sonarr and PUT /api/services/radarr */
export const arrSaveSchema = z.object({
  url: z.url(),
  apiKey: z.string().min(1),
});
