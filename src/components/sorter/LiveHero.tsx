import { useEffect, useState } from 'react';
import { FaTicket } from 'react-icons/fa6';
import { Box, Center, Grid } from 'styled-system/jsx';
import { useLiveThumb, useSeriesById, useSetlists } from '~/hooks/useData';
import { heroSongIds, mosaicLayout, type SortCandidate } from '~/utils/live-sort';
import { getPicUrl } from '~/utils/assets';
import { hasSongThumb } from '~/utils/song-thumbs';
import { seriesColors, seriesGradient } from '~/utils/series-contrast';

/** Tiles per mosaic — 6 fills the frame without the art getting stamp-sized. */
const MOSAIC_TILES = 6;

/**
 * Fixed 3:4 portrait frame, the shape live key visuals come in. Sized rather than
 * fluid so both cards' heroes match regardless of how their titles wrap.
 */
const FRAME = {
  w: { base: '6.5rem', md: '10rem' },
  aspectRatio: '3/4',
  flexShrink: 0,
  borderRadius: 'l2'
} as const;

/** Same 3:4 shape, sized by its container — used for the results grid cells. */
const FILL_FRAME = { w: 'full', aspectRatio: '3/4' } as const;

/**
 * The poster-shaped image beside a comparison card's details.
 *
 * Falls through three sources, because a poster alone would leave four cards in five
 * blank: the live's own key visual, then a mosaic of its setlist's album art, then a
 * panel in the live's series colours. The card renders the title below, so nothing here
 * repeats it.
 */
export function LiveHero({
  candidate,
  fill = false
}: {
  candidate: SortCandidate;
  /** Stretch to the container width instead of the fixed sidebar size. */
  fill?: boolean;
}) {
  const lead = candidate.performances[0];
  // Always resolved at tour scope: a single performance should wear the poster of the
  // event it belongs to, so every leg of a tour shows the same key visual.
  const thumb = useLiveThumb(lead, true);
  const setlists = useSetlists();
  const seriesById = useSeriesById();
  const [posterFailed, setPosterFailed] = useState(false);

  const gradient = seriesGradient(seriesColors(candidate.seriesIds, seriesById));
  // Prefer the downloaded copy. Fandom 404s hotlinked requests that carry a Referer, so
  // the remote URL is only a fallback for posters not yet pulled down.
  const posterSrc = thumb?.file ? getPicUrl(thumb.file, 'live') : thumb?.image;

  useEffect(() => setPosterFailed(false), [posterSrc]);

  const frame = fill ? FILL_FRAME : FRAME;

  if (thumb && !posterFailed) {
    return (
      <Box position="relative" {...frame} bgColor="bg.subtle" overflow="hidden">
        {/* Posters are close to 3:4 but not exactly, so `cover` trims a little rather than
            leaving bars. The series wash only shows on the few that are squarer. */}
        <Box aria-hidden style={{ background: gradient }} inset="0" position="absolute" />
        <img
          src={posterSrc}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{
            position: 'relative',
            objectFit: 'cover',
            width: '100%',
            height: '100%'
          }}
          onError={() => setPosterFailed(true)}
        />
      </Box>
    );
  }

  const available = heroSongIds(candidate, setlists, hasSongThumb, MOSAIC_TILES);
  const { count, columns } = mosaicLayout(available.length);
  const songIds = available.slice(0, count);

  if (songIds.length > 0) {
    return (
      <Grid
        gap="0"
        gridTemplateColumns={`repeat(${columns}, 1fr)`}
        {...frame}
        bgColor="bg.subtle"
        overflow="hidden"
      >
        {songIds.map((songId) => (
          <Box key={songId} position="relative" overflow="hidden">
            <img
              src={getPicUrl(songId, 'thumbnail')}
              alt=""
              loading="lazy"
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </Box>
        ))}
      </Grid>
    );
  }

  return (
    <Center
      style={{ background: gradient }}
      aspectRatio="3/4"
      w="full"
      color="white"
      fontSize="5xl"
      opacity={0.9}
    >
      <FaTicket />
    </Center>
  );
}
