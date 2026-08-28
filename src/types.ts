export interface Song {
  No: number;
  曲名: string;
  アーティスト: string;
  演奏難易度: number;
  Lv: number;
  エチュード適性: number;
  ジャンル定番度: number;
  推奨ルート: string;
  ルーツ: string;
  主スキル: string;
  必須スキル: string;
  習得スキル: string;
  壁: string;
  次候補: string;
  一言説明: string;
  練習ポイント: string;
  参考動画URL: string;
  コメント?: string;
  技術メモ?: string;
}

export type RouteKey =
  | '邦楽ロック'
  | 'J-POP'
  | 'けいおん!'
  | 'アニソン/ボカロ'
  | '洋楽ロック'
  | 'カッティング/ファンク'
  | 'ブルース/R&R'
  | 'R&B/フュージョン'
  | '民謡';

export interface SkillCategory {
  key: string;
  label: string;
  keywords: string[];
}

export interface CourseDefinition {
  id: string;
  title: string;
  badge: string;
  desc: string;
  songs: Song[];
}

export type AppTab = 'timeline' | 'quest' | 'courses' | 'live' | 'history' | 'skills';
