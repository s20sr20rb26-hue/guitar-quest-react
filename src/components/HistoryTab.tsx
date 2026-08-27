import { History, Trash2, Calendar, Clock, Star, MessageSquare, Music2 } from 'lucide-react';
import type { QuestState } from '@/lib/quest';

interface HistoryTabProps {
  state: QuestState;
  onDeleteSession: (id: string) => void;
}

export function HistoryTab({ state, onDeleteSession }: HistoryTabProps) {
  const sessions = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 py-16 text-center">
        <History className="mx-auto mb-3 h-10 w-10 text-slate-700" />
        <p className="text-sm text-slate-500">まだ練習記録がありません</p>
        <p className="mt-1 text-xs text-slate-600">曲カードの「練習記録」ボタンから記録できます</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
        <History className="h-5 w-5 text-amber-500" />
        練習履歴
      </h2>

      <div className="space-y-2">
        {sessions.map((session) => {
          const d = new Date(session.date);
          const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

          return (
            <div
              key={session.id}
              className="group rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{dateStr}</span>
                    <span className="text-slate-600">{timeStr}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Music2 className="h-4 w-4 text-amber-500/70" />
                    <span className="truncate text-sm font-semibold text-slate-200">{session.songName}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {session.durationMin}分
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500/70" />
                      {'★'.repeat(session.rating)}
                      <span className="text-slate-600">{'★'.repeat(5 - session.rating)}</span>
                    </span>
                  </div>
                  {session.memo && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-slate-800/40 p-2">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                      <p className="text-xs leading-relaxed text-slate-400">{session.memo}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDeleteSession(session.id)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-red-950/40 hover:text-red-400"
                  title="削除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
