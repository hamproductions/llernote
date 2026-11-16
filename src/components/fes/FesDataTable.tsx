import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { f2, fesColor, fesSeriesName } from './fes-style';
import type { FesDerived, FesSong } from '~/utils/fes-report';

type Tab = 'p' | 's';

const sortBy = <T,>(rows: T[], get: (r: T) => string | number, dir: 1 | -1) =>
  [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    return (
      (typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y))) * dir
    );
  });

/** Searchable, sortable tables of every performer and every song in the selected view. */
export function FesDataTable({
  d,
  nameOf,
  onPerformer,
  onSong
}: {
  d: FesDerived;
  nameOf: (id: string) => string;
  onPerformer: (id: string) => void;
  onSong: (s: FesSong) => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('p');
  const [q, setQ] = useState('');
  const [key, setKey] = useState<string>('weight');
  const [dir, setDir] = useState<1 | -1>(-1);
  const others = t('fes.others');
  const series = (s: string) => fesSeriesName(s, others);

  const performers = (() => {
    const rows = d.performers.filter((p) =>
      `${nameOf(p.id)} ${series(p.series)}`.toLowerCase().includes(q.toLowerCase())
    );
    const get = (p: (typeof rows)[number]) =>
      key === 'name'
        ? nameOf(p.id)
        : key === 'series'
          ? series(p.series)
          : ((p as unknown as Record<string, string | number>)[key] ?? 0);
    return sortBy(rows, get as (r: (typeof rows)[number]) => string | number, dir);
  })();
  const songs = (() => {
    const rows = d.songs.filter((s) =>
      `${s.name} ${series(s.billed)}`.toLowerCase().includes(q.toLowerCase())
    );
    const get = (s: FesSong) =>
      key === 'billed'
        ? series(s.billed)
        : key === 'n'
          ? s.members.length
          : key === 'type'
            ? t(`fes.type_${s.type}`)
            : ((s as unknown as Record<string, string | number>)[key] ?? 0);
    return sortBy(rows, get, dir);
  })();

  const head = (k: string, label: string) => (
    <Box
      as="th"
      key={k}
      onClick={() => {
        setDir(key === k ? (dir === 1 ? -1 : 1) : -1);
        setKey(k);
      }}
      cursor="pointer"
      p="2"
      color="fg.muted"
      fontWeight="normal"
      textAlign="left"
    >
      {label}
      {key === k ? (dir === 1 ? ' ▲' : ' ▼') : ''}
    </Box>
  );
  const switchTab = (next: Tab) => {
    setTab(next);
    setKey(next === 'p' ? 'weight' : 'no');
    setDir(next === 'p' ? -1 : 1);
  };

  return (
    <Stack gap="3">
      <HStack gap="2" flexWrap="wrap">
        {(['p', 's'] as const).map((k) => (
          <Box
            as="button"
            key={k}
            onClick={() => switchTab(k)}
            cursor="pointer"
            borderColor={tab === k ? 'accent.default' : 'border.subtle'}
            borderRadius="l2"
            borderWidth="1px"
            py="1"
            px="3"
            color={tab === k ? 'accent.fg' : 'fg.muted'}
            fontSize="sm"
            bg={tab === k ? 'accent.default' : 'bg.default'}
          >
            {k === 'p' ? t('fes.tab_performers') : t('fes.tab_songs')}
          </Box>
        ))}
        <Input
          size="sm"
          value={q}
          placeholder={t('fes.search')}
          onChange={(e) => setQ(e.target.value)}
          maxW="56"
        />
      </HStack>
      <Box overflowX="auto">
        <Box as="table" w="full" fontSize="sm">
          <thead>
            <tr>
              {tab === 'p'
                ? [
                    head('name', t('fes.c_name')),
                    head('series', t('fes.c_franchise')),
                    head('weight', t('fes.c_songs')),
                    head('collab', t('fes.c_collab')),
                    head('solo', t('fes.col_solo'))
                  ]
                : [
                    head('day', t('fes.c_day')),
                    head('no', t('fes.c_no')),
                    head('name', t('fes.c_song')),
                    head('type', t('fes.c_type')),
                    head('billed', t('fes.c_billed_to')),
                    head('weight', t('fes.c_weight')),
                    head('n', t('fes.c_on_stage'))
                  ]}
            </tr>
          </thead>
          <tbody>
            {tab === 'p'
              ? performers.map((p) => (
                  <Box
                    as="tr"
                    key={p.id}
                    onClick={() => onPerformer(p.id)}
                    cursor="pointer"
                    borderColor="border.subtle"
                    borderTopWidth="1px"
                  >
                    <Box as="td" p="2">
                      {nameOf(p.id)}
                    </Box>
                    <Box as="td" p="2">
                      <i
                        style={{
                          display: 'inline-block',
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          marginRight: 6,
                          background: fesColor(p.series)
                        }}
                      />
                      {series(p.series)}
                    </Box>
                    <Box as="td" p="2">
                      {f2(p.weight)}
                    </Box>
                    <Box as="td" p="2">
                      {f2(p.collab)}
                    </Box>
                    <Box as="td" p="2">
                      {f2(p.solo)}
                    </Box>
                  </Box>
                ))
              : songs.map((s) => (
                  <Box
                    as="tr"
                    key={s.key}
                    onClick={() => onSong(s)}
                    cursor="pointer"
                    borderColor="border.subtle"
                    borderTopWidth="1px"
                  >
                    <Box as="td" p="2">
                      D{s.day + 1}
                    </Box>
                    <Box as="td" p="2">
                      {s.no}
                    </Box>
                    <Box as="td" p="2">
                      {s.name}
                    </Box>
                    <Box as="td" p="2">
                      {t(`fes.type_${s.type}`)}
                    </Box>
                    <Box as="td" p="2">
                      <i
                        style={{
                          display: 'inline-block',
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          marginRight: 6,
                          background: fesColor(s.billed)
                        }}
                      />
                      {series(s.billed)}
                    </Box>
                    <Box as="td" p="2">
                      {s.weight}
                    </Box>
                    <Box as="td" p="2">
                      {s.members.length}
                    </Box>
                  </Box>
                ))}
          </tbody>
        </Box>
      </Box>
      <Text color="fg.muted" fontSize="xs">
        {(tab === 'p' ? performers : songs).length}
      </Text>
    </Stack>
  );
}
