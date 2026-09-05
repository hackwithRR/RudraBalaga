/**
 * Vercel Serverless Function — GET /api/distance?fromLat=...&fromLng=...&toLat=...&toLng=...
 *
 * Calculates the straight-line (Haversine) distance between two coordinates.
 * No external API calls — pure math approximation.
 *
 * Query params:
 *   - fromLat, fromLng: origin coordinates (user's profile location)
 *   - toLat, toLng:   destination coordinates (event location)
 *
 * Response:
 *   { ok: true, distance: "12.5 km", distanceKm: 12.5, mode: "straight" }
 *   { ok: false, error: "..." }
 */

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',');
    if (allowed.includes('*') || allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

    const fromLat = parseFloat(req.query.fromLat);
    const fromLng = parseFloat(req.query.fromLng);
    const toLat = parseFloat(req.query.toLat);
    const toLng = parseFloat(req.query.toLng);

    if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
        return res.status(400).json({ ok: false, error: 'missing_coords' });
    }

    const km = haversineKm(fromLat, fromLng, toLat, toLng);
    const roundedKm = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);

    return res.status(200).json({
        ok: true,
        distance: `${roundedKm} km`,
        distanceKm: roundedKm,
        mode: 'straight'
    });
}
