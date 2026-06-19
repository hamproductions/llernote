import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowDown, FaArrowUp, FaLightbulb, FaShareNodes, FaShuffle } from 'react-icons/fa6';
import { Box, Center, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { SetlistBar } from '~/components/setlist/SetlistBar';
import { sectionsOf } from '~/utils/setlist-flow';
import { LIVE_CATS } from '~/utils/live-cat';
import { sortedPerformances } from '~/data/core';
import { useVenueById } from '~/hooks/useData';
import { useAllSetlists } from '~/hooks/useSetlists';
import { useSongById } from '~/hooks/useSongData';
import { useDetail } from '~/components/detail/DetailStack';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { fuzzySearch, getSearchScore } from '~/utils/search';
import { localizedName } from '~/utils/names';
import { todayString } from '~/utils/event-filter';
import {
  answerPool,
  ATTR_ORDER,
  buildPool,
  buildShareText,
  compareFacts,
  dailyIndex,
  dayNumber,
  factsOf,
  HINT_TIERS,
  MAX_GUESSES,
  type AttrResult,
  type Cmp,
  type GuessResult,
  type PoolEntry
} from '~/game/setlistdle';
import type { Performance, Setlist, SetlistItem } from '~/types';

const SERIES_ALIAS: Record<string, string> = {
  '1': "μ's",
  '2': 'Aqours',
  '3': 'Nijigasaki',
  '4': 'Liella!',
  '5': 'Musical',
  '6': 'Hasunosora',
  '7': 'Yohane',
  '8': 'BLUEBIRD'
};

const TILE: Record<Cmp, { bg: string; fg: string }> = {
  hit: { bg: '#16a34a', fg: '#ffffff' },
  partial: { bg: '#d4870b', fg: '#ffffff' },
  miss: { bg: '#3f3f46', fg: '#d4d4d8' }
};
const GLYPH: Record<Cmp, string> = { hit: '✓', partial: '~', miss: '✕' };

const LEGEND = [
  { key: 'main', color: 'var(--colors-accent-default)' },
  { key: 'encore', color: 'var(--colors-accent-7)' },
  { key: 'mc', color: '#f59e0b' },
  { key: 'vtr', color: '#a855f7' }
] as const;

const KEYFRAMES = `
@keyframes sdlePop{0%{transform:scale(.6);opacity:0}55%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
@keyframes sdleRise{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes sdleGlow{0%,100%{box-shadow:0 0 26px rgba(228,0,127,.18)}50%{box-shadow:0 0 48px rgba(228,0,127,.34)}}
@keyframes sdleWin{0%{box-shadow:0 0 0 rgba(22,163,74,0)}40%{box-shadow:0 0 60px rgba(22,163,74,.55)}100%{box-shadow:0 0 30px rgba(22,163,74,.28)}}`;

type Round = {
  mode: 'daily' | 'practice';
  targetId: string;
  guesses: string[];
  tier: number;
  status: 'playing' | 'won' | 'lost';
};
type Stats = { streak: number; max: number; played: number; wins: number };

const seriesAlias = (p: Performance) =>
  p.seriesIds.map((id) => SERIES_ALIAS[id] ?? id).join(' · ') || '—';
const monthLabel = (lang: string, m: number) =>
  lang.startsWith('ja')
    ? `${m}月`
    : ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];

