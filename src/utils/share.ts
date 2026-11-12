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

export const elementToImageBlob = async (element: HTMLElement, backgroundColor?: string) => {
  const { domToBlob } = await import('modern-screenshot');
  return domToBlob(element, {
    scale: 2,
    width: element.scrollWidth,
    height: element.scrollHeight,
    backgroundColor: backgroundColor ?? getComputedStyle(document.body).backgroundColor,
    style: { overflow: 'visible' }
  });
};

export const downloadElementAsImage = async (
  element: HTMLElement,
  filename: string,
  backgroundColor?: string
) => {
  const [blob, { saveAs }] = await Promise.all([
    elementToImageBlob(element, backgroundColor),
    import('file-saver')
  ]);
  if (blob) saveAs(blob, filename);
};

export const canShareImageFile = () =>
  typeof navigator !== 'undefined' &&
  Boolean(navigator.canShare?.({ files: [new File([''], 'image.png', { type: 'image/png' })] }));

export const shareElementAsImage = async (
  element: HTMLElement,
  filename: string,
  data: { text: string; url: string },
  backgroundColor?: string
) => {
  const blob = await elementToImageBlob(element, backgroundColor);
  if (!blob) return;
  await navigator.share({
    files: [new File([blob], filename, { type: 'image/png' })],
    text: `${data.text} ${data.url}`
  });
};

export const copyTextToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

export const formatEventShareText = (performance: Performance) =>
  `${performance.date} ${performance.tourName} @ ${performance.venue}`;
