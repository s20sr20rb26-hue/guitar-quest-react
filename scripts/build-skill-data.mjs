import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const csvPath = path.join(root, 'data', 'skills.csv');
const outputPath = path.join(root, 'src', 'data', 'generatedSkills.ts');
const checkOnly = process.argv.includes('--check');
const requiredHeaders = ['No', 'スキル名', 'カテゴリ'];
const categoryOptions = new Set([
  '基礎',
  'リズム・バッキング',
  'リード・テクニック',
  'ジャンル・語彙',
  'アンサンブル・音作り',
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

const raw = (await fs.readFile(csvPath, 'utf8')).replace(/^\uFEFF/, '');
const parsedRows = parseCsv(raw).filter((row) => row.some((cell) => cell.trim()));
const headers = parsedRows.shift() ?? [];
const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
const extraHeaders = headers.filter((header) => !requiredHeaders.includes(header));

if (missingHeaders.length) throw new Error(`CSVに必要な列がありません: ${missingHeaders.join('、')}`);
if (extraHeaders.length) throw new Error(`CSVに不要な列があります: ${extraHeaders.join('、')}`);

const errors = [];
const seenNos = new Set();
const seenNames = new Set();
const skills = parsedRows.map((values, index) => {
  const rowNo = index + 2;
  const record = Object.fromEntries(headers.map((header, column) => [header, values[column]?.trim() ?? '']));
  const no = Number(record.No);

  if (!Number.isInteger(no) || no < 1 || no > 9999) {
    errors.push(`CSV ${rowNo}行目: Noは1〜9999の整数で入力してください。`);
  } else if (seenNos.has(no)) {
    errors.push(`CSV ${rowNo}行目: No ${no}が重複しています。`);
  }
  seenNos.add(no);

  if (!record.スキル名) {
    errors.push(`CSV ${rowNo}行目: スキル名が空欄です。`);
  } else if (seenNames.has(record.スキル名)) {
    errors.push(`CSV ${rowNo}行目: スキル名「${record.スキル名}」が重複しています。`);
  }
  seenNames.add(record.スキル名);

  if (!categoryOptions.has(record.カテゴリ)) {
    errors.push(`CSV ${rowNo}行目: カテゴリ「${record.カテゴリ}」は選択肢にありません。`);
  }

  return { no, name: record.スキル名, category: record.カテゴリ };
}).sort((a, b) => a.no - b.no);

if (errors.length) {
  for (const error of errors) console.error(`エラー: ${error}`);
  process.exitCode = 1;
} else if (checkOnly) {
  console.log(`skills.csv: ${skills.length}スキル、エラーなし`);
} else {
  const generated = [
    '// data/skills.csvから自動生成。直接編集しないでください。',
    'export interface SkillDefinition {',
    '  no: number;',
    '  name: string;',
    '  category: string;',
    '}',
    '',
    `export const GENERATED_SKILLS: SkillDefinition[] = ${JSON.stringify(skills, null, 2)};`,
    '',
  ].join('\n');
  await fs.writeFile(outputPath, generated, 'utf8');
  console.log(`Generated ${path.relative(root, outputPath)} from ${skills.length} skills.`);
}
