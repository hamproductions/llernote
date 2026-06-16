import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { MyPickLiveState } from '~/types/mypick-live';

// Compact wire format so live-MyPick share URLs stay short. This is a separate
// encoder from the grid MyPick (`~/utils/mypick-share`) — the models differ.
// `p` is an array of performance ids; a legacy string `p` is still decodable.
interface WireState {
  p: string[] | string;
  a: Record<string, [string, string]>; // award key -> [kind, id]
  u: Record<string, string>; // artistId -> songId
  c: { i: string; l: string }[]; // custom awards
}

export function encodeMyPickLive(state: MyPickLiveState): string {
  const wire: WireState = {
    p: state.performanceIds,
    a: Object.fromEntries(
      Object.entries(state.awards).map(([key, value]) => [key, [value.type, value.id]])
    ),
    u: state.unitPicks,
    c: state.customAwards.map((award) => ({ i: award.id, l: award.label }))
  };
  return compressToEncodedURIComponent(JSON.stringify(wire));
}

export function decodeMyPickLive(encoded: string | null | undefined): MyPickLiveState | null {
  if (!encoded) return null;
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const wire = JSON.parse(json) as Partial<WireState>;
    if (!wire) return null;
    const performanceIds =
      typeof wire.p === 'string'
        ? [wire.p]
        : Array.isArray(wire.p)
          ? wire.p.filter((id): id is string => typeof id === 'string')
          : null;
    if (!performanceIds || performanceIds.length === 0) return null;
    return {
      performanceIds,
      awards: Object.fromEntries(
        Object.entries(wire.a ?? {}).map(([key, [type, id]]) => [
          key,
          { type: type as MyPickLiveState['awards'][string]['type'], id }
        ])
      ),
      unitPicks: wire.u ?? {},
      customAwards: (wire.c ?? []).map((award) => ({ id: award.i, label: award.l }))
    };
  } catch {
    return null;
  }
}

export const myPickLiveShareUrl = (encoded: string) => {
  const base = import.meta.env.PUBLIC_ENV__BASE_URL ?? '/';
  const path = `${base}mypick/live/share`.replace(/\/{2,}/g, '/');
  return `${window.location.origin}${path}?d=${encoded}`;
};
