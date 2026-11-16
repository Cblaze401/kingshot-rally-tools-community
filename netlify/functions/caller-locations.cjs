// Keep the provider key on Netlify; never send it to a browser or an export.
const inFlight = new Map();
const cache = new Map();
const reply = (statusCode, body, extra = {}) => ({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...extra},body:JSON.stringify(body)});
function normalize(data, requested) {
  if (!Array.isArray(data.players)) throw Error('Unexpected provider response');
  return data.players.map(entry => {
    const player = entry.player || entry;
    const id = String(entry.governor_id ?? player.governor_id ?? player.fid ?? '');
    if (!requested.includes(id)) return null;
    const age = typeof entry.age_seconds === 'number' ? entry.age_seconds : null;
    const coordinate = v => Number.isInteger(v) && v >= 0 && v <= 1199 ? v : null;
    return {governorId:id,name:typeof player.nick_name === 'string' ? player.nick_name.slice(0,120) : '',kingdom:Number.isSafeInteger(player.kid) ? player.kid : null,x:coordinate(player.x),y:coordinate(player.y),fresh:entry.fresh === true && age !== null && age >= 0 && age <= 60,ageSeconds:age,cachedAt:typeof entry.cached_at === 'string' ? entry.cached_at : null};
  }).filter(Boolean);
}
exports.normalize = normalize;
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return reply(405,{error:'Use POST.'},{Allow:'POST'});
  if (!process.env.MIGHTPULSE_API_KEY) return reply(503,{error:'Live lookup is not connected yet. The site owner must add MIGHTPULSE_API_KEY in Netlify.'});
  let ids;
  try {
    if ((event.body || '').length > 5000) throw Error();
    const body = JSON.parse(event.body || '{}');
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 50 || !body.ids.every(id => typeof id === 'string' && /^[1-9]\d{0,19}$/.test(id))) throw Error();
    ids = [...new Set(body.ids)].sort();
  } catch { return reply(400,{error:'Supply 1–50 valid in-game player IDs.'}); }
  const key = ids.join(','), cached = cache.get(key);
  if (cached && Date.now() - cached.at < 15000) return reply(200,{...cached.data,reused:true});
  if (!inFlight.has(key)) inFlight.set(key,(async () => {
    const url = new URL('https://api.mightpulse.com/v1/players');
    url.search = new URLSearchParams({ids:key,include:'base',id_type:'governor_id',max_age:'60',wait:'10'}).toString();
    const response = await fetch(url,{headers:{Authorization:'Bearer '+process.env.MIGHTPULSE_API_KEY},signal:AbortSignal.timeout(18000)});
    if (!response.ok) {
      if (response.status === 429) return reply(429,{error:'Mightpulse rate limit reached. Wait before refreshing again.'},{'Retry-After':String(Math.min(3600,Math.max(15,Number(response.headers.get('Retry-After')) || 60)))});
      return reply(502,{error:response.status === 401 || response.status === 403 ? 'Mightpulse rejected the configured key. Ask the site owner to check it.' : 'Mightpulse could not return locations. Existing march times were kept.'});
    }
    const data = {players:normalize(await response.json(),ids),fetchedAt:new Date().toISOString()};
    if (cache.size >= 100) cache.delete(cache.keys().next().value);
    cache.set(key,{at:Date.now(),data});
    return reply(200,data);
  })().catch(() => reply(502,{error:'Location lookup failed or timed out. Existing march times were kept.'})).finally(() => inFlight.delete(key)));
  return inFlight.get(key);
};
