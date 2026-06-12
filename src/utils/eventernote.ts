import type { Performance } from '~/types';
import { foldKana } from '~/utils/event-filter';

export interface EventernoteEvent {
  name: string;
  href: string;
  date: string;
  place: string;
  artists: string[];
}

export interface EventMatch {
  event: EventernoteEvent;
  date?: string;
  candidates: { performance: Performance; score: number }[];
  best?: Performance;
  exact?: boolean;
}

export const eventernoteEventId = (href: string) => /\/events\/(\d+)/.exec(href)?.[1];

interface EventernoteResponse {
  success: boolean;
  data?: { events: EventernoteEvent[] };
  error?: { code: string; message: string };
}

export const eventernoteApiBase = () => {
  const url = import.meta.env.PUBLIC_ENV__EVENTERNOTE_API_URL || 'http://localhost:3002';
  return (/^https?:\/\//.test(url) ? url : `https://${url}`).replace(/\/+$/, '');
};

export const eventernoteEventUrl = (href: string) => `https://www.eventernote.com${href}`;

export const fetchEventernoteUserEvents = async (userId: string): Promise<EventernoteEvent[]> => {
  const response = await fetch(
    `${eventernoteApiBase()}/api/events/user/${encodeURIComponent(userId)}`
  );
  const body = (await response.json().catch(() => undefined)) as EventernoteResponse | undefined;
  if (!response.ok || !body?.success || !body.data) {
    throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
  }
  return body.data.events;
};

export const searchEventernoteEvents = async (keyword: string): Promise<EventernoteEvent[]> => {
  const response = await fetch(
    `${eventernoteApiBase()}/api/events/search?q=${encodeURIComponent(keyword)}&limit=20`
  );
  const body = (await response.json().catch(() => undefined)) as EventernoteResponse | undefined;
  if (!response.ok || !body?.success || !body.data) {
    throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
  }
  return body.data.events;
};

export const normalizeEventText = (text: string) =>
  foldKana(text.normalize('NFKC').toLowerCase()).replace(/[\s\p{P}\p{S}]/gu, '');

const bigrams = (text: string) => {
  const grams = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const gram = text.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
};

export const diceSimilarity = (a: string, b: string) => {
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length === 1 || b.length === 1) return a === b ? 1 : 0;
  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  let overlap = 0;
  for (const [gram, count] of gramsA) {
    overlap += Math.min(count, gramsB.get(gram) ?? 0);
  }
  return (2 * overlap) / (a.length - 1 + b.length - 1);
};

const extractDate = (text: string) => /\d{4}-\d{2}-\d{2}/.exec(text)?.[0];

const titleSimilarity = (name: string, performance: Performance) => {
  const normalized = normalizeEventText(name);
  const combined = [performance.tourName, performance.concertName, performance.performanceName]
    .filter(Boolean)
    .join(' ');
  return Math.max(
    diceSimilarity(normalized, normalizeEventText(performance.tourName)),
    diceSimilarity(normalized, normalizeEventText(combined)),
    performance.concertName
      ? diceSimilarity(normalized, normalizeEventText(performance.concertName))
      : 0,
    performance.performanceName
      ? diceSimilarity(normalized, normalizeEventText(performance.performanceName))
      : 0
  );
};

const venueSimilarity = (place: string, venue: string) => {
  const a = normalizeEventText(place);
  const b = normalizeEventText(venue);
  const similarity = diceSimilarity(a, b);
  if (a && b && (a.includes(b) || b.includes(a))) return Math.max(similarity, 0.85);
  return similarity;
};

export const matchEventernoteEvents = (
  events: EventernoteEvent[],
  performances: Performance[],
  performanceByEventernoteId?: Map<string, Performance>
): EventMatch[] => {
  const byDate = new Map<string, Performance[]>();
  for (const performance of performances) {
    const list = byDate.get(performance.date);
    if (list) list.push(performance);
    else byDate.set(performance.date, [performance]);
  }
  return events.map((event) => {
    const date = extractDate(event.date);
    const eventId = eventernoteEventId(event.href);
    const exact = eventId ? performanceByEventernoteId?.get(eventId) : undefined;
    if (exact) {
      return {
        event,
        date,
        candidates: [{ performance: exact, score: 1 }],
        best: exact,
        exact: true
      };
    }
    const candidates = (date ? (byDate.get(date) ?? []) : [])
      .map((performance) => ({
        performance,
        score:
          0.65 * titleSimilarity(event.name, performance) +
          0.35 * venueSimilarity(event.place, performance.venue)
      }))
      .filter((candidate) => candidate.score > 0.2)
      .sort((a, b) => b.score - a.score);
    const best =
      candidates.length > 0 &&
      candidates[0]!.score >= 0.45 &&
      (candidates.length === 1 || candidates[0]!.score - candidates[1]!.score >= 0.1)
        ? candidates[0]!.performance
        : undefined;
    return { event, date, candidates, best };
  });
};

export interface PerformanceEventMatch {
  event: EventernoteEvent;
  score: number;
  sameDate: boolean;
}

export const matchPerformanceToEvents = (
  performance: Performance,
  events: EventernoteEvent[]
): PerformanceEventMatch[] =>
  events
    .map((event) => ({
      event,
      sameDate: extractDate(event.date) === performance.date,
      score:
        0.65 * titleSimilarity(event.name, performance) +
        0.35 * venueSimilarity(event.place, performance.venue)
    }))
    .filter((match) => match.sameDate || match.score > 0.2)
    .sort((a, b) => Number(b.sameDate) - Number(a.sameDate) || b.score - a.score)
    .slice(0, 5);
