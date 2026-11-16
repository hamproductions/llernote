import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { Drawer } from '~/components/ui/drawer';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import {
  BumpChart,
  CollabBars,
  FlowStrip,
  FranchiseDots,
  PerformerBars,
  ShiftChart,
  SongTimeStack,
  TypeLegend,
  type BumpView
} from './FesCharts';
import { FesDataTable } from './FesDataTable';
import { ACTIVE_SERIES, f1, f2, fesColor, fesSeriesName, pctText } from './fes-style';
import { fesCharacterById, type FesEvent } from '~/hooks/useFesReport';
import { deriveFes, diffFesDays, type FesDay, type FesSong } from '~/utils/fes-report';
import { localizedName } from '~/utils/names';

const Card = ({
  title,
  lead,
  children
}: {
  title?: string;
  lead?: string;
  children: React.ReactNode;
}) => (
  <Box borderColor="border.subtle" borderRadius="l3" borderWidth="1px" p="4" bg="bg.default">
    {title && (
      <Heading as="h3" fontSize="md">
        {title}
      </Heading>
    )}
    {lead && (
      <Text mb="3" color="fg.muted" fontSize="sm">
        {lead}
      </Text>
    )}
    {children}
  </Box>
);

const Chip = ({
  on,
  onClick,
  children
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Box
    as="button"
    onClick={onClick}
    cursor="pointer"
    borderColor={on ? 'accent.default' : 'border.subtle'}
    borderRadius="l2"
    borderWidth="1px"
    py="1"
    px="3"
    color={on ? 'accent.fg' : 'fg.muted'}
    fontSize="sm"
    bg={on ? 'accent.default' : 'bg.default'}
  >
    {children}
  </Box>
);

function Segmented<T extends string | number>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <HStack
      gap="0"
      borderColor="border.default"
      borderRadius="l2"
      borderWidth="1px"
      bg="bg.default"
      overflow="hidden"
    >
      {options.map((o, i) => (
        <Box
          as="button"
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          cursor="pointer"
          borderColor="border.default"
          borderLeftWidth={i === 0 ? '0' : '1px'}
          py="1.5"
          px="3.5"
          color={value === o.value ? 'accent.fg' : 'fg.default'}
          fontSize="sm"
          fontWeight={value === o.value ? 'semibold' : 'normal'}
          bg={value === o.value ? 'accent.default' : 'transparent'}
          _hover={value === o.value ? undefined : { bg: 'bg.subtle' }}
        >
          {o.label}
        </Box>
      ))}
    </HStack>
  );
}

type Detail =
  | { kind: 'songs'; title: string; songs: FesSong[] }
  | { kind: 'series'; series: string }
  | { kind: 'performer'; id: string };

