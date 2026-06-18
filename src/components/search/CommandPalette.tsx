import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCalendarDays,
  FaLocationDot,
  FaMagnifyingGlass,
  FaMusic,
  FaShirt
} from 'react-icons/fa6';
import type { ReactNode } from 'react';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Kbd } from '~/components/ui/kbd';
import { useDetail } from '~/components/detail/DetailStack';
import { usePerformanceById, usePerformances, useVenues } from '~/hooks/useData';
import { useSongs } from '~/hooks/useSongData';
import { getCostumeSummaries } from '~/utils/costumes';
import { fuzzySearch, getSearchScore, type SearchableItem } from '~/utils/search';
import { displayVenueLocation } from '~/utils/venues';
import { localizedName } from '~/utils/names';

type Kind = 'event' | 'song' | 'venue' | 'costume';
type Result = { key: string; kind: Kind; title: string; subtitle: string; open: () => void };

const PER_GROUP = 6;
const ICON: Record<Kind, ReactNode> = {
  event: <FaCalendarDays />,
  song: <FaMusic />,
  venue: <FaLocationDot />,
  costume: <FaShirt />
};

const rank = <T,>(items: (SearchableItem & T)[], query: string, limit: number) =>
  items
    .filter((item) => fuzzySearch(item, query))
    .sort((a, b) => getSearchScore(b, query) - getSearchScore(a, query))
    .slice(0, limit);

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const performances = usePerformances();
  const performanceById = usePerformanceById();
  const venues = useVenues();
  const songs = useSongs();
  const { openEvent, openSong, openVenue, openCostume } = useDetail();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const costumes = useMemo(
    () => getCostumeSummaries(performanceById, new Set<string>()),
    [performanceById]
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const out: Result[] = [];

    const eventItems = performances.map((p) => ({
      id: p.id,
      name: p.performanceName ? `${p.tourName} ${p.performanceName}` : p.tourName
    }));
    for (const e of rank(eventItems, q, PER_GROUP)) {
      const p = performanceById.get(e.id)!;
      out.push({
        key: `event-${e.id}`,
        kind: 'event',
        title: p.performanceName ?? p.tourName,
        subtitle: [p.date, p.venue].filter(Boolean).join(' · '),
        open: () => openEvent(e.id)
      });
    }

    const songItems = songs.map((s) => ({ id: s.id, name: s.name, englishName: s.englishName }));
    for (const s of rank(songItems, q, PER_GROUP)) {
      out.push({
        key: `song-${s.id}`,
        kind: 'song',
        title: localizedName(lang, s.name, s.englishName),
        subtitle: t('navigation.songs'),
        open: () => openSong(s.id)
      });
    }

    const venueItems = venues.map((v) => ({ id: v.id, name: v.name }));
    for (const v of rank(venueItems, q, PER_GROUP)) {
      const v0 = venues.find((x) => x.id === v.id)!;
      out.push({
        key: `venue-${v.id}`,
        kind: 'venue',
        title: v0.name,
        subtitle: displayVenueLocation(v0) ?? t('navigation.venues'),
        open: () => openVenue(v.id)
      });
    }

    const costumeItems = costumes.map((c) => ({ id: c.id, name: c.name }));
    for (const c of rank(costumeItems, q, PER_GROUP)) {
      const c0 = costumes.find((x) => x.id === c.id)!;
      out.push({
        key: `costume-${c.id}`,
        kind: 'costume',
        title: c0.name,
        subtitle: t('costumes.worn_count', {
          count: c0.liveCount,
          defaultValue: '{{count}} lives'
        }),
        open: () => openCostume(c.id)
      });
    }

    return out;
  }, [
    query,
    performances,
    performanceById,
    songs,
    venues,
    costumes,
    lang,
    t,
    openEvent,
    openSong,
    openVenue,
    openCostume
  ]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
  }, [results.length]);

  const choose = (r: Result | undefined) => {
    if (!r) return;
    r.open();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Dialog.Backdrop zIndex="70" />
      <Dialog.Positioner zIndex="71" alignItems="flex-start">
        <Dialog.Content w="full" maxW="2xl" mx="4" mt={{ base: '12', md: '20' }} overflow="hidden">
          <HStack gap="2" borderColor="border.subtle" borderBottomWidth="1px" py="3" px="4">
            <Box color="fg.muted">
              <FaMagnifyingGlass />
            </Box>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('search.placeholder', {
                defaultValue: 'Search lives, songs, venues, costumes…'
              })}
              border="none"
              outline="none"
              px="0"
              _focus={{ boxShadow: 'none' }}
            />
            <Kbd>esc</Kbd>
          </HStack>
          <Box ref={listRef} maxH="60vh" p="2" overflowY="auto">
            {query.trim() && results.length === 0 ? (
              <Text py="6" color="fg.muted" fontSize="sm" textAlign="center">
                {t('search.no_results', { defaultValue: 'No results' })}
              </Text>
            ) : !query.trim() ? (
              <Text py="6" color="fg.muted" fontSize="sm" textAlign="center">
                {t('search.hint', {
                  defaultValue: 'Type to search lives, songs, venues, and costumes'
                })}
              </Text>
            ) : (
              <Stack gap="0.5">
                {results.map((r, idx) => (
                  <HStack
                    key={r.key}
                    data-idx={idx}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => choose(r)}
                    cursor="pointer"
                    gap="3"
                    borderRadius="l2"
                    py="2"
                    px="3"
                    bgColor={idx === active ? 'accent.a3' : undefined}
                    _hover={{ bgColor: 'accent.a2' }}
                  >
                    <Box flexShrink="0" color="accent.default">
                      {ICON[r.kind]}
                    </Box>
                    <Stack flex="1" gap="0" minW="0">
                      <Text fontWeight="medium" lineClamp={1}>
                        {r.title}
                      </Text>
                      <Text color="fg.muted" fontSize="xs" lineClamp={1}>
                        {r.subtitle}
                      </Text>
                    </Stack>
                    <Text flexShrink="0" color="fg.subtle" fontSize="2xs" textTransform="uppercase">
                      {t(`search.kind.${r.kind}`, { defaultValue: r.kind })}
                    </Text>
                  </HStack>
                ))}
              </Stack>
            )}
          </Box>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
