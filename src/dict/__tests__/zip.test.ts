import { describe, expect, it } from 'vitest';
import { zipFiles } from '../zip';

const utf8 = new TextEncoder();
const text = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

interface Member {
  name: string;
  data: string;
  /** 0 stored, 8 deflated; anything else is written as stored bytes under that number. */
  method?: number;
  flags?: number;
  /** Bytes of extra field in the file's own header, which the directory's listing need not match. */
  extra?: number;
  /** The unpacked size the directory claims, where that is not the truth. */
  claims?: number;
  /** What to write as the packed bytes, in place of the real ones. */
  packed?: Uint8Array;
}

/** Deflate with no wrapper round it, which is how a zip holds a file. */
async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * A zip built by hand, so the reader is tested against the format, not against
 * itself: a header and the data for each file, then the directory, then the
 * record that says where the directory is.
 */
async function zip(members: Member[], comment = ''): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (const m of members) {
    const name = utf8.encode(m.name);
    const raw = utf8.encode(m.data);
    const method = m.method ?? 0;
    const packed = m.packed ?? (method === 8 ? await deflate(raw) : raw);
    const size = m.claims ?? raw.length;

    const header = new Uint8Array(30 + name.length + (m.extra ?? 0));
    const h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(6, m.flags ?? 0, true);
    h.setUint16(8, method, true);
    h.setUint32(18, packed.length, true);
    h.setUint32(22, size, true);
    h.setUint16(26, name.length, true);
    h.setUint16(28, m.extra ?? 0, true);
    header.set(name, 30);

    const listing = new Uint8Array(46 + name.length);
    const l = new DataView(listing.buffer);
    l.setUint32(0, 0x02014b50, true);
    l.setUint16(8, m.flags ?? 0, true);
    l.setUint16(10, method, true);
    l.setUint32(20, packed.length, true);
    l.setUint32(24, size, true);
    l.setUint16(28, name.length, true);
    l.setUint32(42, offset, true);
    listing.set(name, 46);

    parts.push(header, packed);
    directory.push(listing);
    offset += header.length + packed.length;
  }

  const note = utf8.encode(comment);
  const end = new Uint8Array(22 + note.length);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, members.length, true);
  e.setUint16(10, members.length, true);
  e.setUint32(12, directory.reduce((n, d) => n + d.length, 0), true);
  e.setUint32(16, offset, true);
  e.setUint16(20, note.length, true);
  end.set(note, 22);

  const all = [...parts, ...directory, end];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Where the end record starts, in an archive with no comment. */
const endOf = (archive: Uint8Array): number => archive.length - 22;

/** Where the directory's listing of the archive's one file starts. */
const listingOf = (archive: Uint8Array, name: string): number => endOf(archive) - 46 - utf8.encode(name).length;

const BANK = JSON.stringify([['casa', '', 'n fem', 'n', 0, ['house'], 0, '']]);

describe('zipFiles', () => {
  it('lists the files in directory order, with their unpacked sizes', async () => {
    const files = zipFiles(await zip([
      { name: 'index.json', data: '{"title":"wty-es-en"}' },
      { name: 'term_bank_1.json', data: BANK.repeat(40), method: 8 },
    ]));
    expect(files.map((f) => [f.name, f.size])).toEqual([
      ['index.json', 21],
      ['term_bank_1.json', BANK.length * 40],
    ]);
  });

  it('unpacks stored and deflated files', async () => {
    const [stored, deflated] = zipFiles(await zip([
      { name: 'index.json', data: '{"title":"wty-es-en"}' },
      { name: 'term_bank_1.json', data: BANK.repeat(40), method: 8 },
    ]));
    expect(text(await stored!.bytes())).toBe('{"title":"wty-es-en"}');
    expect(text(await deflated!.bytes())).toBe(BANK.repeat(40));
  });

  it('reads names as UTF-8', async () => {
    const [file] = zipFiles(await zip([{ name: 'términos/한국어.json', data: '["먹다"]', method: 8 }]));
    expect(file!.name).toBe('términos/한국어.json');
    expect(text(await file!.bytes())).toBe('["먹다"]');
  });

  it('skips folders', async () => {
    const files = zipFiles(await zip([
      { name: 'banks/', data: '' },
      { name: 'banks/term_bank_1.json', data: BANK },
    ]));
    expect(files.map((f) => f.name)).toEqual(['banks/term_bank_1.json']);
  });

  it('finds the data from the file’s own header, whose extra fields the directory does not list', async () => {
    const [a, b] = zipFiles(await zip([
      { name: 'a.json', data: '[1]', extra: 28 },
      { name: 'b.json', data: '[2]', method: 8, extra: 9 },
    ]));
    expect(text(await a!.bytes())).toBe('[1]');
    expect(text(await b!.bytes())).toBe('[2]');
  });

  it('finds the directory behind an archive comment', async () => {
    const [file] = zipFiles(await zip([{ name: 'a.json', data: '[1]' }], 'made by hand'));
    expect(text(await file!.bytes())).toBe('[1]');
  });

  it('reads an archive that is a view into a larger buffer', async () => {
    const archive = await zip([{ name: 'a.json', data: BANK, method: 8 }]);
    const padded = new Uint8Array(archive.length + 64);
    padded.set(archive, 40);
    const [file] = zipFiles(padded.subarray(40, 40 + archive.length));
    expect(text(await file!.bytes())).toBe(BANK);
  });

  it('unpacks a file only when it is asked for', async () => {
    // The first file's data is not deflate at all. Listing does not look.
    const files = zipFiles(await zip([
      { name: 'broken.json', data: BANK, method: 8, packed: utf8.encode('this was never deflated') },
      { name: 'good.json', data: BANK, method: 8 },
    ]));
    expect(files.map((f) => f.name)).toEqual(['broken.json', 'good.json']);
    expect(text(await files[1]!.bytes())).toBe(BANK);
    await expect(files[0]!.bytes()).rejects.toThrow(/^libregaku: the zip is cut short or damaged — broken\.json/);
  });

  it('hands over a stored file as a view of the archive, not a copy', async () => {
    const archive = await zip([{ name: 'a.json', data: BANK }]);
    const bytes = await zipFiles(archive)[0]!.bytes();
    expect(bytes.buffer).toBe(archive.buffer);
  });
});

