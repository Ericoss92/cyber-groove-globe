import { Router } from "express";
import { queryOne } from "../database/connection.js";

export const artistsRouter = Router();

/** Public GET — returns DB-persisted metadata for one artist, or null. */
artistsRouter.get("/:slug", async (req, res, next) => {
  try {
    const row = await queryOne<any>(
      `SELECT artist_slug AS slug, biography, years_active AS yearsActive,
              main_genre AS mainGenre, description, image_url AS imageUrl,
              country, social_links AS socialLinks, updated_at AS updatedAt
         FROM artists_metadata WHERE artist_slug = ?`,
      [req.params.slug],
    );
    res.json(row || null);
  } catch (e) { next(e); }
});