export function FesReport({ days }: { event: FesEvent; days: FesDay[] }) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<number | 'all'>(0);
  const [activeOnly, setActiveOnly] = useState(false);
  const [noEnsemble, setNoEnsemble] = useState(false);
  const [limit, setLimit] = useState(25);
  const [pair, setPair] = useState(0);
  const [bump, setBump] = useState<BumpView>('all');
  const [focus, setFocus] = useState<string | undefined>();
  const [detail, setDetail] = useState<Detail | undefined>();

  const options = useMemo(
    () => ({
      activeSeries: activeOnly ? ACTIVE_SERIES : undefined,
      hideEnsembleAt: noEnsemble ? 50 : undefined
    }),
    [activeOnly, noEnsemble]
  );
  const shown = view === 'all' ? days : days.filter((_, i) => i === view);
  const d = useMemo(() => deriveFes(shown, fesCharacterById, options), [shown, options]);
  const lineup = days[0]?.lineup.length ?? 0;
  const nameOf = (id: string) => {
    const c = fesCharacterById.get(id);
    return c ? localizedName(i18n.language, c.fullName, c.englishName) : id;
  };
  const seriesLabel = (s: string) => fesSeriesName(s, t('fes.others'));

  const click = {
    onSong: (title: string, pick: (s: FesSong) => boolean) =>
      setDetail({ kind: 'songs', title, songs: d.songs.filter(pick) }),
    onSeries: (series: string) => setDetail({ kind: 'series', series }),
    onPerformer: (id: string) => setDetail({ kind: 'performer', id })
  };

  const compareA = days[pair];
  const compareB = days[pair + 1];
  const diff = compareA && compareB ? diffFesDays(compareA.songs, compareB.songs) : undefined;
  const derivedA = compareA ? deriveFes([compareA], fesCharacterById) : undefined;
  const derivedB = compareB ? deriveFes([compareB], fesCharacterById) : undefined;

  const members = d.franchises.filter((f) => f.series !== '5').sort((a, b) => b.avg - a.avg);
  const songSeries = d.songTime.filter((r) => r.series !== '5' && r.series !== 'others');
  const solos = d.billed.filter((s) => s.type === 'solo');
  const soloBy: Record<string, number> = {};
  for (const s of solos) soloBy[s.billed] = (soloBy[s.billed] ?? 0) + 1;
  const pushSorted = [...d.push].sort((a, b) => b.avg - a.avg);

  const findings: string[] = [];
  if (songSeries.length > 1)
    findings.push(
      t('fes.f_song_time', {
        top: seriesLabel(songSeries[0]!.series),
        topVal: f2(songSeries[0]!.weight),
        low: seriesLabel(songSeries.at(-1)!.series),
        lowVal: f2(songSeries.at(-1)!.weight)
      })
    );
  if (members.length > 1)
    findings.push(
      t('fes.f_cast_time', {
        top: seriesLabel(members[0]!.series),
        topVal: f1(members[0]!.avg),
        low: seriesLabel(members.at(-1)!.series),
        lowVal: f1(members.at(-1)!.avg),
        ratio: (members[0]!.avg / members.at(-1)!.avg).toFixed(1)
      })
    );
  if (pushSorted.length > 1)
    findings.push(
      t('fes.f_push', {
        top: seriesLabel(pushSorted[0]!.series),
        topVs: pctText(pushSorted[0]!.vsAvg),
        low: seriesLabel(pushSorted.at(-1)!.series),
        lowVs: pctText(pushSorted.at(-1)!.vsAvg)
      })
    );
  findings.push(
    t('fes.f_solo', {
      list:
        Object.entries(soloBy)
          .map(([s, n]) => `${seriesLabel(s)} ${n}`)
          .join(', ') || t('fes.f_none')
    }),
    t('fes.f_collab', {
      song: Math.round(d.collab.songShare * 100),
      cast: Math.round(d.collab.castShare * 100)
    }),
    t('fes.f_fair', {
      top10: Math.round(d.fairness.top10Share * 100),
      even: Math.round(1000 / Math.max(d.fairness.members, 1)),
      gini: d.fairness.gini.toFixed(2)
    })
  );

  const songRow = (s: FesSong) => (
    <Box key={s.key} borderColor="border.subtle" borderBottomWidth="1px" py="2" fontSize="sm">
      <b>
        D{s.day + 1} #{s.no} · {s.name}
      </b>{' '}
      · {s.weight}
      <Text color="fg.muted" fontSize="xs">
        {t('fes.d_billed', { f: seriesLabel(s.billed) })} · {t(`fes.type_${s.type}`)} ·{' '}
        {t('fes.d_on_stage', { n: s.members.length })}
        {s.remarks ? ` · ${s.remarks}` : ''}
      </Text>
    </Box>
  );

  const detailBody = () => {
    if (!detail) return null;
    if (detail.kind === 'songs')
      return (
        <>
          <Text color="fg.muted" fontSize="sm">
            {t('fes.d_songs', {
              n: detail.songs.length,
              w: f2(detail.songs.reduce((a, s) => a + s.weight, 0))
            })}
          </Text>
          {detail.songs.map(songRow)}
        </>
      );
    if (detail.kind === 'performer') {
      const p = d.performers.find((x) => x.id === detail.id);
      return (
        <>
          <Text color="fg.muted" fontSize="sm">
            {p ? `${seriesLabel(p.series)} · ${f2(p.weight)} · ${f2(p.collab)}` : ''}
          </Text>
          {d.songs.filter((s) => s.members.includes(detail.id)).map(songRow)}
        </>
      );
    }
    const billed = d.billed.filter((s) => s.billed === detail.series);
    return (
      <>
        <Text fontWeight="semibold">
          {t('fes.d_billed_songs', { f: seriesLabel(detail.series) })}
        </Text>
        {billed.map(songRow)}
        <Text mt="3" fontWeight="semibold">
          {t('fes.d_performers')}
        </Text>
        {d.performers
          .filter((p) => p.series === detail.series)
          .map((p) => (
            <Box
              key={p.id}
              onClick={() => setDetail({ kind: 'performer', id: p.id })}
              cursor="pointer"
              borderColor="border.subtle"
              borderBottomWidth="1px"
              py="1.5"
              fontSize="sm"
            >
              {nameOf(p.id)} · {f2(p.weight)}
            </Box>
          ))}
      </>
    );
  };

  const detailTitle =
    detail?.kind === 'songs'
      ? detail.title
      : detail?.kind === 'series'
        ? seriesLabel(detail.series)
        : detail?.kind === 'performer'
          ? nameOf(detail.id)
          : '';

  return (
    <Stack gap="6">
      <Stack gap="2">
        <HStack gap="3" flexWrap="wrap">
          <Segmented<number | 'all'>
            value={view}
            onChange={setView}
            options={[
              ...days.map((_, i) => ({
                value: i as number | 'all',
                label: t('fes.day_n', { n: i + 1 })
              })),
              ...(days.length > 1
                ? [{ value: 'all' as number | 'all', label: t('fes.all_days') }]
                : [])
            ]}
          />
          <Segmented<'all' | 'active'>
            value={activeOnly ? 'active' : 'all'}
            onChange={(v) => setActiveOnly(v === 'active')}
            options={[
              { value: 'all', label: t('fes.franchises_all') },
              { value: 'active', label: t('fes.franchises_active') }
            ]}
          />
          <Chip on={noEnsemble} onClick={() => setNoEnsemble((v) => !v)}>
            {noEnsemble ? '✓ ' : ''}
            {t('fes.hide_ensemble')}
          </Chip>
        </HStack>
        <Text color="fg.muted" fontSize="xs">
          {lineup > 0
            ? t('fes.lineup_known', {
                main:
                  days[0]!.lineup.length -
                  days[0]!.lineup.filter((id) => fesCharacterById.get(id)?.seriesId === '5').length,
                guests: days[0]!.lineup.filter((id) => fesCharacterById.get(id)?.seriesId === '5')
                  .length
              })
            : t('fes.lineup_unknown')}
        </Text>
      </Stack>

      <Card title={t('fes.findings')}>
        <Stack as="ul" gap="2" listStyleType="none">
          {findings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </Stack>
      </Card>

      <Stack gap="3">
        <Heading as="h2" fontSize="xl">
          {t('fes.s_song_time')}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {t('fes.s_song_time_lead')}
        </Text>
        <Card title={t('fes.h_stack')}>
          <TypeLegend />
          <SongTimeStack click={click} d={d} />
        </Card>
        <Card title={t('fes.h_flow')} lead={t('fes.flow_lead')}>
          <FlowStrip songs={d.songs} click={click} />
        </Card>
      </Stack>

      <Stack gap="3">
        <Heading as="h2" fontSize="xl">
          {t('fes.s_cast_time')}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {t('fes.s_cast_time_lead')}
        </Text>
        <Card title={t('fes.h_dots')} lead={t('fes.dots_lead')}>
          <FranchiseDots click={click} d={d} />
        </Card>
        <Card title={t('fes.h_collab')} lead={t('fes.collab_lead')}>
          <HStack gap="8" mb="3" flexWrap="wrap">
            <Box>
              <Text fontSize="3xl" fontWeight="bold" lineHeight="1.1">
                {Math.round(d.collab.songShare * 100)}%
              </Text>
              <Text color="fg.muted" fontSize="xs">
                {t('fes.of_song_time')}
              </Text>
            </Box>
            <Box>
              <Text fontSize="3xl" fontWeight="bold" lineHeight="1.1">
                {Math.round(d.collab.castShare * 100)}%
              </Text>
              <Text color="fg.muted" fontSize="xs">
                {t('fes.of_cast_time')}
              </Text>
            </Box>
          </HStack>
          <CollabBars click={click} d={d} />
        </Card>
        <Card title={t('fes.h_performers')} lead={t('fes.performers_lead')}>
          <PerformerBars limit={limit} nameOf={nameOf} click={click} d={d} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLimit(limit < d.performers.length ? 9999 : 25)}
            mt="2"
          >
            {limit < d.performers.length
              ? t('fes.show_all', { n: d.performers.length })
              : t('fes.show_top')}
          </Button>
        </Card>
      </Stack>

      <Stack gap="3">
        <Heading as="h2" fontSize="xl">
          {t('fes.s_push')}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {t('fes.s_push_lead')}
        </Text>
        <Card>
          <Box overflowX="auto">
            <Box as="table" w="full" fontSize="sm">
              <thead>
                <tr>
                  {['franchise', 'cast', 'billed', 'avg', 'vs', 'solo', 'spot', 'range'].map(
                    (k) => (
                      <Box
                        as="th"
                        key={k}
                        p="2"
                        color="fg.muted"
                        fontWeight="normal"
                        textAlign="left"
                      >
                        {t(`fes.col_${k}` as 'fes.col_franchise')}
                      </Box>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {d.push
                  .filter((r) => ACTIVE_SERIES.includes(r.series))
                  .map((r) => (
                    <Box
                      as="tr"
                      key={r.series}
                      onClick={() => setDetail({ kind: 'series', series: r.series })}
                      cursor="pointer"
                      borderColor="border.subtle"
                      borderTopWidth="1px"
                    >
                      <Box as="td" p="2">
                        <i
                          style={{
                            display: 'inline-block',
                            width: 9,
                            height: 9,
                            borderRadius: 2,
                            marginRight: 6,
                            background: fesColor(r.series)
                          }}
                        />
                        <b>{seriesLabel(r.series)}</b>
                      </Box>
                      <Box as="td" p="2">
                        {r.members}
                      </Box>
                      <Box as="td" p="2">
                        {f2(r.songTime)}
                      </Box>
                      <Box as="td" p="2">
                        {f1(r.avg)}
                      </Box>
                      <Box
                        as="td"
                        style={{
                          color: r.vsAvg > 0.1 ? '#16a34a' : r.vsAvg < -0.1 ? '#dc2626' : undefined
                        }}
                        p="2"
                      >
                        {pctText(r.vsAvg)}
                      </Box>
                      <Box as="td" p="2">
                        {f2(r.solo)}
                      </Box>
                      <Box as="td" p="2">
                        {f2(r.spotlight)}
                      </Box>
                      <Box as="td" p="2">{`${f2(r.min)} – ${f2(r.max)}`}</Box>
                    </Box>
                  ))}
              </tbody>
            </Box>
          </Box>
          <Text mt="3" fontSize="sm">
            {t('fes.fair_text', {
              top10: Math.round(d.fairness.top10Share * 100),
              even: Math.round(1000 / Math.max(d.fairness.members, 1)),
              gini: d.fairness.gini.toFixed(2)
            })}
          </Text>
        </Card>
      </Stack>

      {diff && derivedA && derivedB && compareA && compareB && (
        <Stack gap="3">
          <Heading as="h2" fontSize="xl">
            {t('fes.s_changes')}
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            {t('fes.s_changes_lead')}
          </Text>
          {days.length > 2 && (
            <HStack gap="2">
              <Text color="fg.muted" fontSize="sm">
                {t('fes.compare')}
              </Text>
              {days.slice(0, -1).map((_, i) => (
                <Chip key={i} on={pair === i} onClick={() => setPair(i)}>
                  {`${i + 1} → ${i + 2}`}
                </Chip>
              ))}
            </HStack>
          )}
          <Grid gap="2.5" gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}>
            {[
              ['all', `${compareA.songs.length} → ${compareB.songs.length}`, t('fes.t_songs'), ''],
              [
                'repeat',
                String(diff.repeated.length),
                t('fes.t_repeat'),
                t('fes.t_in_order', {
                  a: diff.repeated.filter((r) => r.inOrder).length,
                  b: diff.repeated.filter((r) => !r.inOrder).length
                })
              ],
              ['change', String(diff.dropped.length), t('fes.t_dropped'), t('fes.t_dropped_sub')],
              ['change', String(diff.added.length), t('fes.t_new'), t('fes.t_new_sub')]
            ].map(([v, big, label, sub], i) => (
              <Box
                key={i}
                onClick={() => setBump(v as BumpView)}
                cursor="pointer"
                borderColor={bump === v ? 'accent.default' : 'border.subtle'}
                borderRadius="l2"
                borderWidth="1px"
                p="3"
                bg="bg.default"
              >
                <Text fontSize="2xl" fontWeight="bold" lineHeight="1.1">
                  {big}
                </Text>
                <Text color="fg.muted" fontSize="xs">
                  {label}
                </Text>
                <Text color="fg.subtle" fontSize="2xs">
                  {sub}
                </Text>
              </Box>
            ))}
          </Grid>
          <Card title={t('fes.h_shift')} lead={t('fes.shift_lead')}>
            <ShiftChart a={derivedA} b={derivedB} />
          </Card>
          <Card title={t('fes.h_bump')} lead={t('fes.bump_lead')}>
            <HStack gap="2" mb="2" flexWrap="wrap">
              {(['all', 'repeat', 'change'] as const).map((v) => (
                <Chip key={v} on={bump === v} onClick={() => setBump(v)}>
                  {t(`fes.v_${v}`)}
                </Chip>
              ))}
              <Box w="2" />
              {[...new Set([...compareA.songs, ...compareB.songs].map((s) => s.billed))].map(
                (s) => (
                  <Chip
                    key={s}
                    on={focus === s}
                    onClick={() => setFocus(focus === s ? undefined : s)}
                  >
                    {seriesLabel(s)}
                  </Chip>
                )
              )}
            </HStack>
            <BumpChart
              from={compareA.songs}
              to={compareB.songs}
              diff={diff}
              view={bump}
              focus={focus}
              onOpen={(songId) =>
                setDetail({
                  kind: 'songs',
                  title:
                    [...compareA.songs, ...compareB.songs].find((s) => s.songId === songId)?.name ??
                    '',
                  songs: [...compareA.songs, ...compareB.songs].filter((s) => s.songId === songId)
                })
              }
            />
          </Card>
        </Stack>
      )}

      <Stack gap="3">
        <Heading as="h2" fontSize="xl">
          {t('fes.s_data')}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {t('fes.s_data_lead')}
        </Text>
        <Card>
          <FesDataTable
            nameOf={nameOf}
            onPerformer={(id) => setDetail({ kind: 'performer', id })}
            onSong={(s) => setDetail({ kind: 'songs', title: s.name, songs: [s] })}
            d={d}
          />
        </Card>
      </Stack>

      <Stack gap="2">
        <Heading as="h2" fontSize="xl">
          {t('fes.s_method')}
        </Heading>
        <Text as="ul" pl="4" color="fg.muted" fontSize="sm" lineHeight="1.7">
          {['m_lineup', 'm_who', 'm_weight', 'm_billing', 'm_data'].map((k) => (
            <li key={k}>{t(`fes.${k}` as 'fes.m_data')}</li>
          ))}
        </Text>
      </Stack>

      <Drawer.Root
        open={detail !== undefined}
        onOpenChange={(e) => !e.open && setDetail(undefined)}
      >
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>{detailTitle}</Drawer.Title>
              <Drawer.CloseTrigger asChild>
                <Button size="sm" variant="ghost">
                  {t('fes.close')}
                </Button>
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body>{detailBody()}</Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </Stack>
  );
}
