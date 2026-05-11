import { query, queryOne, exec } from "../database/connection.js";

export async function computeStats(userId: number) {
  const totals = await queryOne<any>(
    `SELECT COUNT(*) AS totalSongsPlayed,
            ROUND(COALESCE(SUM(duration_played_seconds),0)/60) AS totalListeningTimeMinutes
       FROM listening_history WHERE user_id = ?`,
    [userId],
  );
  const topArtists = await query(
    `SELECT artist_name AS name, artist_slug AS slug, artist_country AS country, COUNT(*) AS count
       FROM listening_history WHERE user_id = ? AND artist_slug IS NOT NULL
      GROUP BY artist_slug, artist_name, artist_country ORDER BY count DESC LIMIT 10`,
    [userId],
  );
  const topGenres = await query(
    `SELECT genre AS name, COUNT(*) AS count FROM listening_history
      WHERE user_id = ? AND genre IS NOT NULL
      GROUP BY genre ORDER BY count DESC LIMIT 10`,
    [userId],
  );
  const topCountries = await query(
    `SELECT artist_country AS name, COUNT(*) AS count FROM listening_history
      WHERE user_id = ? AND artist_country IS NOT NULL
      GROUP BY artist_country ORDER BY count DESC LIMIT 10`,
    [userId],
  );
  const monthly = await query(
    `SELECT DATE_FORMAT(played_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM listening_history WHERE user_id = ? AND played_at >= NOW() - INTERVAL 12 MONTH
      GROUP BY month ORDER BY month ASC`,
    [userId],
  );
  const listeningByMonth: Record<string, number> = {};
  for (const r of monthly as any[]) listeningByMonth[r.month] = r.count;

  // cache
  await exec(`INSERT IGNORE INTO user_statistics_cache (user_id) VALUES (?)`, [userId]);
  await exec(
    `UPDATE user_statistics_cache SET
       total_listening_time_minutes = ?, total_songs_played = ?,
       favorite_artist = ?, favorite_genre = ?, favorite_country = ?,
       top_5_artists = ?, top_5_genres = ?, top_5_countries = ?, most_played_in_month = ?
     WHERE user_id = ?`,
    [
      totals?.totalListeningTimeMinutes ?? 0,
      totals?.totalSongsPlayed ?? 0,
      (topArtists as any[])[0]?.name ?? null,
      (topGenres as any[])[0]?.name ?? null,
      (topCountries as any[])[0]?.name ?? null,
      JSON.stringify((topArtists as any[]).slice(0, 5)),
      JSON.stringify((topGenres as any[]).slice(0, 5)),
      JSON.stringify((topCountries as any[]).slice(0, 5)),
      JSON.stringify(listeningByMonth),
      userId,
    ],
  );

  return {
    totalListeningTimeMinutes: totals?.totalListeningTimeMinutes ?? 0,
    totalSongsPlayed: totals?.totalSongsPlayed ?? 0,
    favoriteArtist: (topArtists as any[])[0]?.name ?? null,
    favoriteGenre: (topGenres as any[])[0]?.name ?? null,
    favoriteCountry: (topCountries as any[])[0]?.name ?? null,
    topArtists, topGenres, topCountries, listeningByMonth,
  };
}
