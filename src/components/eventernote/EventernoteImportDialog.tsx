import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaXmark } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { Alert } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import { Dialog } from '~/components/ui/dialog';
import { IconButton } from '~/components/ui/icon-button';
import { Input } from '~/components/ui/input';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { NativeSelect } from '~/components/events/NativeSelect';
import { VenueText } from '~/components/events/VenueText';
import { performanceById as allPerformanceById } from '~/data/core';
import { useToaster } from '~/context/ToasterContext';
import { useAttendance } from '~/hooks/useAttendance';
import {
  useEventernoteIdByPerformanceId,
  usePerformanceByEventernoteId,
  usePerformanceById,
  usePerformances
} from '~/hooks/useData';
import { useLocalStorage } from '~/hooks/useLocalStorage';
import {
  eventernoteEventUrl,
  fetchEventernoteUserEvents,
  matchEventernoteEvents,
  matchPerformanceToEvents,
  searchEventernoteEvents,
  type EventMatch,
  type PerformanceEventMatch
} from '~/utils/eventernote';
import { eventernoteSearchUrl } from '~/utils/share';
import type { Performance } from '~/types';

type MatchKind = 'matched' | 'ambiguous' | 'unmatched';
type KindFilter = '' | MatchKind;

const matchKind = (match: EventMatch): MatchKind =>
  match.best ? 'matched' : match.candidates.length > 0 ? 'ambiguous' : 'unmatched';

const performanceLabel = (performance: Performance) =>
  performance.performanceName
    ? `${performance.tourName} ${performance.performanceName}`
    : performance.tourName;

