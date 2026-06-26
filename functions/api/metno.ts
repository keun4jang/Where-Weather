/**
 * Cloudflare Pages Function: proxy for MET Norway Locationforecast.
 *
 * MET Norway requires an identifying User-Agent header which browsers cannot
 * set, so we proxy the request server-side. Deploy with Cloudflare Pages and
 * set VITE_METNO_PROXY_URL to "/api/metno" in your build environment.
 *
 * Route: GET /api/metno?lat=<lat>&lon=<lon>
 */

interface Env {
  METNO_USER_AGENT?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const url = new URL(context.request.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  if (!lat || !lon) {
    return new Response(JSON.stringify({ error: 'lat and lon are required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const upstream = new URL('https://api.met.no/weatherapi/locationforecast/2.0/compact');
  upstream.searchParams.set('lat', lat);
  upstream.searchParams.set('lon', lon);

  const userAgent =
    context.env.METNO_USER_AGENT ?? 'where-weather/0.1.0 https://github.com/where-weather';

  const res = await fetch(upstream.toString(), {
    headers: { 'User-Agent': userAgent, Accept: 'application/json' },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `upstream ${res.status}` }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await res.text();
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300',
      'access-control-allow-origin': '*',
    },
  });
};
