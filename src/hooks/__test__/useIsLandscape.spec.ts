import { act, renderHook } from '@testing-library/react';
import type { SyntheticEvent } from 'react';
import { describe, expect, it } from 'vitest';
import { useIsLandscape } from '../useIsLandscape';

const loadedImage = (src: string, width: number, height: number) =>
  ({
    getAttribute: () => src,
    complete: true,
    naturalWidth: width,
    naturalHeight: height
  }) as unknown as HTMLImageElement;

const loadEvent = (img: HTMLImageElement) =>
  ({ currentTarget: img }) as SyntheticEvent<HTMLImageElement>;

describe('useIsLandscape', () => {
  it('is false until the image has loaded', () => {
    const { result } = renderHook(() => useIsLandscape('logo.webp'));

    expect(result.current.landscape).toBe(false);
  });

  it('flags an image wider than it is tall', () => {
    const { result } = renderHook(() => useIsLandscape('logo.webp'));

    act(() => result.current.imgProps.onLoad(loadEvent(loadedImage('logo.webp', 400, 213))));

    expect(result.current.landscape).toBe(true);
  });

  it('leaves a portrait poster alone', () => {
    const { result } = renderHook(() => useIsLandscape('poster.webp'));

    act(() => result.current.imgProps.onLoad(loadEvent(loadedImage('poster.webp', 283, 400))));

    expect(result.current.landscape).toBe(false);
  });

  it('measures an image that loaded before onLoad was attached', () => {
    const { result } = renderHook(() => useIsLandscape('logo.webp'));

    act(() => result.current.imgProps.ref(loadedImage('logo.webp', 400, 213)));

    expect(result.current.landscape).toBe(true);
  });

  it('ignores an image that has not finished loading', () => {
    const { result } = renderHook(() => useIsLandscape('logo.webp'));
    const pending = { ...loadedImage('logo.webp', 0, 0), complete: false } as HTMLImageElement;

    act(() => result.current.imgProps.ref(pending));

    expect(result.current.landscape).toBe(false);
  });

  it('drops the measurement when the src changes', () => {
    const { result, rerender } = renderHook(({ src }) => useIsLandscape(src), {
      initialProps: { src: 'logo.webp' }
    });

    act(() => result.current.imgProps.onLoad(loadEvent(loadedImage('logo.webp', 400, 213))));
    rerender({ src: 'poster.webp' });

    expect(result.current.landscape).toBe(false);
  });
});
