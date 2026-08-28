interface ItunesArtworkTrack {
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
}

interface ItunesArtworkResponse {
  results?: ItunesArtworkTrack[];
}

const ARTWORK_CACHE_KEY = 'guitar-quest-artwork-v1';
const memoryCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();
let requestQueue: Promise<unknown> = Promise.resolve();

function normalizeText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/[^\p{L}\p{N}]+/gu, '');
}

function makeArtworkKey(title: string, artist: string): string {
  return `${normalizeText(title)}::${normalizeText(artist)}`;
}

export function normalizeArtworkUrl(url: string): string {
  return url.replace(/^http:/, 'https:').replace(/\d+x\d+bb(?=\.)/, '300x300bb');
}

function readStoredArtwork(key: string): string | null {
  try {
    const stored = JSON.parse(localStorage.getItem(ARTWORK_CACHE_KEY) || '{}') as Record<string, string>;
    const url = stored[key];
    if (url) memoryCache.set(key, url);
    return url || null;
  } catch {
    return null;
  }
}

function storeArtwork(key: string, url: string): void {
  memoryCache.set(key, url);
  try {
    const stored = JSON.parse(localStorage.getItem(ARTWORK_CACHE_KEY) || '{}') as Record<string, string>;
    stored[key] = url;
    localStorage.setItem(ARTWORK_CACHE_KEY, JSON.stringify(stored));
  } catch {
    // The in-memory cache still avoids repeated requests when storage is unavailable.
  }
}

function scoreTrack(track: ItunesArtworkTrack, title: string, artist: string): number {
  const expectedTitle = normalizeText(title);
  const expectedArtist = normalizeText(artist);
  const trackTitle = normalizeText(track.trackName || '');
  const trackArtist = normalizeText(track.artistName || '');
  let score = 0;

  if (trackTitle === expectedTitle) score += 100;
  else if (trackTitle.includes(expectedTitle) || expectedTitle.includes(trackTitle)) score += 35;

  if (!expectedArtist) score += 10;
  else if (trackArtist === expectedArtist) score += 70;
  else if (trackArtist.includes(expectedArtist) || expectedArtist.includes(trackArtist)) score += 25;

  return score;
}

function searchItunesArtwork(title: string, artist: string): Promise<string | null> {
  return new Promise((resolve) => {
    const callbackName = `guitarQuestArtwork_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const callbackHost = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let timeoutId = 0;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.remove();
      delete callbackHost[callbackName];
    };

    callbackHost[callbackName] = (response: ItunesArtworkResponse) => {
      cleanup();
      const bestMatch = (response.results || [])
        .filter((track) => Boolean(track.artworkUrl100))
        .map((track) => ({ track, score: scoreTrack(track, title, artist) }))
        .sort((a, b) => b.score - a.score)[0];
      resolve(bestMatch?.track.artworkUrl100 && bestMatch.score >= 90
        ? normalizeArtworkUrl(bestMatch.track.artworkUrl100)
        : null);
    };

    script.async = true;
    script.onerror = () => {
      cleanup();
      resolve(null);
    };
    script.src = `https://itunes.apple.com/search?${new URLSearchParams({
      term: `${title} ${artist}`.trim(),
      country: 'JP',
      media: 'music',
      entity: 'song',
      limit: '8',
      lang: 'ja_jp',
      callback: callbackName,
    }).toString()}`;

    timeoutId = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);

    document.body.appendChild(script);
  });
}

export function resolveSongArtwork(title: string, artist = '', refresh = false): Promise<string | null> {
  const key = makeArtworkKey(title, artist);
  if (!key.startsWith('::') && !refresh) {
    const cached = memoryCache.get(key) || readStoredArtwork(key);
    if (cached) return Promise.resolve(cached);
  }

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const request = requestQueue
    .catch(() => undefined)
    .then(() => searchItunesArtwork(title, artist))
    .then((url) => {
      if (url) storeArtwork(key, url);
      return url;
    })
    .finally(() => pendingRequests.delete(key));

  requestQueue = request;
  pendingRequests.set(key, request);
  return request;
}