function Tile({
  label,
  result,
  value,
  col
}: {
  label: string;
  result: AttrResult;
  value: ReactNode;
  col: number;
}) {
  const c = TILE[result.status];
  return (
    <Stack
      style={{
        background: c.bg,
        color: c.fg,
        animation: 'sdlePop .4s ease both',
        animationDelay: `${col * 0.06}s`
      }}
      position="relative"
      gap="0.5"
      justifyContent="center"
      alignItems="center"
      borderRadius="l2"
      minH={{ base: '16', md: '20' }}
      py="1.5"
      px="1"
      textAlign="center"
    >
      <Box position="absolute" top="1" right="1.5" fontSize="2xs" fontWeight="bold" opacity={0.85}>
        {GLYPH[result.status]}
      </Box>
      <Text
        fontSize="2xs"
        fontWeight="bold"
        letterSpacing="wide"
        textTransform="uppercase"
        opacity={0.8}
      >
        {label}
      </Text>
      <HStack gap="1" justifyContent="center" alignItems="center" maxW="full">
        <Box minW="0" fontSize={{ base: 'sm', md: 'md' }} fontWeight="bold" lineHeight="1.1">
          {value}
        </Box>
        {result.dir && (
          <Box flexShrink={0} fontSize={{ base: 'sm', md: 'md' }}>
            {result.dir === 'up' ? <FaArrowUp /> : <FaArrowDown />}
          </Box>
        )}
      </HStack>
    </Stack>
  );
}

