import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const localToursPath = join(here, '../data/raw/llfans-detailed-tours.json');
const sorterToursPath = join(here, '../../the-sorter/data/raw/llfans-detailed-tours.json');
const TOURS_PATH = existsSync(localToursPath) ? localToursPath : sorterToursPath;
const OUT_PATH = join(here, '../data/event-extra.json');

interface PerformanceStub {
  id: string;
  name?: string | null;
  canceled?: boolean;
  audience?: boolean;
  openTime?: string | null;
  startTime?: string | null;
  note?: string | null;
}

interface Concert {
  name?: string | null;
  venue?: { id: string; name: string } | null;
  performances?: PerformanceStub[] | null;
}

interface DetailedTour {
  tourType?: { name?: string | null } | null;
  concerts?: Concert[] | null;
}

const tours: DetailedTour[] = JSON.parse(readFileSync(TOURS_PATH, 'utf-8'));

const trimTime = (time?: string | null) => (time ? time.slice(0, 5) : undefined);

const extra: Record<string, Record<string, unknown>> = {};
for (const tour of tours) {
  const tourType = tour.tourType?.name ?? undefined;
  for (const concert of tour.concerts ?? []) {
    for (const performance of concert.performances ?? []) {
      extra[performance.id] = {
        performanceName: performance.name ?? undefined,
        concertName: concert.name ?? undefined,
        venueId: concert.venue?.id ?? undefined,
        openTime: trimTime(performance.openTime),
        startTime: trimTime(performance.startTime),
        tourType,
        audience: performance.audience,
        canceled: performance.canceled || undefined,
        note: performance.note ?? undefined
      };
    }
  }
}

writeFileSync(OUT_PATH, JSON.stringify(extra));
console.log(`Wrote ${Object.keys(extra).length} entries to ${OUT_PATH}`);
