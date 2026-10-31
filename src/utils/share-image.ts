import { domToBlob } from 'modern-screenshot';

const elementToPng = (element: HTMLElement, backgroundColor?: string) =>
  domToBlob(element, {
    scale: 2,
    width: element.scrollWidth,
    height: element.scrollHeight,
    backgroundColor: backgroundColor ?? getComputedStyle(document.body).backgroundColor,
    style: { overflow: 'visible' }
  });

export const canCopyImageToClipboard = () =>
  typeof ClipboardItem !== 'undefined' && typeof navigator?.clipboard?.write === 'function';

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
