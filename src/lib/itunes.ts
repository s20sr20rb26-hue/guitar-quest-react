export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  trackViewUrl: string;
  kind: string;
  artworkUrl100?: string;
}

interface ItunesSearchResponse {
  results: ItunesTrack[];
}

export function searchItunesSongs(term: string): Promise<ItunesTrack[]> {
  return new Promise((resolve, reject) => {
    const callbackName = `guitarQuestItunes_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const callbackHost = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let timeoutId = 0;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.remove();
      delete callbackHost[callbackName];
    };

    callbackHost[callbackName] = (response: ItunesSearchResponse) => {
      cleanup();
      resolve(
        response.results.filter(
          (track) =>
            track.kind === 'song' &&
            Boolean(track.trackId && track.trackName && track.artistName && track.trackViewUrl)
        )
      );
    };

    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error('iTunesに接続できませんでした。'));
    };
    script.src = `https://itunes.apple.com/search?${new URLSearchParams({
      term,
      country: 'JP',
      media: 'music',
      entity: 'song',
      limit: '12',
      lang: 'ja_jp',
      callback: callbackName,
    }).toString()}`;

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('検索に時間がかかっています。もう一度試してください。'));
    }, 10000);

    document.body.appendChild(script);
  });
}
