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

const elementToPng = (element: HTMLElement, backgroundColor?: string) =>
  domToBlob(element, {
    scale: 2,
    width: element.scrollWidth,
    height: element.scrollHeight,
    backgroundColor: backgroundColor ?? getComputedStyle(document.body).backgroundColor,
    style: { overflow: 'visible' }
  });

export const downloadElementAsImage = async (
  element: HTMLElement,
  filename: string,
  backgroundColor?: string
) => {
  const blob = await elementToPng(element, backgroundColor);
  if (blob) saveAs(blob, filename);
};

export const canCopyImageToClipboard = () =>
  typeof ClipboardItem !== 'undefined' && typeof navigator?.clipboard?.write === 'function';

/**
 * Copy a rendered element to the clipboard as a PNG.
 *
 * `ClipboardItem` is handed the *pending* blob rather than an awaited one: Safari voids
 * the user-gesture permission if `clipboard.write` is reached after an await, so the
 * promise has to be passed through synchronously.
 */
export const copyElementImageToClipboard = async (
  element: HTMLElement,
  backgroundColor?: string
) => {
  const png = elementToPng(element, backgroundColor).then((blob) => {
    if (!blob) throw new Error('Failed to render element to an image');
    return blob;
  });
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
};

export const copyTextToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

export const formatEventShareText = (performance: Performance) =>
  `${performance.date} ${performance.tourName} @ ${performance.venue}`;
