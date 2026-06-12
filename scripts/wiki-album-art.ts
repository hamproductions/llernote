import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

export interface Song {
  id: string;
  name: string;
  englishName?: string;
}

export interface WikiPage {
  pageid: number;
  title: string;
  imageUrl?: string;
}

export interface SongWikiMatch {
  songId: string;
  pageid: number;
  title: string;
  imageUrl?: string;
}

interface CategoryResponse {
  continue?: { gcmcontinue?: string };
  query?: {
    pages?: Record<
      string,
      {
        pageid: number;
        title: string;
        original?: { source: string };
        thumbnail?: { source: string };
      }
    >;
  };
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const wikiApi = 'https://love-live.fandom.com/api.php';
const songsPath = join(root, 'data/song-info.json');
const thumbsPath = join(root, 'data/song-thumbs.json');
const thumbnailDir = join(root, 'public/assets/songs/thumbnails');
const cachePath = join(process.env.TMPDIR || '/tmp', 'llernote-wiki-album-art-pages.json');
const categories = [
  'Category:Lyrics',
  'Category:Discography',
  'Category:Discography:Aqours',
  'Category:Discography:Nijigaku',
  'Category:Discography:Hasunosora',
  'Category:Discography:School Idol Musical',
  'Category:Discography:Liella!',
  "Category:Discography:µ's"
];
const songPageOverrides: Record<string, string> = {
  '402': 'Crescendo Yu・Ra',
  '864': 'Freesia',
  '877': 'Reboot',
  '862': 'CORO CORO Lovely TIME!!!',
  '881': 'Icy',
  '884': 'Kanazawa One-Side Love',
  '887': 'Meu Amoré・Meerkat',
  '872': 'Symmetry',
  '895': 'Skip・Capsule'
};

const imageExtension = /\.(?:jpg|jpeg|png|webp)$/i;
const badImageWords = /(audio|icon|logo|banner|transparent|stamp|button|symbol|ogg|mp3|wav|flac)/i;
const goodImageWords = /(cover|jacket|album|single|edition|limited|regular|盤|初回|通常)/i;

export function normalizeWikiTitle(title: string) {
  return title
    .replace(/\s*\([^)]+\)\s*$/g, '')
    .toLowerCase()
    .replace(/[µμ]/g, 'u')
    .replace(/[～〜]/g, '~')
    .replace(/[♥♡]/g, '')
    .replace(/[―–—−-]/g, '-')
    .replace(/[^a-z0-9]/gi, '');
}

export function extractImageFiles(content: string) {
  const files: string[] = [];
  const patterns = [
    /(?:^|\n)\s*\|\s*(?:image|cover|jacket)\s*=\s*(?:\[\[File:)?([^\]\|\n]+?\.(?:jpg|jpeg|png|webp))/gi,
    /\[\[File:([^\]\|\n]+?\.(?:jpg|jpeg|png|webp))/gi
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const file = match[1].replace(/[\u200e\u200f]/g, '').trim();
      if (imageExtension.test(file) && !badImageWords.test(file) && !files.includes(file)) {
        files.push(file);
      }
    }
  }

  return files;
}

export function findAlbumArtFile(files: string[]) {
  return [...files]
    .filter((file) => imageExtension.test(file) && !badImageWords.test(file))
    .sort((a, b) => scoreImageFile(b) - scoreImageFile(a))[0];
}

export function matchSongsToWikiPages(songs: Song[], pages: WikiPage[]) {
  const pagesByTitle = new Map<string, WikiPage>();
  for (const page of pages) {
    const normalized = normalizeWikiTitle(page.title);
    if (!pagesByTitle.has(normalized)) {
      pagesByTitle.set(normalized, page);
    }
  }

  const matches: SongWikiMatch[] = [];
  for (const song of songs) {
    const candidates = [songPageOverrides[song.id], song.englishName, song.name].filter(
      Boolean
    ) as string[];
    const page = candidates.map((name) => pagesByTitle.get(normalizeWikiTitle(name))).find(Boolean);
    if (page) {
      matches.push({
        songId: song.id,
        pageid: page.pageid,
        title: page.title,
        imageUrl: page.imageUrl
      });
    }
  }
  return matches;
}

function scoreImageFile(file: string) {
  const name = file.toLowerCase();
  let score = 0;
  if (goodImageWords.test(name)) score += 10;
  if (/\.(?:jpg|jpeg|png|webp)$/i.test(name)) score += 2;
  if (/cover/i.test(name)) score += 4;
  if (badImageWords.test(name)) score -= 20;
  return score;
}

async function fetchCategory(category: string) {
  const pages: WikiPage[] = [];
  let gcmcontinue: string | undefined;

  do {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'categorymembers',
      gcmtitle: category,
      gcmlimit: '500',
      prop: 'pageimages',
      piprop: 'original|thumbnail',
      pithumbsize: '600',
      format: 'json'
    });
    if (gcmcontinue) params.set('gcmcontinue', gcmcontinue);

    const response = await fetch(`${wikiApi}?${params}`);
    if (!response.ok) throw new Error(`Wiki request failed: ${response.status}`);
    const data = (await response.json()) as CategoryResponse;
    for (const page of Object.values(data.query?.pages ?? {})) {
      pages.push({
        pageid: page.pageid,
        title: page.title,
        imageUrl: page.thumbnail?.source ?? page.original?.source
      });
    }
    gcmcontinue = data.continue?.gcmcontinue;
  } while (gcmcontinue);

  return pages;
}

