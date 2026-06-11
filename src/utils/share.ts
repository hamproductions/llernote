import { domToBlob } from 'modern-screenshot';
import { saveAs } from 'file-saver';
import type { Performance } from '~/types';

export const eventernoteSearchUrl = (performance: Performance) => {
  const params = new URLSearchParams({ keyword: performance.tourName });
  return `https://www.eventernote.com/events/search?${params.toString()}`;
};

export const xShareUrl = (text: string, url?: string) => {
  const params = new URLSearchParams({ text });
  if (url) params.set('url', url);
  return `https://x.com/intent/post?${params.toString()}`;
};

export const downloadElementAsImage = async (element: HTMLElement, filename: string) => {
  const blob = await domToBlob(element, {
    scale: 2,
    backgroundColor: getComputedStyle(document.body).backgroundColor
  });
  if (blob) saveAs(blob, filename);
};

export const copyTextToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

export const formatEventShareText = (performance: Performance) =>
  `${performance.date} ${performance.tourName} @ ${performance.venue}`;