export function EventernoteImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToaster();
  const performances = usePerformances();
  const performanceById = usePerformanceById();
  const performanceByEventernoteId = usePerformanceByEventernoteId();
  const eventernoteIdByPerformanceId = useEventernoteIdByPerformanceId();
  const attendance = useAttendance();
  const [userId, setUserId] = useLocalStorage<string>('llernote-eventernote-user', '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [matches, setMatches] = useState<EventMatch[]>();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [kindFilter, setKindFilter] = useState<KindFilter>('');
  const [searches, setSearches] = useState<
    Record<string, PerformanceEventMatch[] | 'loading' | 'error'>
  >({});

  const load = async () => {
    const trimmed = userId?.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(undefined);
    setSearches({});
    try {
      const events = await fetchEventernoteUserEvents(trimmed);
      const result = matchEventernoteEvents(events, performances, performanceByEventernoteId);
      const defaults: Record<string, string> = {};
      for (const match of result) {
        if (match.best && attendance.get(match.best.id)?.status !== 'attended') {
          defaults[match.event.href] = match.best.id;
        }
      }
      setMatches(result);
      setSelected(defaults);
      setKindFilter('');
    } catch (e) {
      setMatches(undefined);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const setRowSelection = (key: string, performanceId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (performanceId) next[key] = performanceId;
      else delete next[key];
      return next;
    });
  };

  const counts = useMemo(() => {
    const result = { matched: 0, ambiguous: 0, unmatched: 0 };
    for (const match of matches ?? []) result[matchKind(match)]++;
    return result;
  }, [matches]);

  const visible = useMemo(
    () =>
      (matches ?? []).filter(
        (match) =>
          matchKind(match) !== 'unmatched' && (!kindFilter || matchKind(match) === kindFilter)
      ),
    [matches, kindFilter]
  );

  const selectedCount = Object.keys(selected).length;

  const mismatches = useMemo(() => {
    if (!matches) return [];
    const covered = new Set<string>();
    for (const match of matches) {
      if (match.best) covered.add(match.best.id);
      for (const candidate of match.candidates) covered.add(candidate.performance.id);
    }
    return attendance.records
      .filter((record) => record.status === 'attended' && !covered.has(record.performanceId))
      .map((record) => performanceById.get(record.performanceId))
      .filter((performance): performance is Performance => performance !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [matches, attendance.records, performanceById]);

  const searchFor = async (performance: Performance) => {
    setSearches((prev) => ({ ...prev, [performance.id]: 'loading' }));
    try {
      const events = await searchEventernoteEvents(performance.tourName);
      setSearches((prev) => ({
        ...prev,
        [performance.id]: matchPerformanceToEvents(performance, events)
      }));
    } catch {
      setSearches((prev) => ({ ...prev, [performance.id]: 'error' }));
    }
  };

  const register = () => {
    const ids = Object.values(selected);
    for (const id of ids) {
      const performance = allPerformanceById.get(id);
      attendance.setAttendance(
        id,
        'attended',
        performance && performance.category !== 'live' ? { watchType: 'stream' } : {}
      );
    }
    setSelected({});
    toast({ title: t('eventernote.registered', { count: ids.length }), type: 'success' });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content w="full" maxW="4xl" maxH="85vh" mx="4" overflowY="auto">
          <Stack gap="4" p={{ base: '4', md: '6' }}>
            <Stack gap="1" pr="8">
              <Dialog.Title>{t('eventernote.title')}</Dialog.Title>
              <Text color="fg.muted" fontSize="sm">
                {t('eventernote.intro')}
              </Text>
            </Stack>

            <HStack gap="2" flexWrap="wrap">
              <Box flex="1" minW="48">
                <Input
                  size="sm"
                  value={userId ?? ''}
                  placeholder={t('eventernote.user_id_placeholder')}
                  onChange={(event) => setUserId(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void load();
                  }}
                />
              </Box>
              <Button
                size="sm"
                loading={loading}
                disabled={!userId?.trim()}
                onClick={() => void load()}
              >
                {t('eventernote.load')}
              </Button>
            </HStack>

            {error && (
              <Alert.Root>
                <Alert.Content>
                  <Alert.Title>{t('eventernote.error_title')}</Alert.Title>
                  <Alert.Description>
                    {error}
                    <br />
                    {t('eventernote.server_hint')}
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

            {matches && (
              <>
                <Grid
                  gap="2"
                  gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }}
                >
                  <StatTile label={t('eventernote.total')} value={matches.length} />
                  <StatTile label={t('eventernote.matched')} value={counts.matched} />
                  <StatTile label={t('eventernote.ambiguous')} value={counts.ambiguous} />
                  <StatTile label={t('eventernote.unmatched')} value={counts.unmatched} />
                  <StatTile label={t('eventernote.mismatch')} value={mismatches.length} />
                </Grid>

                <HStack gap="2" justifyContent="space-between" flexWrap="wrap">
                  <NativeSelect
                    aria-label={t('eventernote.filter')}
                    value={kindFilter}
                    placeholder={`${t('eventernote.filter')}: ${t('common.all')}`}
                    options={[
                      { value: 'matched', label: t('eventernote.matched') },
                      { value: 'ambiguous', label: t('eventernote.ambiguous') }
                    ]}
                    onChange={(value) => setKindFilter(value as KindFilter)}
                  />
                  <HStack gap="3">
                    <Text color="fg.muted" fontSize="sm">
                      {t('eventernote.selected_count', { count: selectedCount })}
                    </Text>
                    <Button size="sm" disabled={selectedCount === 0} onClick={register}>
                      {t('eventernote.register')}
                    </Button>
                  </HStack>
                </HStack>

                <Stack gap="2">
                  {visible.map((match) => {
                    const key = match.event.href;
                    const kind = matchKind(match);
                    const alreadyAttended =
                      match.best && attendance.get(match.best.id)?.status === 'attended';
                    return (
                      <Card.Root key={key}>
                        <Card.Body p="3">
                          <HStack gap="3" alignItems="flex-start">
                            {kind === 'matched' && !alreadyAttended && (
                              <Checkbox
                                aria-label={t('eventernote.import')}
                                checked={selected[key] !== undefined}
                                onCheckedChange={(details) =>
                                  setRowSelection(key, details.checked ? match.best!.id : '')
                                }
                              />
                            )}
                            <Stack flex="1" gap="1.5" minW="0">
                              <HStack gap="2" flexWrap="wrap">
                                <Text color="fg.muted" fontSize="xs">
                                  {match.date ?? match.event.date}
                                </Text>
                                <Link
                                  href={eventernoteEventUrl(match.event.href)}
                                  target="_blank"
                                  rel="noreferrer"
                                  fontSize="sm"
                                  fontWeight="bold"
                                >
                                  {match.event.name}
                                </Link>
                              </HStack>
                              <Text color="fg.muted" fontSize="xs">
                                {match.event.place}
                              </Text>
                              {kind === 'matched' && match.best && (
                                <HStack gap="2" flexWrap="wrap">
                                  <Badge variant="subtle">{performanceLabel(match.best)}</Badge>
                                  <Text color="fg.muted" fontSize="xs">
                                    {match.best.date} ·{' '}
                                    <VenueText performance={match.best} compact />
                                  </Text>
                                  {alreadyAttended && (
                                    <Badge variant="solid">
                                      {t('eventernote.already_attended')}
                                    </Badge>
                                  )}
                                </HStack>
                              )}
                              {kind === 'ambiguous' && (
                                <NativeSelect
                                  aria-label={t('eventernote.select_candidate')}
                                  value={selected[key] ?? ''}
                                  placeholder={t('eventernote.select_candidate')}
                                  options={match.candidates.map((candidate) => ({
                                    value: candidate.performance.id,
                                    label: `${Math.round(candidate.score * 100)}% ${performanceLabel(candidate.performance)}`
                                  }))}
                                  onChange={(value) => setRowSelection(key, value)}
                                />
                              )}
                            </Stack>
                          </HStack>
                        </Card.Body>
                      </Card.Root>
                    );
                  })}
                </Stack>
                {visible.length === 0 && <Text color="fg.muted">{t('common.no_results')}</Text>}

                {mismatches.length > 0 && (
                  <Stack gap="2" borderColor="border.subtle" borderTopWidth="1px" pt="4">
                    <Stack gap="0.5">
                      <Text fontWeight="bold">{t('eventernote.mismatch')}</Text>
                      <Text color="fg.muted" fontSize="sm">
                        {t('eventernote.mismatch_hint')}
                      </Text>
                    </Stack>
                    {mismatches.map((performance) => {
                      const search = searches[performance.id];
                      const knownId = eventernoteIdByPerformanceId.get(performance.id);
                      return (
                        <Card.Root key={performance.id}>
                          <Card.Body gap="1.5" p="3">
                            <HStack gap="2" flexWrap="wrap">
                              <Text color="fg.muted" fontSize="xs">
                                {performance.date}
                              </Text>
                              <Text fontSize="sm" fontWeight="bold">
                                {performanceLabel(performance)}
                              </Text>
                            </HStack>
                            <Text color="fg.muted" fontSize="xs">
                              <VenueText performance={performance} compact />
                            </Text>
                            {knownId ? (
                              <Box>
                                <Link
                                  href={eventernoteEventUrl(`/events/${knownId}`)}
                                  target="_blank"
                                  rel="noreferrer"
                                  fontSize="xs"
                                >
                                  {t('eventernote.open_event')} <FaArrowUpRightFromSquare />
                                </Link>
                              </Box>
                            ) : (
                              <HStack gap="2">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  loading={search === 'loading'}
                                  onClick={() => void searchFor(performance)}
                                >
                                  {t('eventernote.search_on_eventernote')}
                                </Button>
                                <Link
                                  href={eventernoteSearchUrl(performance)}
                                  target="_blank"
                                  rel="noreferrer"
                                  color="fg.muted"
                                  fontSize="xs"
                                >
                                  {t('eventernote.open_search')} <FaArrowUpRightFromSquare />
                                </Link>
                              </HStack>
                            )}
                            {search === 'error' && (
                              <Text color="fg.muted" fontSize="xs">
                                {t('eventernote.search_error')}
                              </Text>
                            )}
                            {Array.isArray(search) &&
                              (search.length === 0 ? (
                                <Text color="fg.muted" fontSize="xs">
                                  {t('common.no_results')}
                                </Text>
                              ) : (
                                <Stack gap="1">
                                  {search.map((result) => (
                                    <HStack key={result.event.href} gap="2" flexWrap="wrap">
                                      {result.sameDate && (
                                        <Badge size="sm" variant="solid">
                                          {t('eventernote.same_date')}
                                        </Badge>
                                      )}
                                      <Text color="fg.muted" fontSize="xs">
                                        {result.event.date}
                                      </Text>
                                      <Link
                                        href={eventernoteEventUrl(result.event.href)}
                                        target="_blank"
                                        rel="noreferrer"
                                        fontSize="xs"
                                      >
                                        {result.event.name}
                                      </Link>
                                      <Text color="fg.subtle" fontSize="xs">
                                        {result.event.place}
                                      </Text>
                                    </HStack>
                                  ))}
                                </Stack>
                              ))}
                          </Card.Body>
                        </Card.Root>
                      );
                    })}
                  </Stack>
                )}
              </>
            )}
          </Stack>
          <Dialog.CloseTrigger asChild position="absolute" top="2" right="2">
            <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
              <FaXmark />
            </IconButton>
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Stack
      gap="0"
      borderColor="accent.a5"
      borderRadius="l3"
      borderWidth="1px"
      p="3"
      bgColor="accent.a2"
    >
      <Text
        textStyle="display"
        color="accent.default"
        fontSize="2xl"
        fontWeight="bold"
        lineHeight="1.1"
      >
        {value}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        {label}
      </Text>
    </Stack>
  );
}
