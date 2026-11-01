import { useState } from 'react';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { Metadata } from '~/components/layout/Metadata';
import {
  ANY,
  DAYS,
  FLOW_C,
  H,
  InfographicProvider,
  LEGS,
  Legend,
  NEW,
  Panel,
  REG,
  RET,
  TYPE,
  pct,
  useInfo
} from '~/components/infographic/shared';
import { ChangeChart, CompChart, Donut, StructChart } from '~/components/infographic/charts';
import { Strip } from '~/components/infographic/Strip';
import { Cat, PoolRow } from '~/components/infographic/pools';
import { SongsPerCast } from '~/components/infographic/SongsPerCast';

type StripMode = 'flow' | 'nrr' | 'core' | 'dna';

export default function Page() {
  return (
    <InfographicProvider>
      <Body />
    </InfographicProvider>
  );
}

function Body() {
  const { d, t, groups, gLabel, typeLabel, cats, toggleCat, liveCats } = useInfo();
  const [stripMode, setStripMode] = useState<StripMode>('flow');
  const m = d.meta;
  const perfsOf = (g: string) => (d.flagPerfByGroup[g] ?? []) as any[];
  const livesOf = (g: string) => (d.flagByGroup[g] ?? []) as any[];

  const stripLegend: [string, string][] =
    stripMode === 'flow'
      ? [
          [FLOW_C.main, t('infographic.struct_main')],
          [FLOW_C.encore, t('infographic.struct_encore')],
          [FLOW_C.mc, 'MC'],
          [FLOW_C.vtr, 'VTR']
        ]
      : stripMode === 'nrr'
        ? [
            [NEW, t('infographic.cat_new')],
            [REG, t('infographic.cat_regular')],
            [RET, t('infographic.cat_returnee')]
          ]
        : stripMode === 'core'
          ? [
              ['var(--colors-fg-muted)', t('infographic.core_core')],
              ['#64748ba8', t('infographic.core_venue')],
              ['#64748b70', t('infographic.core_day')],
              ['#64748b42', t('infographic.core_perf')],
              ['#64748b21', t('infographic.core_rotating')]
            ]
          : (['group', 'subunit', 'solo', 'collab'] as const).map((k) => [TYPE[k], typeLabel(k)]);

  return (
    <>
      <Metadata title={`${t('infographic.title')} - LLerNote`} helmet />
      <Stack gap="3" w="full" maxW="6xl" mx="auto">
        <SectionHeading size="2xl">{t('infographic.title')}</SectionHeading>
        <Text maxW="3xl" color="fg.muted">
          {t('infographic.subtitle', {
            lives: m.numberedLives,
            shows: m.numberedShows,
            groups: groups.length
          })}
        </Text>

        <Grid
          gap="2.5"
          gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }}
          mt="2"
        >
          {[
            [m.numberedLives, t('infographic.kpi_lives')],
            [m.numberedShows, t('infographic.kpi_shows')],
            [groups.length, t('infographic.kpi_groups')],
            [m.totalSongs, t('infographic.kpi_songs')],
            [m.totalSetlists, t('infographic.kpi_setlists')]
          ].map(([n, l], i) => (
            <Box
              key={i}
              borderColor="border.subtle"
              borderRadius="l2"
              borderWidth="1px"
              p="3"
              bg="bg.default"
            >
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1.1">
                {n}
              </Text>
              <Text color="fg.muted" fontSize="2xs" letterSpacing="wide" textTransform="uppercase">
                {l}
              </Text>
            </Box>
          ))}
        </Grid>

        <Text mt="2" color="fg.muted" fontSize="xs">
          {t('infographic.cat_filter_label')}
        </Text>
        <HStack gap="1.5" flexWrap="wrap">
          {liveCats.map((c) => {
            const on = cats.has(c);
            return (
              <Box
                as="button"
                key={c}
                onClick={() => toggleCat(c)}
                cursor="pointer"
                borderColor={on ? 'accent.default' : 'border.subtle'}
                borderRadius="l2"
                borderWidth="1px"
                py="1.5"
                px="3"
                color={on ? 'accent.fg' : 'fg.muted'}
                fontSize="sm"
                fontWeight="medium"
                bg={on ? 'accent.default' : 'bg.default'}
                _hover={on ? undefined : { borderColor: 'accent.8' }}
              >
                {t(`infographic.cat_live_${c}` as 'infographic.cat_live_numbered')}
              </Box>
            );
          })}
        </HStack>

        <H>{t('infographic.change_title')}</H>
        <Text maxW="3xl" color="fg.muted" fontSize="sm">
          {t('infographic.change_sub')}
        </Text>
        <Panel>
          <ChangeChart />
          <Legend
            items={[
              [DAYS, t('infographic.between_days')],
              [LEGS, t('infographic.between_legs')],
              [ANY, t('infographic.between_any')]
            ]}
          />
        </Panel>

        <H>{t('infographic.dna_title')}</H>
        <Text maxW="3xl" color="fg.muted" fontSize="sm">
          {t('infographic.dna_sub')}
        </Text>
        <Grid gap="3" alignItems="start" gridTemplateColumns={{ base: '1fr', md: '1.6fr 1fr' }}>
          <Panel>
            <Text mb="3" fontSize="sm" fontWeight="semibold">
              {t('infographic.dna_make_up')}
            </Text>
            <CompChart />
            <Legend
              items={(['group', 'subunit', 'solo', 'collab'] as const).map((k) => [
                TYPE[k],
                typeLabel(k)
              ])}
            />
          </Panel>
          <Panel>
            <Text mb="2" fontSize="sm" fontWeight="semibold">
              {t('infographic.dna_catalog', {
                count:
                  d.songCensus.group +
                  d.songCensus.subunit +
                  d.songCensus.solo +
                  d.songCensus.collab
              })}
            </Text>
            <Box maxW="180px" mx="auto">
              <Donut />
            </Box>
            <Legend
              items={(['group', 'subunit', 'solo', 'collab'] as const).map((k) => [
                TYPE[k],
                `${typeLabel(k)} · ${d.songCensus[k]}`
              ])}
            />
          </Panel>
        </Grid>

        <SongsPerCast />

        <H>{t('infographic.pershow_title')}</H>
        <Text maxW="3xl" color="fg.muted" fontSize="sm">
          {t(`infographic.pershow_sub_${stripMode}`)}
        </Text>
        <HStack gap="1.5" mt="1" flexWrap="wrap">
          {(
            [
              ['flow', 'pershow_flow'],
              ['nrr', 'pershow_nrr'],
              ['core', 'pershow_core'],
              ['dna', 'pershow_dna']
            ] as const
          ).map(([mode, key]) => {
            const on = stripMode === mode;
            return (
              <Box
                as="button"
                key={mode}
                onClick={() => setStripMode(mode)}
                cursor="pointer"
                borderColor={on ? 'accent.default' : 'border.subtle'}
                borderRadius="l2"
                borderWidth="1px"
                py="1.5"
                px="3"
                color={on ? 'accent.fg' : 'fg.muted'}
                fontSize="sm"
                fontWeight="medium"
                bg={on ? 'accent.default' : 'bg.default'}
                _hover={on ? undefined : { borderColor: 'accent.8' }}
              >
                {t(`infographic.${key}`)}
              </Box>
            );
          })}
        </HStack>
        <Legend items={stripLegend} />
        <Stack gap="4" mt="1">
          {d.canon
            .filter((g: string) => perfsOf(g).length)
            .map((g: string) => {
              const pi = d.poolInfo[g];
              return (
                <Box key={g}>
                  <HStack gap="2">
                    <Box
                      style={{ background: d.groupColor[g] }}
                      borderRadius="2px"
                      w="2.5"
                      h="2.5"
                    />
                    <Text fontSize="sm" fontWeight="semibold">
                      {gLabel(g)}
                    </Text>
                  </HStack>
                  <Text mb="1" color="fg.muted" fontSize="xs">
                    {t('infographic.strip_meta', {
                      shows: perfsOf(g).length,
                      lives: livesOf(g).length,
                      pool: pi.pool,
                      regulars: pi.regulars
                    })}
                  </Text>
                  <Strip g={g} mode={stripMode} />
                </Box>
              );
            })}
        </Stack>

        <H>{t('infographic.struct_title')}</H>
        <Text maxW="3xl" color="fg.muted" fontSize="sm">
          {t('infographic.struct_sub')}
        </Text>
        <Panel>
          <StructChart />
          <Legend
            items={[
              ['#3b82f6', t('infographic.struct_mc')],
              ['#a855f7', t('infographic.struct_vtr')],
              ['#f59e0b', t('infographic.struct_encores')]
            ]}
          />
        </Panel>

        <H>{t('infographic.pool_title')}</H>
        <Text maxW="3xl" color="fg.muted" fontSize="sm">
          {t('infographic.pool_sub')}
        </Text>
        <Grid
          gap="3"
          gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
        >
          {d.canon
            .filter((g: string) => (d.poolInfo[g]?.pool ?? 0) > 0)
            .map((g: string) => {
              const pi = d.poolInfo[g];
              const regs = pi.ranked.filter((r: any) => r.regular);
              return (
                <Panel key={g}>
                  <HStack gap="2">
                    <Box
                      style={{ background: d.groupColor[g] }}
                      borderRadius="2px"
                      w="2.5"
                      h="2.5"
                    />
                    <Text fontSize="sm" fontWeight="semibold">
                      {gLabel(g)}
                    </Text>
                  </HStack>
                  <Text mb="2" color="fg.muted" fontSize="2xs">
                    {t('infographic.pool_meta', { regulars: pi.regulars, pool: pi.pool })}
                  </Text>
                  <Stack gap="0">
                    {regs.slice(0, 10).map((r: any, i: number) => (
                      <PoolRow key={i} r={r} />
                    ))}
                    {regs.length > 10 && (
                      <Box as="details" mt="1">
                        <Box as="summary" cursor="pointer" py="1" color="fg.muted" fontSize="2xs">
                          {t('infographic.show_all', { count: regs.length })}
                        </Box>
                        {regs.slice(10).map((r: any, i: number) => (
                          <PoolRow key={i} r={r} />
                        ))}
                      </Box>
                    )}
                  </Stack>
                </Panel>
              );
            })}
        </Grid>

        <H>{t('infographic.livesongs_title')}</H>
        <Text maxW="3xl" color="fg.muted" fontSize="sm">
          {t('infographic.livesongs_sub')}
        </Text>
        <Stack gap="2">
          {d.canon
            .filter((g: string) => livesOf(g).length)
            .map((g: string) => (
              <Box
                as="details"
                key={g}
                borderColor="border.subtle"
                borderRadius="l2"
                borderWidth="1px"
                px="4"
                bg="bg.default"
              >
                <Box as="summary" cursor="pointer" py="3" fontSize="sm" fontWeight="semibold">
                  <HStack display="inline-flex" gap="2">
                    <Box
                      style={{ background: d.groupColor[g] }}
                      borderRadius="2px"
                      w="2.5"
                      h="2.5"
                    />
                    <span>{gLabel(g)}</span>
                    <Text as="span" color="fg.muted" fontSize="xs" fontWeight="normal">
                      — {t('infographic.lives_count', { count: livesOf(g).length })}
                    </Text>
                  </HStack>
                </Box>
                {livesOf(g).map((l: any, i: number) => (
                  <Box key={i} borderColor="border.subtle" borderTopWidth="1px" py="3">
                    <Text mb="2" fontSize="sm" fontWeight="medium">
                      {l.label}{' '}
                      <Text as="span" color="fg.muted" fontSize="xs" fontWeight="normal">
                        — {l.tour} · {l.date} ·{' '}
                        {t('infographic.songs_count', { count: l.performed })}
                      </Text>
                    </Text>
                    <Grid gap="3" gridTemplateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }}>
                      <Cat label={t('infographic.cat_new')} col={NEW} arr={l.newSongs} />
                      <Cat label={t('infographic.cat_returnee')} col={RET} arr={l.returneeSongs} />
                      <Cat label={t('infographic.cat_regular')} col={REG} arr={l.regularSongs} />
                    </Grid>
                    {l.shows > 1 && l.bindSongs && (
                      <Box as="details" mt="2">
                        <Box as="summary" cursor="pointer" py="1" color="fg.muted" fontSize="2xs">
                          {t('infographic.binding_title')}
                        </Box>
                        <Grid
                          gap="3"
                          gridTemplateColumns={{
                            base: '1fr',
                            sm: 'repeat(2, 1fr)',
                            lg: 'repeat(5, 1fr)'
                          }}
                          mt="1"
                        >
                          <Cat
                            label={t('infographic.core_core')}
                            col={d.groupColor[g]}
                            arr={l.bindSongs.core}
                          />
                          <Cat
                            label={t('infographic.core_venue')}
                            col="#f59e0b"
                            arr={l.bindSongs.venue}
                          />
                          <Cat
                            label={t('infographic.core_day')}
                            col="#a855f7"
                            arr={l.bindSongs.day}
                          />
                          <Cat
                            label={t('infographic.core_perf')}
                            col={NEW}
                            arr={l.bindSongs.perf}
                          />
                          <Cat
                            label={t('infographic.core_rotating')}
                            col={REG}
                            arr={l.bindSongs.rotating}
                          />
                        </Grid>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            ))}
        </Stack>

        <Box as="details" mt="6">
          <Box as="summary" cursor="pointer" py="2" fontSize="lg" fontWeight="semibold">
            {t('infographic.table_title')}
          </Box>
          <Panel>
            <Box overflowX="auto">
              <Box as="table" style={{ borderCollapse: 'collapse' }} w="full" fontSize="xs">
                <Box as="thead" color="fg.muted">
                  <Box as="tr">
                    {[
                      t('infographic.col_live'),
                      t('infographic.col_group'),
                      t('infographic.col_date'),
                      t('infographic.col_shows'),
                      t('infographic.col_legs'),
                      t('infographic.col_songs'),
                      t('infographic.col_core'),
                      t('infographic.between_days'),
                      t('infographic.between_legs'),
                      t('infographic.between_any')
                    ].map((hh, i) => (
                      <Box
                        as="th"
                        key={i}
                        borderColor="border.subtle"
                        borderBottomWidth="1px"
                        py="1.5"
                        px="2"
                        textAlign={i === 0 ? 'left' : 'right'}
                        whiteSpace="nowrap"
                      >
                        {hh}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box as="tbody">
                  {[...d.numberedTours]
                    .sort((a, b) => a.from.localeCompare(b.from))
                    .map((r: any, i: number) => {
                      const multi = r.nShows >= 2;
                      return (
                        <Box as="tr" key={i}>
                          <Box
                            as="td"
                            title={r.tour}
                            borderColor="border.subtle"
                            borderBottomWidth="1px"
                            maxW="340px"
                            py="1.5"
                            px="2"
                            textOverflow="ellipsis"
                            overflow="hidden"
                            whiteSpace="nowrap"
                          >
                            {r.tour}
                          </Box>
                          <Box
                            as="td"
                            style={{ color: d.groupColor[r.headliner ?? ''] || undefined }}
                            borderColor="border.subtle"
                            borderBottomWidth="1px"
                            py="1.5"
                            px="2"
                            textAlign="right"
                            whiteSpace="nowrap"
                          >
                            {gLabel(r.headliner)}
                          </Box>
                          {[r.from, r.nShows, r.legs, r.avgLen].map((c, ci) => (
                            <Box
                              as="td"
                              key={ci}
                              borderColor="border.subtle"
                              borderBottomWidth="1px"
                              py="1.5"
                              px="2"
                              textAlign="right"
                              whiteSpace="nowrap"
                            >
                              {c}
                            </Box>
                          ))}
                          <Box
                            as="td"
                            borderColor="border.subtle"
                            borderBottomWidth="1px"
                            py="1.5"
                            px="2"
                            textAlign="right"
                          >
                            {multi ? pct(r.coreShare) : '—'}
                          </Box>
                          <Box
                            as="td"
                            borderColor="border.subtle"
                            borderBottomWidth="1px"
                            py="1.5"
                            px="2"
                            textAlign="right"
                          >
                            {pct(r.changeDays)}
                          </Box>
                          <Box
                            as="td"
                            borderColor="border.subtle"
                            borderBottomWidth="1px"
                            py="1.5"
                            px="2"
                            textAlign="right"
                          >
                            {pct(r.changeLegs)}
                          </Box>
                          <Box
                            as="td"
                            borderColor="border.subtle"
                            borderBottomWidth="1px"
                            py="1.5"
                            px="2"
                            textAlign="right"
                          >
                            {multi ? pct(r.changeRate) : '—'}
                          </Box>
                        </Box>
                      );
                    })}
                </Box>
              </Box>
            </Box>
          </Panel>
        </Box>

        <Text mt="4" color="fg.subtle" fontSize="xs">
          {t('infographic.method')}
        </Text>
      </Stack>
    </>
  );
}