export function SetlistdleGame() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const setlists = useAllSetlists();
  const songById = useSongById();
  const venueById = useVenueById();
  const { openEvent } = useDetail();

  const [today, setToday] = useState<string>();
  useEffect(() => setToday(todayString()), []);

  const [storedCats, setStoredCats] = useLocalStorage<string[]>('llernote-setlistdle-cats-v1', [
    'numbered'
  ]);
  const cats = storedCats && storedCats.length ? storedCats : ['numbered'];
  const catsKey = [...cats].sort().join(',');
  const catsSet = useMemo(() => new Set(catsKey.split(',')), [catsKey]);
  const toggleCat = (c: string) => {
    const next = new Set(cats);
    if (next.has(c)) {
      if (next.size > 1) next.delete(c);
    } else next.add(c);
    setStoredCats([...next]);
  };

  const pool = useMemo<PoolEntry[]>(
    () => buildPool(sortedPerformances, setlists, catsSet),
    [setlists, catsSet]
  );
  const answers = useMemo(() => answerPool(pool), [pool]);
  const byId = useMemo(() => new Map(pool.map((e) => [e.performance.id, e])), [pool]);
  const regionOf = useMemo(
    () => (p: Performance) => (p.venueId ? venueById.get(p.venueId)?.region : undefined),
    [venueById]
  );

  const dailyTargetId = useMemo(
    () =>
      today && answers.length
        ? answers[dailyIndex(today, answers.length, catsKey)].performance.id
        : '',
    [today, answers, catsKey]
  );

  const [stored, setStored] = useLocalStorage<Round>('llernote-setlistdle-v2');
  const [storedDate, setStoredDate] = useLocalStorage<string>('llernote-setlistdle-date-v2');
  const [stats, setStats] = useLocalStorage<Stats>('llernote-setlistdle-stats-v1', {
    streak: 0,
    max: 0,
    played: 0,
    wins: 0
  });
  const [practice, setPractice] = useState<Round>();

  useEffect(() => {
    if (!today || !dailyTargetId) return;
    if (storedDate !== today || !stored || stored.targetId !== dailyTargetId) {
      setStoredDate(today);
      setStored({
        mode: 'daily',
        targetId: dailyTargetId,
        guesses: [],
        tier: 0,
        status: 'playing'
      });
    }
    // oxlint-disable-next-line exhaustive-deps
  }, [today, dailyTargetId]);

  const round: Round | undefined =
    practice ?? (stored && stored.targetId === dailyTargetId ? stored : undefined);
  const setRound = (next: Round) => (practice ? setPractice(next) : setStored(next));

  const targetEntry = round ? byId.get(round.targetId) : undefined;
  const ready = Boolean(today && pool.length && round && targetEntry);

  const targetFacts = useMemo(
    () =>
      targetEntry ? factsOf(targetEntry.performance, targetEntry.setlist, regionOf) : undefined,
    [targetEntry, regionOf]
  );

  const songName = useMemo(
    () => (it: SetlistItem) => {
      if (it.songId) {
        const s = songById.get(it.songId);
        if (s) return localizedName(lang, s.name, s.englishName);
      }
      return it.customSongName ?? it.title ?? '?';
    },
    [songById, lang]
  );
  const results: GuessResult[] = useMemo(() => {
    if (!round || !targetFacts) return [];
    return round.guesses
      .map((id) => {
        const e = byId.get(id);
        return e ? compareFacts(factsOf(e.performance, e.setlist, regionOf), targetFacts) : null;
      })
      .filter((r): r is GuessResult => r !== null);
  }, [round, targetFacts, byId, regionOf]);

  const submitGuess = (id: string) => {
    if (!round || !targetEntry || round.status !== 'playing' || round.guesses.includes(id)) return;
    const guesses = [...round.guesses, id];
    const correct = id === round.targetId;
    const wrong = guesses.length - (correct ? 1 : 0);
    const status: Round['status'] = correct
      ? 'won'
      : guesses.length >= MAX_GUESSES
        ? 'lost'
        : 'playing';
    const tier = correct ? round.tier : Math.min(HINT_TIERS.length, Math.max(round.tier, wrong));
    setRound({ ...round, guesses, tier, status });
    if (status !== 'playing' && round.mode === 'daily') {
      const s = stats ?? { streak: 0, max: 0, played: 0, wins: 0 };
      const streak = status === 'won' ? s.streak + 1 : 0;
      setStats({
        streak,
        max: Math.max(s.max, streak),
        played: s.played + 1,
        wins: s.wins + (status === 'won' ? 1 : 0)
      });
    }
  };

  const revealHint = () => {
    if (!round || round.status !== 'playing') return;
    setRound({ ...round, tier: Math.min(HINT_TIERS.length, round.tier + 1) });
  };

  const startPractice = () => {
    if (!today || !answers.length) return;
    const salt = `#p${(practice?.guesses.length ?? 0) + Math.floor(Date.now() % 9973)}`;
    const idx = dailyIndex(today, answers.length, salt);
    setPractice({
      mode: 'practice',
      targetId: answers[idx].performance.id,
      guesses: [],
      tier: 0,
      status: 'playing'
    });
  };

  if (!ready || !round || !targetEntry || !targetFacts) {
    const empty = Boolean(today && Object.keys(setlists).length > 0 && pool.length === 0);
    return (
      <Stack gap="4" maxW="4xl" mx="auto">
        <CatChips cats={catsSet} onToggle={toggleCat} />
        <Center py="20">
          <Text color="fg.muted">
            {empty ? t('setlistdle.empty_pool') : t('setlistdle.loading')}
          </Text>
        </Center>
      </Stack>
    );
  }

  const finished = round.status !== 'playing';
  const won = round.status === 'won';
  const day = today ? dayNumber(today) : 0;
  const tier = finished ? HINT_TIERS.length : round.tier;

  const valueFor = (p: Performance, e: PoolEntry, key: (typeof ATTR_ORDER)[number]): ReactNode => {
    if (key === 'series') return <Text lineClamp={2}>{seriesAlias(p)}</Text>;
    if (key === 'year') return p.date.slice(0, 4);
    if (key === 'songs') return factsOf(e.performance, e.setlist, regionOf).songCount;
    if (key === 'region') return <Text lineClamp={1}>{regionOf(p) ?? '—'}</Text>;
    return monthLabel(lang, Number(p.date.slice(5, 7)));
  };

  return (
    <Stack gap="4" maxW="4xl" mx="auto">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <HStack gap="2" justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <HStack gap="2" alignItems="baseline">
          <Heading
            as="h1"
            textStyle="display"
            style={{
              background: 'linear-gradient(92deg, #e4007f 10%, #ff7a00 45%, #00a0e0 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
            fontSize={{ base: '2xl', md: '3xl' }}
            lineHeight="1"
          >
            SetlistDle
          </Heading>
          <Badge
            size="sm"
            variant="solid"
            colorPalette={round.mode === 'practice' ? 'amber' : 'pink'}
          >
            {round.mode === 'practice' ? t('setlistdle.practice') : `#${day}`}
          </Badge>
        </HStack>
        <HStack gap="1.5">
          {Array.from({ length: MAX_GUESSES }, (_, i) => (
            <Box
              key={i}
              borderRadius="full"
              w="3"
              h="3"
              bgColor={
                i < round.guesses.length
                  ? won && i === round.guesses.length - 1
                    ? '#16a34a'
                    : 'accent.default'
                  : 'accent.a4'
              }
            />
          ))}
        </HStack>
      </HStack>

      <CatChips cats={catsSet} onToggle={toggleCat} />

      <Stack
        gap="2.5"
        borderColor="accent.a5"
        borderRadius="l3"
        borderWidth="1px"
        p={{ base: '3', md: '4' }}
        bgGradient="to-b"
        gradientFrom="accent.a2"
        gradientTo="transparent"
      >
        <HStack justifyContent="space-between" alignItems="center">
          <Text color="fg.subtle" fontSize="xs" fontWeight="bold" letterSpacing="wide">
            {finished ? `#${targetEntry.number}` : '#??'} ·{' '}
            {t('setlistdle.pool_size', { count: pool.length })}
          </Text>
          {finished ? (
            <Text color="accent.default" fontSize="xs" fontWeight="bold">
              {targetFacts.year}
            </Text>
          ) : (
            <Button
              size="xs"
              variant="subtle"
              onClick={revealHint}
              disabled={round.tier >= HINT_TIERS.length}
            >
              <FaLightbulb />
              {round.tier >= HINT_TIERS.length
                ? t('setlistdle.hints_done')
                : t('setlistdle.reveal_hint_n', { n: round.tier, total: HINT_TIERS.length })}
            </Button>
          )}
        </HStack>
        <Box
          style={{
            animation: won
              ? 'sdleWin 1.2s ease both'
              : finished
                ? undefined
                : 'sdleGlow 3s ease-in-out infinite'
          }}
          borderRadius="l2"
        >
          <SetlistBar setlist={targetEntry.setlist} gap="2px" h={{ base: '10', md: '12' }} />
        </Box>
        <Wrap gap="2.5" justify="center">
          {LEGEND.map((l) => (
            <HStack key={l.key} gap="1">
              <Box style={{ background: l.color }} borderRadius="full" w="2.5" h="2.5" />
              <Text color="fg.muted" fontSize="2xs">
                {t(`setlistdle.legend_${l.key}`)}
              </Text>
            </HStack>
          ))}
        </Wrap>
        <SetlistReveal
          setlist={targetEntry.setlist}
          songName={songName}
          tier={tier}
          finished={finished}
        />
      </Stack>

      {!finished && (
        <Stack gap="2">
          <GuessInput pool={pool} guessed={round.guesses} lang={lang} onGuess={submitGuess} />
          <Text color="fg.muted" fontSize="xs" textAlign="center">
            {t('setlistdle.how_to_play', { count: MAX_GUESSES })} · {t('setlistdle.key_line')}
          </Text>
        </Stack>
      )}

      {finished && (
        <ResultBanner
          won={won}
          entry={targetEntry}
          guessCount={round.guesses.length}
          stats={round.mode === 'daily' ? stats : undefined}
          share={() => buildShareText(day, results, won)}
          onView={() => openEvent(targetEntry.performance.id)}
          onPractice={startPractice}
          onBackToDaily={practice ? () => setPractice(undefined) : undefined}
        />
      )}

      {results.length > 0 && (
        <Stack gap="2">
          {results
            .map((r) => ({ r, e: byId.get(r.id)! }))
            .reverse()
            .map(({ r, e }) => (
              <Stack
                key={r.id}
                style={{ animation: 'sdleRise .25s ease both' }}
                gap="1.5"
                borderColor={r.correct ? '#16a34a' : 'border.subtle'}
                borderRadius="l2"
                borderWidth="1px"
                p="2"
                bgColor="bg.subtle"
              >
                <HStack gap="2">
                  <Text fontSize="sm" fontWeight="bold" lineClamp={1}>
                    {e.performance.performanceName
                      ? `${e.performance.tourName} ${e.performance.performanceName}`
                      : e.performance.tourName}
                  </Text>
                  <Text flexShrink={0} ml="auto" color="fg.subtle" fontSize="xs">
                    #{e.number}
                  </Text>
                </HStack>
                <Grid gap="1.5" gridTemplateColumns="repeat(5, 1fr)">
                  {ATTR_ORDER.map((key, col) => (
                    <Tile
                      key={key}
                      col={col}
                      label={t(`setlistdle.cap_${key}`)}
                      result={r[key]}
                      value={valueFor(e.performance, e, key)}
                    />
                  ))}
                </Grid>
              </Stack>
            ))}
        </Stack>
      )}
    </Stack>
  );
}

function CatChips({ cats, onToggle }: { cats: Set<string>; onToggle: (c: string) => void }) {
  const { t } = useTranslation();
  return (
    <Wrap gap="1.5" alignItems="center">
      <Text color="fg.subtle" fontSize="xs" fontWeight="bold">
        {t('setlistdle.pool_label')}
      </Text>
      {LIVE_CATS.map((c) => {
        const on = cats.has(c);
        return (
          <Box
            as="button"
            key={c}
            onClick={() => onToggle(c)}
            cursor="pointer"
            borderColor={on ? 'accent.default' : 'border.subtle'}
            borderRadius="l2"
            borderWidth="1px"
            py="1"
            px="2.5"
            color={on ? 'accent.fg' : 'fg.muted'}
            fontSize="xs"
            fontWeight="medium"
            bg={on ? 'accent.default' : 'bg.default'}
            _hover={on ? undefined : { borderColor: 'accent.8' }}
          >
            {t(`infographic.cat_live_${c}` as 'infographic.cat_live_numbered')}
          </Box>
        );
      })}
    </Wrap>
  );
}

function GuessInput({
  pool,
  guessed,
  lang,
  onGuess
}: {
  pool: PoolEntry[];
  guessed: string[];
  lang: string;
  onGuess: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      pool.map((e) => ({
        id: e.performance.id,
        number: e.number,
        name: e.performance.performanceName
          ? `${e.performance.tourName} ${e.performance.performanceName}`
          : e.performance.tourName,
        sub: [e.performance.date, e.performance.venue].filter(Boolean).join(' · ')
      })),
    [pool]
  );

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const guessedSet = new Set(guessed);
    return items
      .filter((it) => !guessedSet.has(it.id) && fuzzySearch({ id: it.id, name: it.name }, q))
      .sort(
        (a, b) =>
          getSearchScore({ id: b.id, name: b.name }, q) -
          getSearchScore({ id: a.id, name: a.name }, q)
      )
      .slice(0, 30);
  }, [items, query, guessed]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (id: string | undefined) => {
    if (!id) return;
    onGuess(id);
    setQuery('');
    setOpen(false);
  };

  return (
    <Box ref={boxRef} position="relative" w="full">
      <Input
        size="lg"
        value={query}
        placeholder={t('setlistdle.placeholder')}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(matches[active]?.id);
          }
        }}
        lang={lang}
        borderRadius="l3"
        h="12"
        fontSize="md"
        boxShadow="0 0 22px rgba(228,0,127,0.16)"
      />
      {open && query.trim() && (
        <Stack
          zIndex="20"
          position="absolute"
          gap="0"
          borderColor="border.default"
          borderRadius="l3"
          borderWidth="1px"
          w="full"
          maxH="80"
          mt="1"
          bgColor="bg.default"
          boxShadow="xl"
          overflowY="auto"
        >
          {matches.length === 0 ? (
            <Text p="3" color="fg.muted" fontSize="sm">
              {t('setlistdle.no_match')}
            </Text>
          ) : (
            matches.map((m, i) => (
              <HStack
                key={m.id}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(m.id)}
                cursor="pointer"
                gap="2"
                py="2"
                px="3"
                bgColor={i === active ? 'accent.a3' : undefined}
              >
                <Stack flex="1" gap="0" minW="0">
                  <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                    {m.name}
                  </Text>
                  <Text color="fg.muted" fontSize="2xs" lineClamp={1}>
                    {m.sub}
                  </Text>
                </Stack>
                <Text flexShrink={0} color="fg.subtle" fontSize="2xs">
                  #{m.number}
                </Text>
              </HStack>
            ))
          )}
        </Stack>
      )}
    </Box>
  );
}