describe('what zipFiles refuses', () => {
  it('something that is not a zip', () => {
    expect(() => zipFiles(utf8.encode('not a zip at all, just text'))).toThrow('libregaku: not a zip archive');
    expect(() => zipFiles(utf8.encode('<html>'))).toThrow('libregaku: not a zip archive');
    expect(() => zipFiles(new Uint8Array())).toThrow('libregaku: not a zip archive');
  });

  it('a zip whose end is missing — a download that stopped', async () => {
    const archive = await zip([{ name: 'term_bank_1.json', data: BANK.repeat(40), method: 8 }]);
    expect(() => zipFiles(archive.subarray(0, archive.length - 30))).toThrow(/^libregaku: the zip is cut short or damaged/);
    expect(() => zipFiles(archive.subarray(0, 50))).toThrow(/The download may not have finished/);
  });

  it('a zip64 archive', async () => {
    const many = await zip([{ name: 'a.json', data: '[1]' }]);
    new DataView(many.buffer).setUint16(endOf(many) + 10, 0xffff, true);
    expect(() => zipFiles(many)).toThrow('libregaku: zip64 archives are not supported');

    const large = await zip([{ name: 'a.json', data: '[1]' }]);
    new DataView(large.buffer).setUint32(listingOf(large, 'a.json') + 24, 0xffffffff, true);
    expect(() => zipFiles(large)).toThrow('libregaku: zip64 archives are not supported (a.json)');
  });

  it('a directory that says it is somewhere it cannot be', async () => {
    const archive = await zip([{ name: 'a.json', data: '[1]' }]);
    new DataView(archive.buffer).setUint32(endOf(archive) + 16, archive.length, true);
    expect(() => zipFiles(archive)).toThrow(/^libregaku: the zip is cut short or damaged — its directory runs past/);
  });

  it('a directory that lists more files than it holds', async () => {
    const archive = await zip([{ name: 'a.json', data: '[1]' }, { name: 'b.json', data: '[2]' }]);
    new DataView(archive.buffer).setUint16(endOf(archive) + 10, 3, true);
    expect(() => zipFiles(archive)).toThrow(/its directory lists 3 files and stops after 2/);
  });

  it('an encrypted file, when it is asked for', async () => {
    const [locked, open] = zipFiles(await zip([
      { name: 'locked.json', data: '[1]', flags: 1 },
      { name: 'open.json', data: '[2]' },
    ]));
    await expect(locked!.bytes()).rejects.toThrow('libregaku: locked.json in the zip is encrypted');
    expect(text(await open!.bytes())).toBe('[2]');
  });

  it('a file packed by a method other than deflate, when it is asked for', async () => {
    const [file] = zipFiles(await zip([{ name: 'a.json', data: '[1]', method: 12 }]));
    await expect(file!.bytes()).rejects.toThrow(
      'libregaku: a.json in the zip is packed by a method this cannot read (12)',
    );
  });

  it('a file that is not where the directory says', async () => {
    const archive = await zip([{ name: 'a.json', data: '[1]' }]);
    new DataView(archive.buffer).setUint32(listingOf(archive, 'a.json') + 42, 7, true);
    await expect(zipFiles(archive)[0]!.bytes()).rejects.toThrow(/cut short or damaged — a\.json is not where the directory says/);
  });

  it('a file whose data runs past the end of the archive', async () => {
    const archive = await zip([{ name: 'a.json', data: '[1]' }]);
    new DataView(archive.buffer).setUint32(listingOf(archive, 'a.json') + 20, 5000, true);
    await expect(zipFiles(archive)[0]!.bytes()).rejects.toThrow(/cut short or damaged — a\.json runs past the end/);
  });

  it('a file that unpacks to a different size than the directory lists', async () => {
    const [file] = zipFiles(await zip([{ name: 'a.json', data: BANK, method: 8, claims: BANK.length + 1 }]));
    await expect(file!.bytes()).rejects.toThrow(
      new RegExp(`a\\.json is ${BANK.length} bytes unpacked, and the directory says ${BANK.length + 1}`),
    );
  });
});
