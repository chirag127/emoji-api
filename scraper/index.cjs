/**
 * Emoji metadata scraper.
 *
 * Source: unicode.org emoji-test.txt (UTS #51), which carries the CLDR order,
 * group/subgroup, the emoji version each entry was introduced in (the "E1.0"
 * tag in each line's comment) and the fully-qualified form of every RGI emoji.
 * Emoji_Modifier_Base from the UCD emoji-data.txt decides skin-tone support.
 *
 * Run: node scraper/index.cjs
 */
const fs = require('fs');
const path = require('path');

const TEST_URL = 'https://unicode.org/Public/emoji/latest/emoji-test.txt';
const DATA_URL = 'https://unicode.org/Public/UCD/latest/ucd/emoji/emoji-data.txt';

const ROOT = path.join(__dirname, '..');
const API_DIR = path.join(ROOT, 'api/v1');

const TONES = ['light skin tone', 'medium-light skin tone', 'medium skin tone', 'medium-dark skin tone', 'dark skin tone'];
const LINE = /^([0-9A-F ]+?)\s*;\s*(fully-qualified|minimally-qualified|unqualified|component)\s*#\s*(\S+)\s+E([0-9.]+)\s+(.*)$/;

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'emoji-api/1.0 (+https://github.com/chirag127/emoji-api)' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const text = await res.text();
  if (/^\s*<!doctype html/i.test(text)) throw new Error(`${url} returned HTML, not data`);
  return text;
}

function modifierBases(emojiData) {
  const set = new Set();
  for (const line of emojiData.split('\n')) {
    const body = line.split('#')[0].trim();
    if (!body) continue;
    const [range, property] = body.split(';').map((s) => s.trim());
    if (property !== 'Emoji_Modifier_Base') continue;
    const [start, end] = range.split('..').map((h) => parseInt(h, 16));
    for (let cp = start; cp <= (end ?? start); cp++) set.add(cp);
  }
  return set;
}

function build(testText, emojiData, fileVersion) {
  const bases = modifierBases(emojiData);
  if (bases.size === 0) throw new Error('No Emoji_Modifier_Base codepoints parsed from emoji-data.txt');

  let group = null;
  let subgroup = null;
  let order = 0;
  const records = [];
  for (const line of testText.split('\n')) {
    const g = line.match(/^# group: (.*)$/);
    if (g) {
      group = g[1].trim();
      continue;
    }
    const s = line.match(/^# subgroup: (.*)$/);
    if (s) {
      subgroup = s[1].trim();
      continue;
    }
    if (!line.trim() || line.startsWith('#')) continue;
    const m = line.match(LINE);
    if (!m) throw new Error(`Unparsed line in emoji-test.txt: ${line.slice(0, 80)}`);
    if (m[2] !== 'fully-qualified') continue;
    const cps = m[1].trim().split(/\s+/);
    records.push({
      id: cps.join('-'),
      emoji: m[3],
      name: m[5].trim(),
      codepoints: cps.map((cp) => `U+${cp}`),
      version: m[4],
      group,
      subgroup,
      skinToneSupport: false,
      skinToneVariants: 0,
      tone: null,
      base: null,
      status: m[2],
      order: order++,
    });
  }

  const byName = new Map(records.map((r) => [r.name, r]));
  for (const rec of records) {
    const tone = TONES.find((t) => rec.name.endsWith(`: ${t}`));
    if (!tone) continue;
    const base = byName.get(rec.name.slice(0, -(tone.length + 2)));
    if (!base) continue;
    rec.tone = tone.replace(' skin tone', '');
    rec.base = base.id;
    base.skinToneVariants++;
    // Every base must really be an Emoji_Modifier_Base codepoint, otherwise the
    // name-matching above has linked two unrelated emoji.
    if (!bases.has(parseInt(base.codepoints[0].slice(2), 16))) {
      throw new Error(`${base.id} (${base.name}) has tone variants but is not an Emoji_Modifier_Base`);
    }
  }

  // skinToneSupport answers "does this emoji come in skin tones?" - true for a
  // base with variants, and for the variants themselves.
  const byId = new Map(records.map((r) => [r.id, r]));
  for (const rec of records) {
    rec.skinToneSupport = rec.skinToneVariants > 0 || (rec.base ? byId.get(rec.base).skinToneVariants > 0 : false);
  }
  return { records, version: fileVersion, bases: bases.size };
}

async function main() {
  console.log('Fetching', TEST_URL);
  const testText = await fetchText(TEST_URL);
  const fileVersion = (testText.match(/^# Version: (\S+)$/m) || [])[1];
  if (!fileVersion) throw new Error('emoji-test.txt has no version header');

  console.log('Fetching', DATA_URL);
  const emojiData = await fetchText(DATA_URL);

  const { records, bases } = build(testText, emojiData, fileVersion);
  if (records.length < 3000) throw new Error(`Only ${records.length} emoji parsed — source shape probably changed`);

  const withToneSupport = records.filter((r) => r.skinToneVariants > 0).length;
  const toneVariants = records.filter((r) => r.tone).length;
  console.log(`Emoji ${fileVersion}: ${records.length} fully-qualified emoji, ${new Set(records.map((r) => r.group)).size} groups`);
  console.log(`${withToneSupport} emoji accept a skin tone (of ${bases} Emoji_Modifier_Base codepoints), ${toneVariants} skin-tone variants linked to a base`);

  const json = JSON.stringify(records, null, 2) + '\n';
  for (const rel of ['data.json', 'data/emoji.json', 'data/index.json', 'api/v1/data.json']) {
    fs.writeFileSync(path.join(ROOT, rel), json);
  }

  const indivDir = path.join(API_DIR, 'individual');
  fs.rmSync(indivDir, { recursive: true, force: true });
  fs.mkdirSync(indivDir, { recursive: true });
  for (const r of records) {
    fs.writeFileSync(path.join(indivDir, `${r.id}.json`), JSON.stringify(r, null, 2) + '\n');
  }

  const byId = {};
  for (const r of records) byId[r.id] = r;
  fs.writeFileSync(path.join(API_DIR, 'search-index.json'), JSON.stringify({ byId }, null, 2) + '\n');

  const now = new Date();
  const meta = {
    status: 'healthy',
    lastUpdated: now.toISOString(),
    sourceUpdatedAt: null,
    retrievedAt: now.toISOString(),
    recordCount: records.length,
    emojiVersion: fileVersion,
    groups: [...new Set(records.map((r) => r.group))].length,
    skinToneBases: withToneSupport,
    version: '1.0.0',
    schemaVersion: '1.0.0',
    source: 'Unicode emoji-test.txt (UTS #51)',
    sourceUrl: TEST_URL,
    license: 'Unicode-3.0',
    updateCadence: 'manual',
    nextUpdateDue: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    lastFailedAt: null,
    failureReason: null,
  };
  fs.writeFileSync(path.join(API_DIR, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  fs.writeFileSync(
    path.join(__dirname, 'fixtures/expected.json'),
    JSON.stringify({ recordCount: records.length, emojiVersion: fileVersion, skinToneBases: withToneSupport }, null, 2) + '\n'
  );
  console.log(`Wrote ${records.length} records, ${records.length} individual files, search index, meta.json`);
}

main().catch((err) => {
  console.error('Scraper failed:', err.message);
  process.exit(1);
});