async function fetchPagesByTitles(titles: string[]) {
  const pages: WikiPage[] = [];
  for (let i = 0; i < titles.length; i += 50) {
    const params = new URLSearchParams({
      action: 'query',
      titles: titles.slice(i, i + 50).join('|'),
      prop: 'pageimages',
      piprop: 'original|thumbnail',
      pithumbsize: '600',
      redirects: '1',
      format: 'json'
    });
    const response = await fetch(`${wikiApi}?${params}`);
    if (!response.ok) throw new Error(`Wiki request failed: ${response.status}`);
    const data = (await response.json()) as CategoryResponse;
    for (const page of Object.values(data.query?.pages ?? {})) {
      if (page.pageid > 0) {
        pages.push({
          pageid: page.pageid,
          title: page.title,
          imageUrl: page.thumbnail?.source ?? page.original?.source
        });
      }
    }
  }
  return pages;
}

async function fetchWikiPages() {
  const seen = new Set<number>();
  const pages: WikiPage[] = [];

  for (const category of categories) {
    const categoryPages = await fetchCategory(category);
    for (const page of categoryPages) {
      if (!seen.has(page.pageid)) {
        seen.add(page.pageid);
        pages.push(page);
      }
    }
    console.log(`${category}: ${categoryPages.length} (${pages.length} unique)`);
  }

  const overridePages = await fetchPagesByTitles(Object.values(songPageOverrides));
  for (const page of overridePages) {
    if (!seen.has(page.pageid)) {
      seen.add(page.pageid);
      pages.push(page);
    }
  }
  console.log(`Overrides: ${overridePages.length} (${pages.length} unique)`);

  writeFileSync(cachePath, JSON.stringify({ fetchedAt: new Date().toISOString(), pages }, null, 2));
  return pages;
}

function loadCachedPages() {
  if (process.argv.includes('--refresh')) return null;
  if (!existsSync(cachePath)) return null;
  const cache = JSON.parse(readFileSync(cachePath, 'utf-8')) as {
    fetchedAt: string;
    pages: WikiPage[];
  };
  const ageDays = (Date.now() - new Date(cache.fetchedAt).getTime()) / 86_400_000;
  if (ageDays >= 7) return null;
  console.log(`Using cached wiki album art pages (${ageDays.toFixed(1)} days old)`);
  return cache.pages;
}

async function getWikiPages() {
  return loadCachedPages() ?? (await fetchWikiPages());
}

async function downloadAlbumArt(match: SongWikiMatch) {
  if (!match.imageUrl) return false;

  const response = await fetch(match.imageUrl, { referrerPolicy: 'no-referrer' });
  if (!response.ok) return false;

  mkdirSync(thumbnailDir, { recursive: true });
  const contentType = response.headers.get('content-type') ?? '';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const tmpPath = join(thumbnailDir, `${match.songId}.${ext}.tmp`);
  const outPath = join(thumbnailDir, `${match.songId}.webp`);
  writeFileSync(tmpPath, new Uint8Array(await response.arrayBuffer()));

  try {
    if (ext === 'webp') {
      copyFileSync(tmpPath, outPath);
    } else {
      execFileSync('cwebp', ['-quiet', '-resize', '320', '320', tmpPath, '-o', outPath]);
    }
    return true;
  } finally {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
  }
}

function regenerateThumbManifest() {
  const ids = readdirSync(thumbnailDir)
    .filter((file) => file.endsWith('.webp'))
    .map((file) => file.replace(/\.webp$/, ''))
    .sort((a, b) => Number(a) - Number(b));
  writeFileSync(thumbsPath, JSON.stringify(ids));
  return ids.length;
}

async function main() {
  const songs = JSON.parse(readFileSync(songsPath, 'utf-8')) as Song[];
  if (process.argv.includes('--manifest-only')) {
    const manifestCount = regenerateThumbManifest();
    console.log(`Manifest thumbnails: ${manifestCount}`);
    return;
  }
  const pages = await getWikiPages();
  const matches = matchSongsToWikiPages(songs, pages).filter((match) => match.imageUrl);
  const matchedIds = new Set(matches.map((match) => match.songId));
  if (process.argv.includes('--prune')) {
    for (const song of songs) {
      const path = join(thumbnailDir, `${song.id}.webp`);
      if (!matchedIds.has(song.id) && existsSync(path)) {
        unlinkSync(path);
      }
    }
  }
  const existing = new Set(
    existsSync(thumbnailDir)
      ? readdirSync(thumbnailDir)
          .filter((file) => file.endsWith('.webp'))
          .map((file) => file.replace(/\.webp$/, ''))
      : []
  );
  const missing = matches.filter((match) => !existing.has(match.songId));
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.replace('--limit=', '')) : undefined;
  const selected = Number.isFinite(limit) ? missing.slice(0, limit) : missing;

  console.log(`Songs: ${songs.length}`);
  console.log(`Wiki pages: ${pages.length}`);
  console.log(`Matched image pages: ${matches.length}`);
  console.log(`Existing thumbnails: ${existing.size}`);
  console.log(`Downloading: ${selected.length}`);

  let downloaded = 0;
  for (const match of selected) {
    if (await downloadAlbumArt(match)) downloaded++;
    if (downloaded > 0 && downloaded % 50 === 0) {
      console.log(`Downloaded ${downloaded}/${selected.length}`);
    }
  }

  const manifestCount = regenerateThumbManifest();
  console.log(`Downloaded ${downloaded}`);
  console.log(`Manifest thumbnails: ${manifestCount}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
