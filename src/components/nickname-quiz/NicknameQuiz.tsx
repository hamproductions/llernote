import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowRight, FaForward, FaLightbulb, FaRotateRight } from 'react-icons/fa6';
import { Center, HStack, Stack, Wrap } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { GuessInput, type GuessItem } from '~/components/game/GuessInput';
import { useDetail } from '~/components/detail/DetailStack';
import { useArtistById } from '~/hooks/useData';
import { useSongById, useSongs } from '~/hooks/useSongData';
import { useAbbreviations } from '~/hooks/useAbbreviations';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import { localizedName } from '~/utils/names';
import { SERIES_ALIAS } from '~/utils/series-alias';
import { buildQuizPool, drawQuestion, type QuizQuestion } from '~/game/nickname-quiz';
import type { Song } from '~/types';

type Score = { streak: number; best: number };
type Round = {
  question: QuizQuestion;
  wrong: string[];
  hints: number;
  solvedId?: string;
  skipped?: boolean;
};

const HINTS = ['series', 'artist'] as const;

export function NicknameQuiz() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const songs = useSongs();
  const songById = useSongById();
  const artistById = useArtistById();
  const { songNicknames, ready, failed, retry } = useAbbreviations();
  const nicknames = ready ? songNicknames : undefined;
  const { openSong } = useDetail();
  const [score, setScore] = useLocalStorage<Score>('llernote-nickname-quiz-v1', {
    streak: 0,
    best: 0
  });
  const [round, setRound] = useState<Round>();
  const seen = useRef(new Set<string>());

  const pool = useMemo(
    () => (nicknames ? buildQuizPool(songs, nicknames) : []),
    [songs, nicknames]
  );

  const nextRound = () => {
    if (!nicknames) return;
    const question = drawQuestion(pool, nicknames, seen.current);
    if (!question) return;
    seen.current.add(question.song.id);
    setRound({ question, wrong: [], hints: 0 });
  };

  useEffect(() => {
    if (!round && pool.length > 0) nextRound();
    // oxlint-disable-next-line exhaustive-deps
  }, [pool]);

  const title = (song: Song) => localizedName(lang, song.name, song.englishName);
  const seriesOf = (song: Song) =>
    song.seriesIds.map((id) => SERIES_ALIAS[String(id)] ?? id).join(' · ');
  const artistsOf = (song: Song) =>
    [
      ...new Set(
        (song.artists ?? []).map((a) => {
          const artist = artistById.get(a.id);
          return artist ? localizedName(lang, artist.name, artist.englishName) : undefined;
        })
      )
    ]
      .filter(Boolean)
      .join(', ') || '—';

  const items = useMemo<GuessItem[]>(
    () =>
      songs.map((song) => ({
        id: song.id,
        name: song.name,
        englishName: song.englishName,
        phoneticName: song.phoneticName,
        label: title(song),
        sub: [seriesOf(song), artistsOf(song)].join(' · ')
      })),
    // oxlint-disable-next-line exhaustive-deps
    [songs, lang]
  );

  if (!round) {
    return (
      <Stack gap="4" maxW="4xl" mx="auto">
        <Center gap="3" flexDirection="column" py="20">
          <Text role={failed ? 'alert' : undefined} color="fg.muted">
            {t(failed ? 'nicknameQuiz.load_error' : 'nicknameQuiz.loading')}
          </Text>
          {failed && (
            <Button size="sm" variant="outline" onClick={retry}>
              <FaRotateRight />
              {t('nicknameQuiz.retry')}
            </Button>
          )}
        </Center>
      </Stack>
    );
  }

  const { question, wrong, hints, solvedId, skipped } = round;
  const finished = !!solvedId || !!skipped;
  const answer = songById.get(solvedId ?? question.song.id) ?? question.song;
  const others = [...question.answers]
    .filter((id) => id !== answer.id)
    .map((id) => songById.get(id))
    .filter((song): song is Song => !!song);

  const saveStreak = (streak: number) =>
    setScore({ streak, best: Math.max(score?.best ?? 0, streak) });

  const guess = (id: string) => {
    if (question.answers.has(id)) {
      setRound({ ...round, solvedId: id });
      saveStreak((score?.streak ?? 0) + 1);
    } else {
      setRound({ ...round, wrong: [...wrong, id] });
      saveStreak(0);
    }
  };

  const skip = () => {
    setRound({ ...round, skipped: true });
    saveStreak(0);
  };

  return (
    <Stack gap="4" w="full" minW="0" maxW="2xl" mx="auto">
      <HStack gap="2" justifyContent="space-between" alignItems="center" flexWrap="wrap">
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
          lineHeight="1.2"
        >
          {t('nicknameQuiz.title')}
        </Heading>
        <HStack gap="1.5">
          <Badge size="sm" variant="solid">
            {t('nicknameQuiz.streak', { count: score?.streak ?? 0 })}
          </Badge>
          <Badge size="sm" variant="subtle">
            {t('nicknameQuiz.best', { count: score?.best ?? 0 })}
          </Badge>
        </HStack>
      </HStack>

      <Stack
        gap="3"
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
            {t('nicknameQuiz.pool_size', { count: pool.length })}
          </Text>
          {!finished && (
            <Button
              size="sm"
              variant="subtle"
              onClick={() => setRound({ ...round, hints: hints + 1 })}
              disabled={hints >= HINTS.length}
            >
              <FaLightbulb />
              {t('nicknameQuiz.hint', { n: hints, total: HINTS.length })}
            </Button>
          )}
        </HStack>
        <Text
          textStyle="display"
          lang="ja"
          py={{ base: '4', md: '6' }}
          fontSize={{ base: '4xl', md: '6xl' }}
          fontWeight="bold"
          lineHeight="1.2"
          textAlign="center"
          overflowWrap="anywhere"
        >
          {question.nickname}
        </Text>
        {HINTS.slice(0, hints).map((hint) => (
          <HStack key={hint} gap="2" borderRadius="l2" p="2" bgColor="bg.subtle">
            <Text flexShrink={0} color="fg.subtle" fontSize="2xs" fontWeight="bold">
              {t(`nicknameQuiz.hint_${hint}`)}
            </Text>
            <Text fontSize="sm">
              {hint === 'series' ? seriesOf(question.song) : artistsOf(question.song)}
            </Text>
          </HStack>
        ))}
      </Stack>

      {!finished && (
        <Stack gap="2">
          <GuessInput
            key={question.song.id}
            items={items}
            excluded={wrong}
            placeholder={t('nicknameQuiz.placeholder')}
            emptyLabel={t('nicknameQuiz.no_match')}
            lang={lang}
            autoFocus
            onGuess={guess}
          />
          <HStack gap="2" justifyContent="space-between" alignItems="center">
            <Text color="fg.muted" fontSize="xs">
              {t('nicknameQuiz.how_to_play')}
            </Text>
            <Button size="sm" variant="outline" onClick={skip} flexShrink={0}>
              <FaForward />
              {t('nicknameQuiz.skip')}
            </Button>
          </HStack>
        </Stack>
      )}

      {finished && (
        <Stack
          aria-live="polite"
          gap="3"
          alignItems="center"
          borderColor={solvedId ? '#16a34a' : 'accent.a6'}
          borderRadius="l3"
          borderWidth="1px"
          p="5"
          textAlign="center"
        >
          <Text color="fg.subtle" fontSize="xs" fontWeight="bold">
            {t(solvedId ? 'nicknameQuiz.correct' : 'nicknameQuiz.answer_was')}
          </Text>
          <Stack gap="0.5">
            <Heading fontSize="xl">{title(answer)}</Heading>
            <Text color="fg.muted" fontSize="sm">
              {[seriesOf(answer), artistsOf(answer)].join(' · ')}
            </Text>
          </Stack>
          {others.length > 0 && (
            <Text color="fg.muted" fontSize="xs">
              {t('nicknameQuiz.also', { songs: others.map(title).join(' / ') })}
            </Text>
          )}
          <Wrap gap="2" justify="center">
            <Button size="sm" autoFocus onClick={nextRound}>
              <FaArrowRight />
              {t('nicknameQuiz.next')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => openSong(answer.id)}>
              {t('nicknameQuiz.view_song')}
            </Button>
          </Wrap>
        </Stack>
      )}

      {wrong.length > 0 && (
        <Stack gap="1.5">
          {wrong.toReversed().map((id) => {
            const song = songById.get(id);
            return (
              song && (
                <HStack
                  key={id}
                  gap="2"
                  borderColor="border.subtle"
                  borderRadius="l2"
                  borderWidth="1px"
                  p="2"
                  bgColor="bg.subtle"
                >
                  <Text aria-label={t('nicknameQuiz.wrong')} color="fg.subtle" fontSize="sm">
                    ✕
                  </Text>
                  <Text fontSize="sm" lineClamp={1}>
                    {title(song)}
                  </Text>
                </HStack>
              )
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