const SKEL = ['58%', '74%', '46%', '66%', '80%', '52%'];

type RevealRow = {
  id: string;
  isSong: boolean;
  color: string;
  ordinal: number;
  revealed: boolean;
  label: string;
  tag: string;
  header: string;
  skel: string;
};

const revealRows = (
  setlist: Setlist,
  songName: (it: SetlistItem) => string,
  tier: number,
  finished: boolean,
  mainLabel: string,
  encoreLabel: string
): RevealRow[] => {
  const items = setlist.items;
  const secType = Array.from({ length: items.length }, () => 'main');
  for (const s of sectionsOf(setlist))
    for (let i = s.startIndex; i <= s.endIndex && i < secType.length; i++) secType[i] = s.type;
  const rows: RevealRow[] = [];
  let song = -1;
  let lastSec = '';
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const isSong = it.type === 'song' && !!it.songId;
    const isEnc = secType[i] === 'encore';
    if (isSong) song += 1;
    const secName = isEnc ? encoreLabel : mainLabel;
    const header = isSong && secName !== lastSec ? secName : '';
    if (isSong) lastSec = secName;
    rows.push({
      id: it.id,
      isSong,
      color:
        it.type === 'mc'
          ? '#f59e0b'
          : it.type === 'vtr'
            ? '#a855f7'
            : isEnc
              ? 'var(--colors-accent-7)'
              : 'var(--colors-accent-default)',
      ordinal: song,
      revealed: finished || (isSong ? tier >= 3 || (tier >= 2 && song === 0) : tier >= 1),
      label: isSong
        ? songName(it)
        : [it.title, it.remarks].filter(Boolean).join(' — ') || it.type.toUpperCase(),
      tag: it.type === 'vtr' ? 'VTR' : it.type === 'mc' ? 'MC' : 'TALK',
      header,
      skel: SKEL[i % SKEL.length]
    });
  }
  return rows;
};

