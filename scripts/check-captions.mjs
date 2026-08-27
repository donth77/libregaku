#!/usr/bin/env node
/**
 * Screen YouTube videos for human-written subtitles before testing against them.
 *
 * YouTube marks auto-generated tracks with kind="asr". Everything else was
 * written or corrected by a person, which is what you want when checking
 * segmentation quality — ASR output has no punctuation and invented words.
 *
 *   node scripts/check-captions.mjs <url-or-id> [more...]
 *   node scripts/check-captions.mjs --lang ja <url-or-id>
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const args = process.argv.slice(2);
let wantLang = null;
const ids = [];

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--lang') { wantLang = args[++i] ?? null; continue; }
  if (a === '-h' || a === '--help') { usage(); process.exit(0); }
  const id = toId(a);
  if (id) ids.push(id);
  else console.error(`  ? could not read a video id from: ${a}`);
}

if (!ids.length) { usage(); process.exit(1); }

function usage() {
  console.log(`
  check-captions — list a YouTube video's subtitle tracks

    node scripts/check-captions.mjs <url-or-id> [...]
    node scripts/check-captions.mjs --lang ja <url-or-id>

  Marks each track human or auto-generated (kind="asr").
`);
}

function toId(s) {
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    return u.searchParams.get('v');
  } catch { return null; }
}

function trackName(t) {
  return t?.name?.simpleText ?? t?.name?.runs?.[0]?.text ?? t?.languageCode ?? '?';
}

async function check(id) {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
    headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
  });
  if (!res.ok) return { id, error: `HTTP ${res.status}` };

  const html = await res.text();
  const title = html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? '';
  const m = html.match(/"captionTracks":(\[.*?\])/);
  if (!m) return { id, title, tracks: [] };

  let tracks;
  try { tracks = JSON.parse(m[1]); } catch { return { id, title, error: 'unparseable track list' }; }

  return {
    id,
    title,
    tracks: tracks.map((t) => ({
      lang: t.languageCode,
      name: trackName(t),
      auto: t.kind === 'asr',
    })),
  };
}

let anyGood = false;

for (const id of ids) {
  const r = await check(id).catch((e) => ({ id, error: String(e) }));
  console.log(`\n  ${r.title || r.id}`);
  console.log(`  https://youtube.com/watch?v=${r.id}`);

  if (r.error) { console.log(`    error: ${r.error}`); continue; }
  if (!r.tracks.length) { console.log('    no subtitle tracks'); continue; }

  const shown = wantLang ? r.tracks.filter((t) => t.lang.startsWith(wantLang)) : r.tracks;
  if (!shown.length) { console.log(`    no ${wantLang} track`); continue; }

  for (const t of shown) {
    const mark = t.auto ? 'auto ' : 'HUMAN';
    if (!t.auto && (!wantLang || t.lang.startsWith(wantLang))) anyGood = true;
    console.log(`    [${mark}] ${t.lang.padEnd(8)} ${t.name}`);
  }
}

console.log(
  anyGood
    ? '\n  ✓ at least one human-written track found\n'
    : '\n  ✗ no human-written track in the requested language\n',
);
