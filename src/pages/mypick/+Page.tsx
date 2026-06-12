import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDownload,
  FaLink,
  FaMusic,
  FaPen,
  FaPlus,
  FaRegCalendar,
  FaRotateLeft,
  FaUser,
  FaXTwitter,
  FaXmark
} from 'react-icons/fa6';
import { Box, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { PickDialog, type PickItem } from '~/components/mypick/PickDialog';
import { EXPORT_BG, MyPickGrid } from '~/components/mypick/MyPickGrid';
import { Metadata } from '~/components/layout/Metadata';
import { Dialog } from '~/components/ui/dialog';
import { Field } from '~/components/ui/field';
import { IconButton } from '~/components/ui/icon-button';
import { Input } from '~/components/ui/input';
import { Tabs } from '~/components/ui/tabs';
import { useAttendance, useMyPick } from '~/hooks/useAttendance';
import {
  getLiveThumb,
  useArtistById,
  useArtists,
  useCharacters,
  usePerformances,
  useSeries,
  useSetlists,
  useSongById,
  useSongs
} from '~/hooks/useData';
import { setMyPick, setMyPickCell, setMyPickConfig } from '~/utils/attendance/storage';
import { buildPerformanceCharacterMap } from '~/utils/performance-cast';
import { getPicUrl } from '~/utils/assets';
import { hasSongThumb } from '~/utils/song-thumbs';
import { castName, localizedName } from '~/utils/names';
import { decodeMyPick, encodeMyPick, myPickShareUrl } from '~/utils/mypick-share';
import { clickable } from '~/utils/clickable';
import { cellKey, columnKey, rowKey } from '~/types/attendance';
import type { MyPickColumn, MyPickConfig, MyPickRow } from '~/types/attendance';
import { fuzzySearch, getSearchScore, type SearchableItem } from '~/utils/search';
import { downloadElementAsImage } from '~/utils/share';
import { getMyPickColumnYears } from '~/utils/mypick-years';
import {
  artistsForRow,
  buildArtistBuckets,
  isGroupSong,
  isSoloSong,
  isUnitSong,
  songArtistIds,
  songMatchesMyPickRow,
  type MyPickRowCategory
} from '~/utils/mypick-options';
import { useToaster } from '~/context/ToasterContext';

type RowCategory = MyPickRowCategory;
type ColumnKind = 'member' | 'song' | 'event';

const DEFAULT_CONFIG: MyPickConfig = {
  rows: Array.from({ length: 8 }, (_, i) => ({ type: 'series' as const, id: String(i + 1) })),
  columns: [{ type: 'member' }, { type: 'slot', slot: 'song' }, { type: 'slot', slot: 'event' }]
};

const LEGACY_DEFAULT_CONFIG: MyPickConfig = {
  rows: Array.from({ length: 8 }, (_, i) => ({ type: 'series', id: String(i + 1) })),
  columns: [
    { type: 'slot', slot: 'cast' },
    { type: 'slot', slot: 'song' },
    { type: 'slot', slot: 'event' }
  ]
};

const sameConfig = (a: MyPickConfig, b: MyPickConfig) =>
  a.rows.map(rowKey).join('|') === b.rows.map(rowKey).join('|') &&
  a.columns.map(columnKey).join('|') === b.columns.map(columnKey).join('|');

const normalizeConfig = (config: MyPickConfig): MyPickConfig => ({
  rows: config.rows.length ? config.rows : DEFAULT_CONFIG.rows,
  columns: config.columns.length ? config.columns : DEFAULT_CONFIG.columns
});

export default function Page() {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const { myPick } = useMyPick();
  const { map: attendanceMap } = useAttendance();
  const series = useSeries();
  const artists = useArtists();
  const artistById = useArtistById();
  const characters = useCharacters();
  const songs = useSongs();
  const songById = useSongById();
  const performances = usePerformances();
  const setlists = useSetlists();
  const [picking, setPicking] = useState<{ row: MyPickRow; column: MyPickColumn }>();
  const [addingRow, setAddingRow] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [resettingValues, setResettingValues] = useState(false);
  const [resettingColumns, setResettingColumns] = useState(false);
  const [rowCategory, setRowCategory] = useState<RowCategory>('group');
  const [changingRowCategory, setChangingRowCategory] = useState(false);
  const [pendingRowCategory, setPendingRowCategory] = useState<RowCategory>('series');
  const [rowSearch, setRowSearch] = useState('');
  const [columnKind, setColumnKind] = useState<ColumnKind>('song');
  const [columnYear, setColumnYear] = useState('');
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const exportGridRef = useRef<HTMLDivElement>(null);

  const [shared, setShared] = useState<ReturnType<typeof decodeMyPick>>(null);

  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get('d');
    if (d) setShared(decodeMyPick(d));
  }, []);

  const storedConfig = myPick?.config;
  const config = normalizeConfig(
    shared
      ? { rows: shared.rows, columns: shared.columns }
      : storedConfig && !sameConfig(storedConfig, LEGACY_DEFAULT_CONFIG)
        ? storedConfig
        : DEFAULT_CONFIG
  );

  const performanceCharacters = useMemo(
    () => buildPerformanceCharacterMap(setlists, songById, artistById),
    [setlists, songById, artistById]
  );
  const songCount = songs.length;
  const hasValues = Object.values(myPick?.cells ?? {}).some((value) => value != null);
  const columnsChanged =
    config.columns.map(columnKey).join('|') !== DEFAULT_CONFIG.columns.map(columnKey).join('|');
  const rowsChanged =
    config.rows.map(rowKey).join('|') !== DEFAULT_CONFIG.rows.map(rowKey).join('|');
  const configChanged = rowsChanged || columnsChanged;
  const artistBuckets = useMemo(() => buildArtistBuckets(artists), [artists]);

  const rowArtistsFor = (row: MyPickRow) => {
    return artistsForRow(row, artistById, artistBuckets);
  };

  const getPickItems = (row: MyPickRow, column: MyPickColumn): PickItem[] => {
    const scopedArtists = rowArtistsFor(row);
    const rowCharacterIds =
      scopedArtists.length > 0
        ? new Set(
            scopedArtists.flatMap((artist) =>
              (artist?.characters ?? []).filter(
                (id): id is string => typeof id === 'string' && id.length > 0
              )
            )
          )
        : null;
    const rowArtistIds = new Set(scopedArtists.map((artist) => artist?.id).filter(Boolean));
    const year = column.type === 'year' ? String(column.year) : null;
    const matchesRowPerformance = (performanceId: string, seriesIds: string[]) => {
      if (rowCharacterIds) {
        const cast = performanceCharacters.get(performanceId);
        if (!cast) return false;
        return [...rowCharacterIds].some((id) => cast.has(id));
      }
      if (row.type === 'category') return false;
      return seriesIds.includes(row.id);
    };

    if (column.type === 'member' || (column.type === 'slot' && column.slot === 'cast')) {
      return characters
        .filter((c) => (rowCharacterIds ? rowCharacterIds.has(c.id) : c.seriesId === row.id))
        .map((c) => ({
          id: c.id,
          label: localizedName(i18n.language, c.fullName, c.englishName),
          sub: c.casts
            .map((cast) => castName(i18n.language, cast.seiyuu, cast.englishName))
            .join('・'),
          englishName: c.englishName,
          searchText: c.casts
            .map(
              (cast) =>
                `${cast.seiyuu} ${cast.englishName ?? ''} ${castName('en', cast.seiyuu, cast.englishName)}`
            )
            .join(' '),
          image: getPicUrl(c.id, c.hasIcon ? 'icons' : 'character')
        }));
    }
    if (
      (column.type === 'year' && column.slot === 'song') ||
      (column.type === 'slot' && column.slot === 'song')
    ) {
      return songs
        .filter((s) => {
          if (year && !(s.releasedOn ?? '').startsWith(year)) return false;
          if (rowArtistIds.size > 0 || row.type === 'category' || row.type === 'series') {
            return songMatchesMyPickRow(s, row, artistById, artistBuckets.aliasIds);
          }
          return false;
        })
        .map((s) => {
          const ids = songArtistIds(s, artistById);
          return {
            id: s.id,
            label: localizedName(i18n.language, s.name, s.englishName),
            sub: s.releasedOn,
            englishName: s.englishName,
            phoneticName: s.phoneticName,
            searchText: s.artists
              ?.map((artist) => artistById.get(artist.id)?.name)
              .filter(Boolean)
              .join(' '),
            image: hasSongThumb(s.id) ? getPicUrl(s.id, 'thumbnail') : undefined,
            categories: [
              isGroupSong(ids, artistById)
                ? 'group'
                : isUnitSong(ids, artistById)
                  ? 'unit'
                  : isSoloSong(ids, artistById)
                    ? 'solo'
                    : 'others'
            ]
          };
        });
    }
    return performances
      .filter((p) => {
        if (year && !p.date.startsWith(year)) return false;
        return matchesRowPerformance(p.id, p.seriesIds);
      })
      .map((p) => {
        const image = getLiveThumb(p)?.image;
        const record = attendanceMap[p.id];
        const attended = record && !record.deleted && record.status === 'attended';
        return {
          id: p.id,
          label: p.tourName,
          sub: `${p.date} ${p.venue}`,
          searchText: `${p.concertName ?? ''} ${p.performanceName ?? ''} ${p.tourType ?? ''}`,
          image,
          categories: [...(image ? ['with_image'] : []), ...(attended ? ['attended'] : [])]
        };
      });
  };

  const dialogItems: PickItem[] = useMemo(() => {
    if (!picking) return [];
    return getPickItems(picking.row, picking.column);
  }, [
    picking,
    characters,
    songs,
    performances,
    artistById,
    performanceCharacters,
    attendanceMap,
    i18n.language
  ]);

  const existingRows = new Set(config.rows.map(rowKey));

  const updateConfig = (patch: Partial<MyPickConfig>) => {
    setMyPickConfig({ ...config, ...patch });
  };

  const addColumn = (column: MyPickColumn) => {
    if (config.columns.some((c) => columnKey(c) === columnKey(column))) return;
    updateConfig({ columns: [...config.columns, column] });
  };

  const addRow = (row: MyPickRow) => {
    if (existingRows.has(rowKey(row))) return;
    updateConfig({ rows: [...config.rows, row] });
    setAddingRow(false);
  };

  const moveRow = (row: MyPickRow, direction: -1 | 1) => {
    const index = config.rows.findIndex((r) => rowKey(r) === rowKey(row));
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= config.rows.length) return;
    const rows = [...config.rows];
    [rows[index], rows[nextIndex]] = [rows[nextIndex], rows[index]];
    updateConfig({ rows });
  };

  const moveColumn = (column: MyPickColumn, direction: -1 | 1) => {
    const index = config.columns.findIndex((c) => columnKey(c) === columnKey(column));
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= config.columns.length) return;
    const columns = [...config.columns];
    [columns[index], columns[nextIndex]] = [columns[nextIndex], columns[index]];
    updateConfig({ columns });
  };

  const pickedId = picking ? (myPick?.cells?.[cellKey(picking.row, picking.column)] ?? null) : null;
  const columnYears = useMemo(() => {
    return getMyPickColumnYears(songs, performances);
  }, [songs, performances]);
  const columnChoices: { key: ColumnKind; label: string; sub: string; icon: ReactNode }[] = [
    {
      key: 'member',
      label: t('mypick.column_character'),
      sub: t('mypick.column_member_sub'),
      icon: <FaUser />
    },
    {
      key: 'song',
      label: t('mypick.column_song'),
      sub: t('mypick.column_song_sub'),
      icon: <FaMusic />
    },
    {
      key: 'event',
      label: t('mypick.column_event'),
      sub: t('mypick.column_event_sub'),
      icon: <FaRegCalendar />
    }
  ];
  const selectedColumn: MyPickColumn =
    columnKind === 'member'
      ? { type: 'member' }
      : columnYear
        ? { type: 'year', year: Number(columnYear), slot: columnKind }
        : { type: 'slot', slot: columnKind };
  const selectedColumnExists = config.columns.some(
    (c) => columnKey(c) === columnKey(selectedColumn)
  );
  const addSelectedColumn = () => {
    if (selectedColumnExists) return;
    addColumn(selectedColumn);
    setAddingColumn(false);
  };
  const downloadImage = async () => {
    if (exporting) return;
    setExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 80));
    if (!exportGridRef.current) {
      setExporting(false);
      return;
    }
    try {
      await downloadElementAsImage(
        exportGridRef.current,
        `mypick-${new Date().toISOString().slice(0, 10)}.png`,
        EXPORT_BG
      );
    } finally {
      setExporting(false);
    }
  };
  const shareUrl = async () => {
    if (!myPick) return;
    const url = myPickShareUrl(encodeMyPick({ ...myPick, cells: {} }, config.rows, config.columns));
    await navigator.clipboard.writeText(url);
    toast({ title: t('share.copied'), type: 'success' });
  };
  const shareToX = () => {
    if (!myPick) return;
    const url = myPickShareUrl(encodeMyPick({ ...myPick, cells: {} }, config.rows, config.columns));
    const text = `${t('mypick.share_text')}\n${url}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };
  const rowBuckets = useMemo(
    () => ({
      ...artistBuckets,
      series
    }),
    [artistBuckets, series]
  );
  const rowCategories: { key: RowCategory; label: string; count: number }[] = [
    { key: 'group', label: t('mypick.row_group'), count: rowBuckets.group.length },
    { key: 'unit', label: t('mypick.row_unit'), count: rowBuckets.unit.length },
    { key: 'solo', label: t('mypick.row_solo'), count: rowBuckets.solo.length },
    { key: 'others', label: t('mypick.row_others'), count: rowBuckets.others.length },
    { key: 'series', label: t('mypick.row_series'), count: rowBuckets.series.length }
  ];
  const rowsForCategory = (category: RowCategory): MyPickRow[] =>
    category === 'series'
      ? rowBuckets.series.map((s) => ({ type: 'series', id: s.id }))
      : category === 'group' || category === 'unit' || category === 'solo' || category === 'others'
        ? [{ type: 'category', id: category }]
        : [];
  const applyRowCategory = () => {
    setMyPick({
      cells: {},
      config: {
        ...config,
        rows: rowsForCategory(pendingRowCategory)
      }
    });
    setChangingRowCategory(false);
  };
  const normalizedRowSearch = rowSearch.trim();
  const searchableRow = (item: SearchableItem) => ({
    item,
    score: getSearchScore(item, normalizedRowSearch)
  });
  const rankRows = <T extends SearchableItem>(items: T[]) =>
    !normalizedRowSearch
      ? items
      : items
          .filter((item) => fuzzySearch(item, normalizedRowSearch))
          .map(searchableRow)
          .toSorted((a, b) => b.score - a.score)
          .map(({ item }) => item as T);
  const rowCategoryLabel = rowCategories.find((category) => category.key === rowCategory)?.label;
  const anyRowLabel =
    rowCategory === 'others'
      ? rowCategoryLabel
      : t('mypick.row_any', { category: rowCategoryLabel });
  const categoryRow =
    rowCategory === 'group' ||
    rowCategory === 'unit' ||
    rowCategory === 'solo' ||
    rowCategory === 'others'
      ? ({ type: 'category', id: rowCategory } as const)
      : null;
  const categoryRowExists = categoryRow ? existingRows.has(rowKey(categoryRow)) : false;
  const filteredSeriesRows = rankRows(
    rowBuckets.series.map((s) => ({
      ...s,
      name: s.name,
      englishName: s.name
    }))
  );
  const artistRows =
    rowCategory === 'series' || rowCategory === 'others'
      ? []
      : rowBuckets[rowCategory as Exclude<RowCategory, 'series' | 'others'>];
  const filteredArtistRows = rankRows(artistRows);
  const pickTitle = (() => {
    if (!picking) return '';
    const column = picking.column;
    if (column.type === 'member') return t('mypick.column_character');
    if (column.type === 'slot') {
      if (column.slot === 'cast') return t('mypick.column_character');
      return t(column.slot === 'song' ? 'mypick.column_song' : 'mypick.column_event');
    }
    if (column.type === 'year') {
      return `${column.year} ${t(column.slot === 'song' ? 'mypick.column_song' : 'mypick.column_event')}`;
    }
    return '';
  })();

  return (
    <>
      <Metadata title={`${t('mypick.title')} - LLerNote`} helmet />
      <Stack gap={{ base: '4', md: '5' }} color="mypick.text">
        <HStack gap="4" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap">
          <Stack gap="1">
            <Text
              as="h1"
              color="mypick.text"
              fontSize={{ base: '3xl', md: '4xl' }}
              fontWeight="800"
              lineHeight="1"
            >
              {t('mypick.title')}
            </Text>
            <Text color="mypick.muted" fontSize="sm">
              {t('mypick.database_ready', {
                count: songCount
              })}
            </Text>
          </Stack>
          <HStack gap="3" flexWrap="wrap">
            {!shared && editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingRow(true)}
                gap="2"
                borderColor="mypick.actionBorder"
                color="mypick.text"
                bgColor="mypick.actionMuted"
              >
                <FaPlus size={12} />
                {t('mypick.add_row')}
              </Button>
            )}
            {!shared && editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingColumn(true)}
                gap="2"
                borderColor="mypick.actionBorder"
                color="mypick.text"
                bgColor="mypick.actionMuted"
              >
                <FaPlus size={12} />
                {t('mypick.add_column')}
              </Button>
            )}
            {!shared && editing && (
              <Button
                size="sm"
                variant="outline"
                disabled={!hasValues}
                onClick={() => setResettingValues(true)}
                borderColor="mypick.actionBorder"
                color={hasValues ? 'mypick.text' : 'mypick.subtle'}
                bgColor="mypick.actionMuted"
              >
                {t('mypick.reset_values')}
              </Button>
            )}
            {!shared && editing && (
              <Button
                size="sm"
                variant="outline"
                disabled={!columnsChanged}
                onClick={() => setResettingColumns(true)}
                borderColor="mypick.actionBorder"
                color={columnsChanged ? 'mypick.text' : 'mypick.subtle'}
                bgColor="mypick.actionMuted"
              >
                {t('mypick.reset_columns')}
              </Button>
            )}
            {!shared && editing && (
              <Button
                size="sm"
                variant="outline"
                disabled={!configChanged}
                onClick={() => {
                  setMyPick({ cells: {}, config: DEFAULT_CONFIG });
                  setEditing(false);
                }}
                gap="2"
                borderColor="mypick.actionBorder"
                color={configChanged ? 'mypick.text' : 'mypick.subtle'}
                bgColor="mypick.actionMuted"
              >
                <FaRotateLeft size={12} />
                {t('mypick.reset_preset')}
              </Button>
            )}
            {!shared && (
              <Button
                size="sm"
                variant="outline"
                disabled={!myPick}
                onClick={shareUrl}
                gap="2"
                borderColor="mypick.actionBorder"
                color={myPick ? 'mypick.text' : 'mypick.subtle'}
                bgColor="mypick.actionMuted"
              >
                <FaLink size={12} />
                {t('mypick.share_url')}
              </Button>
            )}
            {!shared && (
              <Button
                size="sm"
                variant="outline"
                disabled={!myPick}
                onClick={shareToX}
                gap="2"
                borderColor="mypick.actionBorder"
                color={myPick ? 'mypick.text' : 'mypick.subtle'}
                bgColor="mypick.actionMuted"
              >
                <FaXTwitter size={12} />
                {t('mypick.share_x')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={downloadImage}
              gap="2"
              borderColor="mypick.actionBorder"
              color="mypick.text"
              bgColor="mypick.actionMuted"
            >
              <FaDownload size={12} />
              {t('mypick.download_image')}
            </Button>
            {!shared && (
              <Button
                size="sm"
                variant={editing ? 'subtle' : 'outline'}
                onClick={() => setEditing((value) => !value)}
                gap="2"
                borderColor="mypick.actionBorder"
                color={editing ? 'accent.default' : 'mypick.text'}
                bgColor={editing ? 'mypick.action' : 'mypick.actionMuted'}
              >
                <FaPen size={12} />
                {editing ? t('mypick.done_editing') : t('mypick.edit_grid')}
              </Button>
            )}
          </HStack>
        </HStack>

        {shared && (
          <HStack
            gap="3"
            justifyContent="space-between"
            borderColor="accent.7"
            borderRadius="l2"
            borderWidth="1px"
            p="3"
            bgColor="accent.a2"
            flexWrap="wrap"
          >
            <Text fontSize="sm">{t('mypick.shared_view')}</Text>
            <Button
              size="xs"
              onClick={() => {
                if (shared) {
                  setMyPickConfig({ rows: shared.rows, columns: shared.columns });
                }
                window.location.href = window.location.pathname;
              }}
            >
              {t('mypick.make_own')}
            </Button>
          </HStack>
        )}

        <Dialog.Root
          open={resettingValues}
          onOpenChange={(e) => !e.open && setResettingValues(false)}
        >
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              w="full"
              maxW="md"
              mx="4"
              color="mypick.text"
              bgColor="mypick.panelSolid"
              overflow="clip"
            >
              <Stack gap="4" p={{ base: '4', md: '5' }}>
                <HStack justifyContent="space-between" pr="8">
                  <Dialog.Title>
                    <Text fontSize="xl" fontWeight="bold">
                      {t('mypick.reset_values')}
                    </Text>
                  </Dialog.Title>
                </HStack>
                <Text color="mypick.muted" fontSize="sm">
                  {t('mypick.reset_values_warning')}
                </Text>
                <HStack gap="2" justifyContent="flex-end">
                  <Button variant="ghost" onClick={() => setResettingValues(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      setMyPick({ cells: {}, config });
                      setResettingValues(false);
                    }}
                    color="white"
                    bgColor="accent.default"
                  >
                    {t('mypick.reset_values')}
                  </Button>
                </HStack>
              </Stack>
              <Dialog.CloseTrigger asChild position="absolute" top="3" right="3">
                <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
                  <FaXmark />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>

        <Dialog.Root
          open={resettingColumns}
          onOpenChange={(e) => !e.open && setResettingColumns(false)}
        >
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              w="full"
              maxW="md"
              mx="4"
              color="mypick.text"
              bgColor="mypick.panelSolid"
              overflow="clip"
            >
              <Stack gap="4" p={{ base: '4', md: '5' }}>
                <HStack justifyContent="space-between" pr="8">
                  <Dialog.Title>
                    <Text fontSize="xl" fontWeight="bold">
                      {t('mypick.reset_columns')}
                    </Text>
                  </Dialog.Title>
                </HStack>
                <Text color="mypick.muted" fontSize="sm">
                  {t('mypick.reset_columns_warning')}
                </Text>
                <HStack gap="2" justifyContent="flex-end">
                  <Button variant="ghost" onClick={() => setResettingColumns(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      setMyPick({
                        cells: {},
                        config: {
                          ...config,
                          columns: DEFAULT_CONFIG.columns
                        }
                      });
                      setResettingColumns(false);
                    }}
                    color="white"
                    bgColor="accent.default"
                  >
                    {t('mypick.reset_columns')}
                  </Button>
                </HStack>
              </Stack>
              <Dialog.CloseTrigger asChild position="absolute" top="3" right="3">
                <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
                  <FaXmark />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>

        <Dialog.Root
          open={changingRowCategory}
          onOpenChange={(e) => !e.open && setChangingRowCategory(false)}
        >
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              w="full"
              maxW="md"
              mx="4"
              color="mypick.text"
              bgColor="mypick.panelSolid"
              overflow="clip"
            >
              <Stack gap="4" p={{ base: '4', md: '5' }}>
                <HStack justifyContent="space-between" pr="8">
                  <Dialog.Title>
                    <Text fontSize="xl" fontWeight="bold">
                      {t('mypick.change_rows')}
                    </Text>
                  </Dialog.Title>
                </HStack>
                <Text color="mypick.muted" fontSize="sm">
                  {t('mypick.change_rows_warning')}
                </Text>
                <Stack gap="2">
                  {rowCategories.map((category) => (
                    <Button
                      key={category.key}
                      variant={pendingRowCategory === category.key ? 'subtle' : 'outline'}
                      onClick={() => setPendingRowCategory(category.key)}
                      justifyContent="space-between"
                      color={pendingRowCategory === category.key ? 'accent.default' : 'mypick.text'}
                      bgColor={
                        pendingRowCategory === category.key ? 'mypick.action' : 'mypick.tile'
                      }
                    >
                      <Text fontSize="sm" fontWeight="bold">
                        {category.label}
                      </Text>
                      <Text color="mypick.muted" fontSize="xs">
                        {category.count}
                      </Text>
                    </Button>
                  ))}
                </Stack>
                <HStack gap="2" justifyContent="flex-end">
                  <Button variant="ghost" onClick={() => setChangingRowCategory(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={applyRowCategory} color="white" bgColor="accent.default">
                    {t('mypick.replace_rows')}
                  </Button>
                </HStack>
              </Stack>
              <Dialog.CloseTrigger asChild position="absolute" top="3" right="3">
                <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
                  <FaXmark />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>

        <MyPickGrid
          ref={gridRef}
          myPick={shared ? shared.myPick : myPick}
          rows={config.rows}
          editable={!shared && editing}
          pickable={!shared}
          onPickCell={(row, column) => setPicking({ row, column })}
          onClearCell={(key) => setMyPickCell(key, null)}
          onRemoveRow={(row) =>
            updateConfig({ rows: config.rows.filter((r) => rowKey(r) !== rowKey(row)) })
          }
          onRemoveColumn={(column) =>
            updateConfig({
              columns: config.columns.filter((c) => columnKey(c) !== columnKey(column))
            })
          }
          onMoveRow={moveRow}
          onMoveColumn={moveColumn}
          onChangeRows={() => {
            setPendingRowCategory('series');
            setChangingRowCategory(true);
          }}
          onAddRow={() => setAddingRow(true)}
          onAddColumn={() => setAddingColumn(true)}
          isCellDisabled={(row, column) => getPickItems(row, column).length === 0}
          columns={config.columns}
        />

        {exporting && (
          <Box
            position="fixed"
            top="0"
            left="-10000px"
            w="fit-content"
            h="fit-content"
            overflow="visible"
            pointerEvents="none"
          >
            <MyPickGrid
              ref={exportGridRef}
              myPick={shared ? shared.myPick : myPick}
              rows={config.rows}
              exporting
              isCellDisabled={(row, column) => getPickItems(row, column).length === 0}
              columns={config.columns}
            />
          </Box>
        )}

        <PickDialog
          title={pickTitle}
          items={dialogItems}
          selectedIds={pickedId ? [pickedId] : []}
          max={1}
          open={picking !== undefined}
          onClose={() => setPicking(undefined)}
          onChange={(ids) => {
            if (picking) {
              setMyPickCell(cellKey(picking.row, picking.column), ids[ids.length - 1] ?? null);
              setPicking(undefined);
            }
          }}
          categories={
            (picking?.column.type === 'year' && picking.column.slot === 'song') ||
            (picking?.column.type === 'slot' && picking.column.slot === 'song')
              ? [
                  { key: 'group', label: t('mypick.row_group') },
                  { key: 'unit', label: t('mypick.row_unit') },
                  { key: 'solo', label: t('mypick.row_solo') },
                  { key: 'others', label: t('mypick.row_others') }
                ]
              : (picking?.column.type === 'year' && picking.column.slot === 'event') ||
                  (picking?.column.type === 'slot' && picking.column.slot === 'event')
                ? [
                    { key: 'with_image', label: t('mypick.with_image') },
                    { key: 'attended', label: t('events.status_attended') }
                  ]
                : undefined
          }
          defaultCategory={
            (picking?.column.type === 'year' && picking.column.slot === 'event') ||
            (picking?.column.type === 'slot' && picking.column.slot === 'event')
              ? 'attended'
              : undefined
          }
          display={
            (picking?.column.type === 'year' && picking.column.slot === 'song') ||
            (picking?.column.type === 'slot' && picking.column.slot === 'song')
              ? 'tiles'
              : 'auto'
          }
        />

        <Dialog.Root
          open={addingRow}
          onOpenChange={(e) => {
            if (!e.open) {
              setAddingRow(false);
            }
          }}
        >
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              display="flex"
              flexDirection="column"
              w="full"
              maxW="3xl"
              maxH="min(86dvh, 46rem)"
              mx="4"
              color="mypick.text"
              bgColor="mypick.panelSolid"
              overflow="hidden"
            >
              <Stack flex="1" gap="4" minH="0" p={{ base: '4', md: '5' }} overflow="hidden">
                <HStack justifyContent="space-between" pr="8">
                  <Dialog.Title>
                    <Text fontSize="xl" fontWeight="bold">
                      {t('mypick.add_row')}
                    </Text>
                  </Dialog.Title>
                </HStack>

                <Tabs.Root
                  value={rowCategory}
                  onValueChange={(e) => {
                    setRowCategory(e.value as RowCategory);
                    setRowSearch('');
                  }}
                  display="flex"
                  flex="1"
                  flexDirection="column"
                  minH="0"
                >
                  <Tabs.List
                    display="flex"
                    gap="1"
                    borderBottomWidth="1px"
                    borderBottomColor="mypick.border"
                    overflowX="auto"
                  >
                    {rowCategories.map((category) => (
                      <Tabs.Trigger
                        key={category.key}
                        value={category.key}
                        flex="0 0 auto"
                        minW="max-content"
                        px={{ base: '2', md: '3' }}
                        color={rowCategory === category.key ? 'accent.default' : 'mypick.muted'}
                        fontSize={{ base: '2xs', md: 'xs' }}
                        fontWeight="bold"
                      >
                        <Text as="span" display={{ base: 'inline', md: 'none' }}>
                          {category.key === 'group' ? t('mypick.row_group_short') : category.label}
                        </Text>
                        <Text as="span" display={{ base: 'none', md: 'inline' }}>
                          {category.label}
                        </Text>
                        <Text
                          as="span"
                          display={{ base: 'none', md: 'inline' }}
                          ml="1"
                          color="mypick.subtle"
                          fontSize="2xs"
                        >
                          {category.count}
                        </Text>
                      </Tabs.Trigger>
                    ))}
                    <Tabs.Indicator />
                  </Tabs.List>
                  <Stack flex="1" gap="3" minW="0" minH="0" pt="3" overflow="hidden">
                    {categoryRow && (
                      <HStack
                        {...(!categoryRowExists
                          ? clickable(() => addRow(categoryRow), anyRowLabel)
                          : { role: 'button', tabIndex: -1, 'aria-disabled': true })}
                        cursor={categoryRowExists ? 'not-allowed' : 'pointer'}
                        gap="3"
                        alignItems="center"
                        borderColor={categoryRowExists ? 'mypick.border' : 'mypick.borderStrong'}
                        borderRadius="l2"
                        borderWidth="1px"
                        minW="0"
                        minH="14"
                        py="2.5"
                        px="3"
                        bgColor={categoryRowExists ? 'mypick.tileDisabled' : 'mypick.action'}
                        opacity={categoryRowExists ? 0.56 : 1}
                        _hover={
                          categoryRowExists
                            ? undefined
                            : {
                                borderColor: 'mypick.borderStrong',
                                bgColor: 'mypick.accentSoft'
                              }
                        }
                      >
                        <Stack flex="1" gap="0" minW="0">
                          <Text color="mypick.text" fontSize="sm" fontWeight="bold" lineClamp={1}>
                            {anyRowLabel}
                          </Text>
                          <Text color="mypick.muted" fontSize="xs" lineClamp={1}>
                            {categoryRowExists ? t('mypick.already_added') : t('mypick.add_row')}
                          </Text>
                        </Stack>
                      </HStack>
                    )}
                    {rowCategory !== 'others' && (
                      <Input
                        value={rowSearch}
                        onChange={(e) => setRowSearch(e.currentTarget.value)}
                        placeholder={t('common.search')}
                        borderColor="mypick.border"
                        borderRadius="l2"
                        h="12"
                        minH="12"
                        px="4"
                        color="mypick.text"
                        fontSize="md"
                        bgColor="mypick.tile"
                      />
                    )}
                    {rowCategory !== 'others' && (
                      <Stack
                        gap="2"
                        minW="0"
                        h={{ base: '24rem', md: '28rem' }}
                        maxH="100%"
                        pr="1"
                        pb="1"
                        overflowY="auto"
                      >
                        {((rowCategory === 'series' && filteredSeriesRows.length === 0) ||
                          (rowCategory !== 'series' && filteredArtistRows.length === 0)) && (
                          <Text py="8" color="mypick.muted" fontSize="sm" textAlign="center">
                            {t('common.no_results')}
                          </Text>
                        )}
                        {rowCategory === 'series'
                          ? filteredSeriesRows.map((s) => {
                              const disabled = existingRows.has(
                                rowKey({ type: 'series', id: s.id })
                              );
                              return (
                                <HStack
                                  key={s.id}
                                  {...(!disabled
                                    ? clickable(() => addRow({ type: 'series', id: s.id }), s.name)
                                    : { role: 'button', tabIndex: -1, 'aria-disabled': true })}
                                  cursor={disabled ? 'not-allowed' : 'pointer'}
                                  gap="3"
                                  alignItems="center"
                                  borderColor="mypick.border"
                                  borderRadius="l2"
                                  borderWidth="1px"
                                  minW="0"
                                  minH="14"
                                  py="2.5"
                                  px="3"
                                  bgColor={disabled ? 'mypick.tileDisabled' : 'mypick.tile'}
                                  opacity={disabled ? 0.56 : 1}
                                  _hover={
                                    disabled
                                      ? undefined
                                      : {
                                          borderColor: 'mypick.borderStrong',
                                          bgColor: 'mypick.accentSoft'
                                        }
                                  }
                                >
                                  <Stack flex="1" gap="0" minW="0">
                                    <Text fontSize="sm" fontWeight="bold" lineClamp={1}>
                                      {s.name}
                                    </Text>
                                    <Text color="mypick.muted" fontSize="xs" lineClamp={1}>
                                      {disabled
                                        ? t('mypick.already_added')
                                        : t('mypick.row_series')}
                                    </Text>
                                  </Stack>
                                </HStack>
                              );
                            })
                          : filteredArtistRows.map((a) => {
                              const disabled = existingRows.has(
                                rowKey({ type: 'artist', id: a.id })
                              );
                              const label = localizedName(i18n.language, a.name, a.englishName);
                              return (
                                <HStack
                                  key={a.id}
                                  {...(!disabled
                                    ? clickable(() => addRow({ type: 'artist', id: a.id }), label)
                                    : { role: 'button', tabIndex: -1, 'aria-disabled': true })}
                                  cursor={disabled ? 'not-allowed' : 'pointer'}
                                  gap="3"
                                  alignItems="center"
                                  borderColor="mypick.border"
                                  borderRadius="l2"
                                  borderWidth="1px"
                                  minW="0"
                                  minH="14"
                                  py="2.5"
                                  px="3"
                                  bgColor={disabled ? 'mypick.tileDisabled' : 'mypick.tile'}
                                  opacity={disabled ? 0.56 : 1}
                                  _hover={
                                    disabled
                                      ? undefined
                                      : {
                                          borderColor: 'mypick.borderStrong',
                                          bgColor: 'mypick.accentSoft'
                                        }
                                  }
                                >
                                  <Stack flex="1" gap="0" minW="0">
                                    <Text
                                      color="mypick.text"
                                      fontSize="sm"
                                      fontWeight="bold"
                                      lineClamp={1}
                                    >
                                      {label}
                                    </Text>
                                    <Text color="mypick.muted" fontSize="xs" lineClamp={1}>
                                      {disabled ? t('mypick.already_added') : rowCategoryLabel}
                                    </Text>
                                  </Stack>
                                </HStack>
                              );
                            })}
                      </Stack>
                    )}
                  </Stack>
                </Tabs.Root>
              </Stack>
              <Dialog.CloseTrigger asChild position="absolute" top="3" right="3">
                <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
                  <FaXmark />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>

        <Dialog.Root open={addingColumn} onOpenChange={(e) => !e.open && setAddingColumn(false)}>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              w="full"
              maxW="lg"
              mx="4"
              color="mypick.text"
              bgColor="mypick.panelSolid"
              overflow="clip"
            >
              <Stack gap="4" p={{ base: '4', md: '5' }}>
                <HStack justifyContent="space-between" pr="8">
                  <Dialog.Title>
                    <Text fontSize="xl" fontWeight="bold">
                      {t('mypick.add_column')}
                    </Text>
                  </Dialog.Title>
                </HStack>

                <Stack gap="4">
                  <Grid gap="2" gridTemplateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }}>
                    {columnChoices.map((choice) => {
                      const selected = columnKind === choice.key;
                      return (
                        <HStack
                          key={choice.key}
                          {...clickable(() => {
                            setColumnKind(choice.key);
                            if (choice.key === 'member') setColumnYear('');
                          }, choice.label)}
                          cursor="pointer"
                          gap="3"
                          alignItems="flex-start"
                          borderColor={selected ? 'mypick.borderStrong' : 'mypick.border'}
                          borderRadius="l2"
                          borderWidth="1px"
                          minH="18"
                          p="3"
                          color={selected ? 'accent.default' : 'mypick.text'}
                          bgColor={selected ? 'mypick.action' : 'mypick.tile'}
                          _hover={{
                            borderColor: 'mypick.borderStrong',
                            bgColor: 'mypick.accentSoft'
                          }}
                        >
                          <Box flexShrink={0} mt="0.5">
                            {choice.icon}
                          </Box>
                          <Stack gap="0.5" minW="0">
                            <Text fontSize="sm" fontWeight="bold" lineClamp={1}>
                              {choice.label}
                            </Text>
                            <Text color="mypick.muted" fontSize="xs" lineClamp={2}>
                              {choice.sub}
                            </Text>
                          </Stack>
                        </HStack>
                      );
                    })}
                  </Grid>

                  {columnKind !== 'member' && (
                    <Stack gap="2">
                      <Text color="mypick.muted" fontSize="xs" fontWeight="bold">
                        {t('mypick.column_year_optional')}
                      </Text>
                      <Field.Select
                        value={columnYear}
                        onChange={(e) => setColumnYear(e.currentTarget.value)}
                        borderColor="mypick.border"
                        borderRadius="l2"
                        borderWidth="1px"
                        h="12"
                        px="3"
                        color="mypick.text"
                        bgColor="mypick.tile"
                      >
                        <option value="">{t('mypick.column_year_all')}</option>
                        {columnYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </Field.Select>
                    </Stack>
                  )}

                  <Button
                    disabled={selectedColumnExists}
                    onClick={addSelectedColumn}
                    justifyContent="center"
                    color={selectedColumnExists ? 'mypick.subtle' : 'white'}
                    bgColor={selectedColumnExists ? 'mypick.tileDisabled' : 'accent.default'}
                  >
                    {selectedColumnExists ? t('mypick.already_added') : t('mypick.add_column')}
                  </Button>
                </Stack>
              </Stack>
              <Dialog.CloseTrigger asChild position="absolute" top="2" right="2">
                <IconButton aria-label={t('common.close')} variant="ghost" size="sm">
                  <FaXmark />
                </IconButton>
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </Stack>
    </>
  );
}
