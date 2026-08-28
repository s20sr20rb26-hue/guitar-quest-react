import { GENERATED_SONGS } from '@/data/generatedSongs';

export const ROUTE_OPTIONS: string[] = [
  '邦ロック定番',
  'J-pop',
  'けいおん',
  'アニソン/ボカロ',
  '洋楽ロック',
  'カッティング/ファンク',
  'ブルース',
  '東京事変/オルタナ',
  'R&B/フュージョン',
  'ラウド',
  '未分類',
];

export const SKILL_CATEGORIES = [
  { key: 'all', label: '全部のスキル', keywords: [] as string[] },
  { key: 'chord', label: 'コード', keywords: ['コード', 'バレー', 'テンション', 'ローコード', 'パワーコード', '歌伴', 'バッキング'] },
  { key: 'rhythm', label: 'リズム', keywords: ['8ビート', '16ビート', 'アクセント', 'ストローク', 'シャッフル', 'テンポ', '休符'] },
  { key: 'cutting', label: 'カッティング', keywords: ['カッティング', '左手ミュート', '単音カッティング'] },
  { key: 'riff', label: 'リフ', keywords: ['リフ', '単音フレーズ', '低音', 'オクターブ奏法'] },
  { key: 'lead', label: 'リード・ソロ', keywords: ['ギターソロ', 'リード', 'ブルースフレーズ', 'チョーキング', 'ペンタ', 'レガート', 'ハンマリング', 'プリング'] },
  { key: 'technical', label: 'テクニカル', keywords: ['高速', 'オルタネイト', '速弾き', 'フュージョン', '即興', 'セッション', 'アドリブ'] },
  { key: 'tone', label: '音作り', keywords: ['ディレイ', 'リバーブ', '歪み', 'ハイゲイン', '空間系', 'ドロップD'] },
  { key: 'ensemble', label: 'アンサンブル', keywords: ['アンサンブル', 'バンド', 'グルーヴ', '歌伴', 'セッション'] },
] as const;

export const INITIAL_SONGS = GENERATED_SONGS;