function SetlistReveal({
  setlist,
  songName,
  tier,
  finished
}: {
  setlist: Setlist;
  songName: (it: SetlistItem) => string;
  tier: number;
  finished: boolean;
}) {
  const { t } = useTranslation();
  const rows = revealRows(
    setlist,
    songName,
    tier,
    finished,
    t('setlistdle.legend_main'),
    t('setlistdle.legend_encore')
  );
  return (
    <Stack
      gap="0"
      borderColor="border.subtle"
      borderRadius="l2"
      borderWidth="1px"
      overflow="hidden"
    >
      {rows.map(({ id, isSong, color, ordinal, revealed, label, tag, header, skel }) => (
        <Box key={id}>
          {header && (
            <Text
              px="3"
              pt="2.5"
              pb="0.5"
              color="fg.subtle"
              fontSize="2xs"
              fontWeight="bold"
              letterSpacing="wider"
              textTransform="uppercase"
              bgColor="bg.subtle"
            >
              {header}
            </Text>
          )}
          <HStack
            gap="2.5"
            borderColor="border.subtle"
            borderBottomWidth="1px"
            py="2"
            px="3"
            bgColor={isSong ? undefined : 'bg.subtle'}
          >
            <Box
              style={{ background: color }}
              flexShrink={0}
              alignSelf="stretch"
              borderRadius="full"
              w="1"
            />
            <Text
              flexShrink={0}
              w="6"
              color="fg.subtle"
              fontSize="sm"
              fontVariantNumeric="tabular-nums"
              textAlign="right"
            >
              {isSong ? String(ordinal + 1).padStart(2, '0') : ''}
            </Text>
            {!isSong && (
              <Badge size="sm" variant="subtle" flexShrink={0}>
                {tag}
              </Badge>
            )}
            {revealed ? (
              <Text
                color={isSong ? 'fg.default' : 'fg.muted'}
                fontSize={{ base: 'sm', md: 'md' }}
                fontWeight={isSong ? 'semibold' : 'normal'}
                lineClamp={2}
              >
                {label}
              </Text>
            ) : (
              <Box
                style={{ width: skel }}
                borderRadius="full"
                h="3.5"
                bgColor="border.emphasized"
              />
            )}
          </HStack>
        </Box>
      ))}
    </Stack>
  );
}

