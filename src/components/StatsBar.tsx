import { TrendingUp, Award, Target, Zap } from 'lucide-react';
import type { Song } from '@/types';
import type { QuestState } from '@/lib/quest';
import { canPlaySong } from '@/lib/quest';

interface StatsBarProps {
  songs: Song[];
  state: QuestState;
}

export function StatsBar({ songs, state }: StatsBarProps) {
  const completed = state.completedSongNos.length;
  const total = songs.length;
  const totalMin = state.sessions.reduce((sum, s) => sum + s.durationMin, 0);
  const totalSessions = state.sessions.length;

  const playableCount = songs.filter((s) => canPlaySong(s, state.skillLevels).ok).length;

  const stats = [
    { icon: Award, label: '習得曲', value: `${completed}`, sub: `/ ${total}`, color: 'text-emerald-400' },
    { icon: Zap, label: '演奏可能', value: `${playableCount}`, sub: '曲', color: 'text-amber-400' },
    { icon: Target, label: '練習回数', value: `${totalSessions}`, sub: '回', color: 'text-sky-400' },
    { icon: TrendingUp, label: '練習時間', value: `${Math.floor(totalMin / 60)}h`, sub: `${totalMin % 60}m`, color: 'text-violet-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4"
        >
          <div className="mb-1 flex items-center gap-1.5">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-[11px] font-medium text-slate-500">{stat.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold sm:text-2xl ${stat.color}`}>{stat.value}</span>
            <span className="text-xs text-slate-600">{stat.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
