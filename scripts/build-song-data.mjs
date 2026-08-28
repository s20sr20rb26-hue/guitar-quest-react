import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const csvPath = path.join(root, 'data', 'songs.csv');
const outputPath = path.join(root, 'src', 'data', 'generatedSongs.ts');
const checkOnly = process.argv.includes('--check');

const requiredHeaders = [
  'No',
  '曲名',
  'アーティスト',
  '演奏難易度',
  'エチュード適性',
  'ジャンル定番度',
  'カテゴリ',
  'ルーツ',
  '主スキル',
  '必須スキル',
  '習得スキル',
];

const categoryOptions = new Set([
  '邦楽ロック',
  'J-POP',
  'けいおん!',
  'アニソン/ボカロ',
  '洋楽ロック',
  'カッティング/ファンク',
  'ブルース/R&R',
  'R&B/フュージョン',
  '民謡',
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function integer(value, label, rowNo, minimum, maximum, errors) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    errors.push(`CSV ${rowNo}行目: ${label}は${minimum}〜${maximum}の整数で入力してください。`);
  }
  return parsed;
}

const raw = (await fs.readFile(csvPath, 'utf8')).replace(/^\uFEFF/, '');
const parsedRows = parseCsv(raw).filter((row) => row.some((cell) => cell.trim()));
const headers = parsedRows.shift() ?? [];
const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
const extraHeaders = headers.filter((header) => !requiredHeaders.includes(header));

if (missingHeaders.length) {
  throw new Error(`CSVに必要な列がありません: ${missingHeaders.join('、')}`);
}
if (extraHeaders.length) {
  throw new Error(`CSVに不要な列があります: ${extraHeaders.join('、')}`);
}

const records = parsedRows.map((values, index) => ({
  rowNo: index + 2,
  values: Object.fromEntries(headers.map((header, column) => [header, values[column]?.trim() ?? ''])),
}));
const errors = [];
const warnings = [];
const seenNos = new Set();
const seenSongs = new Map();

const songs = records.map(({ rowNo, values }) => {
  const no = integer(values.No, 'No', rowNo, 1, 99999, errors);
  const difficulty = integer(values.演奏難易度, '演奏難易度', rowNo, 1, 10, errors);
  const etudeScore = integer(values.エチュード適性, 'エチュード適性', rowNo, 1, 5, errors);
  const standardScore = integer(values.ジャンル定番度, 'ジャンル定番度', rowNo, 1, 5, errors);

  if (seenNos.has(no)) errors.push(`CSV ${rowNo}行目: No ${no}が重複しています。`);
  seenNos.add(no);

  for (const field of ['曲名', 'アーティスト', 'カテゴリ', 'ルーツ', '主スキル']) {
    if (!values[field]) errors.push(`CSV ${rowNo}行目: ${field}が空欄です。`);
  }

  if (!categoryOptions.has(values.カテゴリ)) {
    errors.push(`CSV ${rowNo}行目: カテゴリ「${values.カテゴリ}」は選択肢にありません。`);
  }

  const songKey = `${values.曲名.toLocaleLowerCase('ja-JP')}\u0000${values.アーティスト.toLocaleLowerCase('ja-JP')}`;
  if (seenSongs.has(songKey)) {
    warnings.push(
      `CSV ${rowNo}行目: 「${values.曲名} / ${values.アーティスト}」はNo ${seenSongs.get(songKey)}と重複している可能性があります。`,
    );
  } else {
    seenSongs.set(songKey, no);
  }

  return {
    No: no,
    曲名: values.曲名,
    Lv: difficulty,
    主スキル: values.主スキル,
    推奨ルート: values.カテゴリ,
    ルーツ: values.ルーツ,
    一言説明: '',
    練習ポイント: '',
    壁: '',
    次候補: '',
    習得スキル: values.習得スキル,
    必須スキル: values.必須スキル,
    アーティスト: values.アーティスト,
    参考動画URL: '',
    演奏難易度: difficulty,
    エチュード適性: etudeScore,
    ジャンル定番度: standardScore,
  };
});

for (const warning of warnings) console.warn(`警告: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`エラー: ${error}`);
  process.exitCode = 1;
} else if (checkOnly) {
  console.log(`songs.csv: ${songs.length}曲、エラーなし（警告 ${warnings.length}件）`);
} else {
  const generated = [
    "import type { Song } from '@/types';",
    '',
    '// data/songs.csvから自動生成。直接編集しないでください。',
    `export const GENERATED_SONGS: Song[] = ${JSON.stringify(songs, null, 2)};`,
    '',
  ].join('\n');
  await fs.writeFile(outputPath, generated, 'utf8');
  console.log(`Generated ${path.relative(root, outputPath)} from ${songs.length} songs.`);
}