function ResultBanner({
  won,
  entry,
  guessCount,
  stats,
  share,
  onView,
  onPractice,
  onBackToDaily
}: {
  won: boolean;
  entry: PoolEntry;
  guessCount: number;
  stats?: Stats | null;
  share: () => string;
  onView: () => void;
  onPractice: () => void;
  onBackToDaily?: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const p = entry.performance;
  const doShare = () => {
    void navigator.clipboard?.writeText(share()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <Stack
      gap="3"
      alignItems="center"
      borderColor={won ? '#16a34a' : 'accent.a6'}
      borderRadius="l3"
      borderWidth="1px"
      p="5"
      textAlign="center"
      bgGradient="to-b"
      gradientFrom={won ? 'rgba(22,163,74,0.16)' : 'accent.a3'}
      gradientTo="transparent"
    >
      <Text fontSize="3xl">{won ? '🎉' : '🫥'}</Text>
      <Heading fontSize="xl">
        {won ? t('setlistdle.won_title', { count: guessCount }) : t('setlistdle.lost_title')}
      </Heading>
      <Stack gap="0.5">
        <Text color="fg.subtle" fontSize="xs">
          {t('setlistdle.answer_was')}
        </Text>
        <Text fontWeight="bold">
          {p.performanceName ? `${p.tourName} ${p.performanceName}` : p.tourName}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {[p.date, p.venue].filter(Boolean).join(' · ')}
        </Text>
      </Stack>
      {stats && (stats.played > 0 || won) && (
        <Wrap gap="4" justify="center">
          <StatPill
            label={t('setlistdle.stat_streak')}
            value={stats.streak >= 3 ? `🔥${stats.streak}` : stats.streak}
          />
          <StatPill label={t('setlistdle.stat_max')} value={stats.max} />
          <StatPill
            label={t('setlistdle.stat_winrate')}
            value={stats.played ? `${Math.round((stats.wins / stats.played) * 100)}%` : '—'}
          />
        </Wrap>
      )}
      <Wrap gap="2" justify="center">
        <Button size="sm" onClick={doShare}>
          <FaShareNodes />
          {copied ? t('setlistdle.copied') : t('setlistdle.share')}
        </Button>
        <Button size="sm" variant="outline" onClick={onView}>
          {t('setlistdle.view_event')}
        </Button>
        <Button size="sm" variant="subtle" onClick={onPractice}>
          <FaShuffle />
          {t('setlistdle.play_random')}
        </Button>
        {onBackToDaily && (
          <Button size="sm" variant="ghost" onClick={onBackToDaily}>
            {t('setlistdle.back_to_daily')}
          </Button>
        )}
      </Wrap>
    </Stack>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack gap="0" alignItems="center">
      <Text textStyle="display" fontSize="2xl" fontWeight="bold" lineHeight="1">
        {value}
      </Text>
      <Text color="fg.muted" fontSize="2xs">
        {label}
      </Text>
    </Stack>
  );
}
