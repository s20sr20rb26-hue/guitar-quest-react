import { CalendarDays, Clock3, Guitar, MessageSquare, Minus, Plus, Star, Target, X } from 'lucide-react';
import { useState } from 'react';
import { SongArtwork } from '@/components/SongArtwork';
import type { PracticeTarget } from '@/lib/quest';

interface LogSessionModalProps {
  song: PracticeTarget;
  onClose: () => void;
  onSave: (durationMin: number, memo: string, rating: number, focus: string, practiceDate: string) => void;
}

const FOCUS_OPTIONS = ['通し練習', '苦手部分', 'リフ', 'コード', 'ソロ', 'テンポ'];
const LIVE_FOCUS_OPTIONS = ['通し練習', '曲順確認', '転換', 'MC', '音作り', 'テンポ'];

function formatPracticeDuration(minutes: number): string {
  if (minutes < 60) return minutes + '分';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? hours + '時間' + rest + '分' : hours + '時間';
}

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function LogSessionModal({ song, onClose, onSave }: LogSessionModalProps) {
  const today = localDateValue(new Date());
  const isLivePractice = Boolean(song.livePlanId);
  const quickDurations = isLivePractice ? [30, 60, 90, 120] : [15, 30, 45, 60];
  const focusOptions = isLivePractice ? LIVE_FOCUS_OPTIONS : FOCUS_OPTIONS;
  const [duration, setDuration] = useState(isLivePractice ? 60 : 30);
  const [memo, setMemo] = useState('');
  const [rating, setRating] = useState(3);
  const [focus, setFocus] = useState('通し練習');
  const [practiceDate, setPracticeDate] = useState(today);

  const adjustDuration = (amount: number) => {
    setDuration((current) => Math.min(600, Math.max(5, current + amount)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(duration, memo.trim(), rating, focus, practiceDate);
        }}
        className="relative max-h-[94vh] max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-950 pb-safe shadow-2xl sm:rounded-lg sm:border"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:px-5">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-400">Practice log</p>
            <h2 className="text-lg font-black text-white">{isLivePractice ? 'ライブ練習を記録' : '練習を記録'}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900 hover:text-white" aria-label="閉じる">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 px-4 py-5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-emerald-950 text-emerald-400">
              {isLivePractice ? (
                <CalendarDays className="h-6 w-6" />
              ) : (
                <SongArtwork
                  title={song.songName}
                  artist={song.artist}
                  src={song.artworkUrl}
                  fallback={<Guitar className="h-6 w-6" />}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-white">{song.songName}</p>
              <p className="truncate text-sm text-zinc-500">{song.artist}</p>
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-300">
              <Clock3 className="h-4 w-4 text-emerald-400" />
              練習時間
            </div>
            <div className="flex items-center justify-center gap-5 border-y border-zinc-800 py-5">
              <button type="button" onClick={() => adjustDuration(-5)} className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-zinc-300 hover:bg-zinc-800" aria-label="5分減らす">
                <Minus className="h-5 w-5" />
              </button>
              <div className="min-w-28 text-center">
                <span className="text-5xl font-black tabular-nums text-white">{duration}</span>
                <span className="ml-1 text-sm font-bold text-zinc-500">分</span>
              </div>
              <button type="button" onClick={() => adjustDuration(5)} className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-zinc-300 hover:bg-zinc-800" aria-label="5分増やす">
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-lg border border-zinc-800">
              {quickDurations.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDuration(minutes)}
                  className={`min-h-10 border-l border-zinc-800 text-sm font-bold first:border-l-0 ${duration === minutes ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                >
                  {minutes}分
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="min-w-0">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-300">
                <CalendarDays className="h-4 w-4 text-cyan-400" />
                練習日
              </span>
              <input
                type="date"
                value={practiceDate}
                max={today}
                onChange={(event) => setPracticeDate(event.target.value)}
                required
                className="min-h-12 w-full min-w-0 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-white outline-none focus:border-emerald-500"
              />
            </label>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-300">
                <Star className="h-4 w-4 text-amber-400" />
                手応え
              </p>
              <div className="flex min-h-12 items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setRating(value)} className={`flex h-9 w-9 items-center justify-center rounded-full ${value <= rating ? 'text-amber-400' : 'text-zinc-700'}`} aria-label={`手応え${value}`}>
                    <Star className={`h-5 w-5 ${value <= rating ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-300">
              <Target className="h-4 w-4 text-cyan-400" />
              練習内容
            </p>
            <div className="grid grid-cols-3 gap-2">
              {focusOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFocus(option)}
                  className={`min-h-11 rounded-lg border px-2 text-sm font-bold ${focus === option ? 'border-cyan-400 bg-cyan-950 text-cyan-200' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-300">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              メモ
            </span>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="できたこと、次に直したいこと"
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-base text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </label>
        </div>

        <footer className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:px-5">
          <button type="submit" className="min-h-12 w-full rounded-full bg-emerald-500 px-5 text-base font-black text-black hover:bg-emerald-400">
            {formatPracticeDuration(duration)}を記録する
          </button>
        </footer>
      </form>
    </div>
  );
}
