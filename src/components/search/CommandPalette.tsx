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
import { Box, Center, HStack, Stack } from 'styled-system/jsx';
import { Dialog } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { Kbd } from '~/components/ui/kbd';
import { useDetail } from '~/components/detail/DetailStack';
import { getLiveThumb, usePerformanceById, usePerformances, useVenues } from '~/hooks/useData';
import { useSongs } from '~/hooks/useSongData';
import { getCostumeSummaries } from '~/utils/costumes';
import { fuzzySearch, getSearchScore, type SearchableItem } from '~/utils/search';
import { displayVenueLocation } from '~/utils/venues';
import { getPicUrl } from '~/utils/assets';
import { localizedName } from '~/utils/names';

type Kind = 'event' | 'song' | 'venue' | 'costume';
type Result = {
  key: string;
  kind: Kind;
  title: string;
  subtitle: string;
  thumbSongId?: string;
  thumbUrl?: string;
  open: () => void;
};
type Group = { kind: Kind; label: string; items: Result[] };

const PER_GROUP = 6;
const GROUP_ORDER: Kind[] = ['event', 'song', 'venue', 'costume'];
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

function ResultThumb({
  kind,
  thumbSongId,
  thumbUrl
}: Pick<Result, 'kind' | 'thumbSongId' | 'thumbUrl'>) {
  const [failed, setFailed] = useState(false);
  const src = thumbSongId ? getPicUrl(thumbSongId, 'thumbnail') : thumbUrl;
  useEffect(() => setFailed(false), [src]);
  return (
    <Box flexShrink={0} borderRadius="l2" w="10" h="10" bgColor="accent.a3" overflow="hidden">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Center w="full" h="full" color="accent.default" fontSize="sm">
          {ICON[kind]}
        </Center>
      )}
    </Box>
  );
}

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

  const groups = useMemo<Group[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const bucket: Record<Kind, Result[]> = { event: [], song: [], venue: [], costume: [] };

    for (const e of rank(
      performances.map((p) => ({
        id: p.id,
        name: p.performanceName ? `${p.tourName} ${p.performanceName}` : p.tourName
      })),
      q,
      PER_GROUP
    )) {
      const p = performanceById.get(e.id)!;
      bucket.event.push({
        key: `event-${e.id}`,
        kind: 'event',
        title: p.performanceName ?? p.tourName,
        subtitle: [p.date, p.venue].filter(Boolean).join(' · '),
        thumbUrl: getLiveThumb(p)?.image,
        open: () => openEvent(e.id)
      });
    }

    for (const s of rank(
      songs.map((s) => ({ id: s.id, name: s.name, englishName: s.englishName })),
      q,
      PER_GROUP
    )) {
      const title = localizedName(lang, s.name, s.englishName);
      const alt = s.englishName && s.englishName !== title ? s.englishName : s.name;
      bucket.song.push({
        key: `song-${s.id}`,
        kind: 'song',
        title,
        subtitle: alt !== title ? alt : '',
        thumbSongId: s.id,
        open: () => openSong(s.id)
      });
    }

    for (const v of rank(
      venues.map((v) => ({ id: v.id, name: v.name })),
      q,
      PER_GROUP
    )) {
      const v0 = venues.find((x) => x.id === v.id)!;
      bucket.venue.push({
        key: `venue-${v.id}`,
        kind: 'venue',
        title: v0.name,
        subtitle: displayVenueLocation(v0) ?? t('navigation.venues'),
        open: () => openVenue(v.id)
      });
    }

    for (const c of rank(
      costumes.map((c) => ({ id: c.id, name: c.name })),
      q,
      PER_GROUP
    )) {
      const c0 = costumes.find((x) => x.id === c.id)!;
      bucket.costume.push({
        key: `costume-${c.id}`,
        kind: 'costume',
        title: c0.name,
        subtitle: t('costumes.worn_count', {
          count: c0.liveCount,
          defaultValue: '{{count}} lives'
        }),
        thumbSongId: c0.imageSongId,
        open: () => openCostume(c.id)
      });
    }

    return GROUP_ORDER.filter((k) => bucket[k].length).map((k) => ({
      kind: k,
      label: t(`search.group.${k}`, { defaultValue: k }),
      items: bucket[k]
    }));
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

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  const choose = (r: Result | undefined) => {
    if (!r) return;
    r.open();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(flat[active]);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let idx = -1;

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Dialog.Backdrop zIndex="70" bgColor="black.a7" backdropFilter="blur(4px)" />
      <Dialog.Positioner zIndex="71" alignItems="flex-start">
        <Dialog.Content
          borderColor="border.default"
          borderRadius="l3"
          borderWidth="1px"
          w="full"
          maxW="2xl"
          mx="4"
          mt={{ base: '10', md: '20' }}
          boxShadow="2xl"
          overflow="hidden"
        >
          <HStack
            gap="3"
            borderColor="border.subtle"
            borderBottomWidth="1px"
            py="3"
            px="4"
            bgColor="bg.subtle"
          >
            <Box color="accent.default" fontSize="md">
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
              h="auto"
              px="0"
              fontSize="md"
              bgColor="transparent"
              _focus={{ boxShadow: 'none' }}
            />
            <Kbd flexShrink={0}>esc</Kbd>
          </HStack>

          <Box ref={listRef} maxH={{ base: '60vh', md: '420px' }} py="2" overflowY="auto">
            {!query.trim() ? (
              <Center gap="2" flexDirection="column" py="10" px="4" color="fg.muted">
                <Box color="accent.a8" fontSize="2xl">
                  <FaMagnifyingGlass />
                </Box>
                <Text fontSize="sm" textAlign="center">
                  {t('search.hint', {
                    defaultValue: 'Search lives, songs, venues, and costumes'
                  })}
                </Text>
              </Center>
            ) : flat.length === 0 ? (
              <Center py="10" px="4">
                <Text color="fg.muted" fontSize="sm">
                  {t('search.no_results', { defaultValue: 'No results' })}
                </Text>
              </Center>
            ) : (
              groups.map((g) => (
                <Box key={g.kind}>
                  <HStack gap="1.5" px="4" pt="3" pb="1" color="fg.subtle">
                    <Box fontSize="2xs">{ICON[g.kind]}</Box>
                    <Text
                      fontSize="2xs"
                      fontWeight="bold"
                      letterSpacing="wide"
                      textTransform="uppercase"
                    >
                      {g.label}
                    </Text>
                  </HStack>
                  <Stack gap="0" px="2">
                    {g.items.map((r) => {
                      idx += 1;
                      const i = idx;
                      return (
                        <HStack
                          key={r.key}
                          data-idx={i}
                          onMouseMove={() => setActive(i)}
                          onClick={() => choose(r)}
                          cursor="pointer"
                          gap="3"
                          borderRadius="l2"
                          py="1.5"
                          px="2"
                          bgColor={i === active ? 'accent.a3' : undefined}
                          boxShadow={
                            i === active ? 'inset 2px 0 0 var(--colors-accent-default)' : undefined
                          }
                          transition="background 0.06s"
                        >
                          <ResultThumb
                            kind={r.kind}
                            thumbSongId={r.thumbSongId}
                            thumbUrl={r.thumbUrl}
                          />
                          <Stack flex="1" gap="0" minW="0">
                            <Text fontWeight="medium" lineClamp={1}>
                              {r.title}
                            </Text>
                            {r.subtitle && (
                              <Text color="fg.muted" fontSize="xs" lineClamp={1}>
                                {r.subtitle}
                              </Text>
                            )}
                          </Stack>
                          {i === active && (
                            <Kbd hideBelow="sm" flexShrink={0}>
                              ↵
                            </Kbd>
                          )}
                        </HStack>
                      );
                    })}
                  </Stack>
                </Box>
              ))
            )}
          </Box>

          <HStack
            gap="4"
            borderColor="border.subtle"
            borderTopWidth="1px"
            py="2"
            px="4"
            color="fg.subtle"
            fontSize="2xs"
            bgColor="bg.subtle"
          >
            <HStack gap="1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <Text>{t('search.nav_move', { defaultValue: 'navigate' })}</Text>
            </HStack>
            <HStack gap="1">
              <Kbd>↵</Kbd>
              <Text>{t('search.nav_open', { defaultValue: 'open' })}</Text>
            </HStack>
            {flat.length > 0 && (
              <Text ml="auto">
                {t('search.count', { count: flat.length, defaultValue: '{{count}} results' })}
              </Text>
            )}
          </HStack>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
