import { domToBlob } from 'modern-screenshot';
import { saveAs } from 'file-saver';
import type { Performance } from '~/types';

export const eventernoteSearchUrl = (performance: Performance) => {
  const params = new URLSearchParams({ keyword: performance.tourName });
  return `https://www.eventernote.com/events/search?${params.toString()}`;
};

export const llFansEventUrl = (performance: Performance): string | undefined => {
  if (!performance.eventId) return undefined;
  const params = new URLSearchParams();
  if (performance.concertId) params.set('concert', performance.concertId);
  params.set('performance', performance.id);
  return `https://ll-fans.jp/data/event/${performance.eventId}?${params.toString()}`;
};

export const xShareUrl = (text: string, url?: string) => {
  const params = new URLSearchParams({ text });
  if (url) params.set('url', url);
  return `https://x.com/intent/post?${params.toString()}`;
};

export const downloadElementAsImage = async (
  element: HTMLElement,
  filename: string,
  backgroundColor?: string
) => {
  const blob = await domToBlob(element, {
    scale: 2,
    width: element.scrollWidth,
    height: element.scrollHeight,
    backgroundColor: backgroundColor ?? getComputedStyle(document.body).backgroundColor,
    style: { overflow: 'visible' }
  });
  if (blob) saveAs(blob, filename);
};

export const copyTextToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

export const formatEventShareText = (performance: Performance) =>
  `${performance.date} ${performance.tourName} @ ${performance.venue}`;
