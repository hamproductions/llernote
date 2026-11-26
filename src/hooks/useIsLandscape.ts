import { useCallback, useState, type SyntheticEvent } from 'react';

/**
 * Whether the image at `src` turned out wider than it is tall, once it has loaded.
 *
 * Poster frames are portrait, so `cover` crops a landscape logo down to its middle
 * letters; callers switch those to `contain`. Spread `imgProps` onto the `<img>`: the ref
 * catches images that finished loading before React attached `onLoad` (cached, or decoded
 * before hydration). The result is keyed by src, so a stale measurement never leaks onto
 * the next image.
 */
export function useIsLandscape(src: string | undefined) {
  const [measured, setMeasured] = useState<{ src: string; landscape: boolean }>();

  const measure = useCallback((img: HTMLImageElement | null) => {
    const imgSrc = img?.getAttribute('src');
    if (!img || !imgSrc || !img.complete || img.naturalWidth === 0) return;
    setMeasured({ src: imgSrc, landscape: img.naturalWidth > img.naturalHeight });
  }, []);

  const onLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => measure(event.currentTarget),
    [measure]
  );

  return {
    landscape: measured !== undefined && measured.src === src && measured.landscape,
    imgProps: { ref: measure, onLoad }
  };
}
