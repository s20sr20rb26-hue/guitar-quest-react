import { useEffect, useState, type ReactNode } from 'react';
import { Music2 } from 'lucide-react';
import { normalizeArtworkUrl, resolveSongArtwork } from '@/lib/artwork';

interface SongArtworkProps {
  title: string;
  artist?: string;
  src?: string;
  className?: string;
  fallback?: ReactNode;
}

export function SongArtwork({ title, artist = '', src, className = 'h-full w-full object-cover', fallback }: SongArtworkProps) {
  const initialSrc = src ? normalizeArtworkUrl(src) : '';
  const [artworkSrc, setArtworkSrc] = useState(initialSrc);
  const [failedSrc, setFailedSrc] = useState('');

  useEffect(() => {
    let active = true;
    const providedSrc = src ? normalizeArtworkUrl(src) : '';

    setArtworkSrc(providedSrc);
    setFailedSrc('');
    if (!providedSrc && title.trim()) {
      void resolveSongArtwork(title, artist).then((url) => {
        if (active && url) setArtworkSrc(url);
      });
    }

    return () => {
      active = false;
    };
  }, [artist, src, title]);

  const retryArtwork = () => {
    const brokenUrl = artworkSrc;
    setFailedSrc(brokenUrl);
    void resolveSongArtwork(title, artist, true).then((url) => {
      if (url && url !== brokenUrl) {
        setFailedSrc('');
        setArtworkSrc(url);
      }
    });
  };

  if (artworkSrc && failedSrc !== artworkSrc) {
    return (
      <img
        src={artworkSrc}
        alt=""
        className={className}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={retryArtwork}
      />
    );
  }

  return <>{fallback ?? <Music2 className="h-6 w-6" />}</>;
}
