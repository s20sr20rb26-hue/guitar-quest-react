import { X, Clock, Star, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import type { Song } from '@/types';

interface LogSessionModalProps {
  song: Song;
  onClose: () => void;
  onSave: (durationMin: number, memo: string, rating: number) => void;
}

export function LogSessionModal({ song, onClose, onSave }: LogSessionModalProps) {
  const [duration, setDuration] = useState(15);
  const [memo, setMemo] = useState('');
  const [rating, setRating] = useState(3);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl border-t border-slate-700 bg-slate-900 p-5 pb-safe shadow-2xl sm:rounded-2xl sm:border sm:border-slate-700 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">練習記録</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-200">{song.曲名}</p>
          <p className="text-xs text-slate-500">{song.アーティスト}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Clock className="h-3.5 w-3.5" /> 練習時間（分）
            </label>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {[10, 15, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    duration === m
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {m}分
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Star className="h-3.5 w-3.5" /> 手応え
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                    rating === r
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <MessageSquare className="h-3.5 w-3.5" /> メモ
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="今日の気づき、できたこと、課題..."
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-600 focus:outline-none"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-700"
          >
            キャンセル
          </button>
          <button
            onClick={() => onSave(duration, memo, rating)}
            className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
          >
            記録する
          </button>
        </div>
      </div>
    </div>
  );
}
