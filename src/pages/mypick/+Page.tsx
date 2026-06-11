import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaLink } from 'react-icons/fa6';
import { HStack, Stack } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { PickDialog, type PickItem } from '~/components/mypick/PickDialog';
import { MyPickGrid } from '~/components/mypick/MyPickGrid';
import { Metadata } from '~/components/layout/Metadata';
import { useMyPick } from '~/hooks/useAttendance';
import {
  useArtistById,
  useArtists,
  useCharacters,
  usePerformances,
  useSeries,
  useSetlists,
  useSongById,
  useSongs
} from '~/hooks/useData';
import { setMyPickCell, setMyPickConfig } from '~/utils/attendance/storage';
import { buildPerformanceCharacterMap } from '~/utils/performance-cast';
import { getPicUrl } from '~/utils/assets';
import { hasSongThumb } from '~/utils/song-thumbs';
import { localizedName } from '~/utils/names';
import { copyTextToClipboard, downloadElementAsImage } from '~/utils/share';
import { decodeMyPick, encodeMyPick, myPickShareUrl } from '~/utils/mypick-share';
import { useToaster } from '~/context/ToasterContext';
import { cellKey, columnKey, rowKey } from '~/types/attendance';
import type { MyPickColumn, MyPickConfig, MyPickRow, MyPickSlot } from '~/types/attendance';

const DEFAULT_CONFIG: MyPickConfig = {
  rows: Array.from({ length: 8 }, (_, i) => ({ type: 'series', id: String(i + 1) })),
  columns: [
    { type: 'slot', slot: 'cast' },
    { type: 'slot', slot: 'song' },
    { type: 'slot', slot: 'event' }
  ]
};

export default function Page() {
  const { t, i18n } = useTranslation();
  const { toast } = useToaster();
  const { myPick } = useMyPick();
  const series = useSeries();
  const artists = useArtists();
  const artistById = useArtistById();
  const characters = useCharacters();
  const songs = useSongs();
  const songById = useSongById();
  const performances = usePerformances();
  const setlists = useSetlists();
  const gridRef = useRef<HTMLDivElement>(null);
  const [picking, setPicking] = useState<{ row: MyPickRow; column: MyPickColumn }>();
  const [addingRow, setAddingRow] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [shared, setShared] = useState<ReturnType<typeof decodeMyPick>>(null);

  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get('d');
    if (d) setShared(decodeMyPick(d));
  }, []);

  const config = shared
    ? { rows: shared.rows, columns: shared.columns }
    : (myPick?.config ?? DEFAULT_CONFIG);

  const performanceCharacters = useMemo(
    () => buildPerformanceCharacterMap(setlists, songById, artistById),
    [setlists, songById, artistById]
  );

  const dialogItems: PickItem[] = useMemo(() => {
    if (!picking) return [];
    const { row, column } = picking;
    const rowCharacterIds =
      row.type === 'artist' ? new Set(artistById.get(row.id)?.characters ?? []) : null;
    const year = column.type === 'year' ? String(column.year) : null;

    if (column.slot === 'cast') {
      return characters
        .filter((c) => (rowCharacterIds ? rowCharacterIds.has(c.id) : c.seriesId === row.id))
        .map((c) => ({
          id: c.id,
          label: localizedName(i18n.language, c.fullName, c.englishName),
          sub: c.casts
            .map((cast) => localizedName(i18n.language, cast.seiyuu, cast.englishName))
            .join('・'),
          image: getPicUrl(c.id, c.hasIcon ? 'icons' : 'character')
        }));
    }
    if (column.slot === 'song') {
      return songs
        .filter((s) => {
          if (year && !(s.releasedOn ?? '').startsWith(year)) return false;
          if (rowCharacterIds) return (s.artists ?? []).some((a) => a.id === row.id);
          return s.seriesIds.map(String).includes(row.id);
        })
        .map((s) => ({
          id: s.id,
          label: localizedName(i18n.language, s.name, s.englishName),
          sub: s.releasedOn,
          image: hasSongThumb(s.id) ? getPicUrl(s.id, 'thumbnail') : undefined
        }));
    }
    return performances
      .filter((p) => {
        if (year && !p.date.startsWith(year)) return false;
        if (rowCharacterIds) {
          const cast = performanceCharacters.get(p.id);
          if (!cast) return false;
          return [...rowCharacterIds].some((id) => cast.has(id));
        }
        return p.seriesIds.includes(row.id);
      })
      .map((p) => ({ id: p.id, label: p.tourName, sub: `${p.date} ${p.venue}` }));
  }, [picking, characters, songs, performances, artistById, performanceCharacters, i18n.language]);

  const rowItems: PickItem[] = useMemo(() => {
    const existing = new Set(config.rows.map((r) => `${r.type}:${r.id}`));
    return [
      ...series.map((s) => ({ id: `series:${s.id}`, label: s.name, sub: t('mypick.row_series') })),
      ...artists.map((a) => ({
        id: `artist:${a.id}`,
        label: localizedName(i18n.language, a.name, a.englishName),
        sub: a.characters.length > 1 ? t('mypick.row_group') : t('mypick.row_solo')
      }))
    ].map((item) =>
      existing.has(item.id) ? { ...item, sub: t('mypick.already_added'), disabled: true } : item
    );
  }, [series, artists, i18n.language, config.rows, t]);

  const updateConfig = (patch: Partial<MyPickConfig>) => {
    setMyPickConfig({ ...config, ...patch });
  };

  const addColumn = (column: MyPickColumn) => {
    if (config.columns.some((c) => columnKey(c) === columnKey(column))) return;
    updateConfig({ columns: [...config.columns, column] });
  };

  const yearColumns = config.columns.filter((c) => c.type === 'year');
  const minYear = yearColumns.length ? Math.min(...yearColumns.map((c) => c.year)) : null;
  const maxYear = yearColumns.length ? Math.max(...yearColumns.map((c) => c.year)) : null;
  const currentYear = new Date().getFullYear();

  const addYear = (side: 'left' | 'right', slot: MyPickSlot) => {
    if (yearColumns.length === 0) {
      addColumn({ type: 'year', year: currentYear, slot });
      return;
    }
    const year = side === 'left' ? minYear! - 1 : maxYear! + 1;
    const column: MyPickColumn = { type: 'year', year, slot };
    updateConfig({
      columns:
        side === 'left'
          ? config.columns.flatMap((c) =>
              c.type === 'year' && c.year === minYear ? [column, c] : [c]
            )
          : [...config.columns, column]
    });
  };

  const pickedId = picking ? (myPick?.cells?.[cellKey(picking.row, picking.column)] ?? null) : null;

  const columnItems: PickItem[] = useMemo(() => {
    const slots: MyPickSlot[] = ['cast', 'song', 'event'];
    const existingSlots = new Set(
      config.columns.filter((c) => c.type === 'slot').map((c) => c.slot)
    );
    return [
      ...slots.map((slot) => ({
        id: `slot:${slot}`,
        label: t(`mypick.slot_${slot}`),
        sub: existingSlots.has(slot) ? t('mypick.already_added') : t('mypick.column_slot_sub'),
        disabled: existingSlots.has(slot)
      })),
      ...slots.map((slot) => ({
        id: `year-right:${slot}`,
        label: `${maxYear != null ? maxYear + 1 : currentYear} ${t(`mypick.slot_${slot}`)}`,
        sub: t('mypick.column_year_sub')
      })),
      ...(yearColumns.length > 0
        ? slots.map((slot) => ({
            id: `year-left:${slot}`,
            label: `${minYear! - 1} ${t(`mypick.slot_${slot}`)}`,
            sub: t('mypick.column_year_sub')
          }))
        : [])
    ];
  }, [config.columns, yearColumns.length, minYear, maxYear, currentYear, t]);

  return (
    <>
      <Metadata title={`${t('mypick.title')} - LLerNote`} helmet />
      <Stack gap="3">
        <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <Stack gap="0">
            <Heading as="h1" fontSize="2xl">
              {t('mypick.title')}
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              {t('mypick.description')}
            </Text>
          </Stack>
          <HStack gap="2">
            {!shared && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const encoded = encodeMyPick(
                    myPick ?? { cells: {}, updatedAt: '' },
                    config.rows,
                    config.columns
                  );
                  try {
                    await copyTextToClipboard(myPickShareUrl(encoded));
                    toast({ title: t('share.copied'), type: 'success' });
                  } catch {
                    toast({ title: t('share.copy_failed'), type: 'error' });
                  }
                }}
              >
                <FaLink />
                {t('mypick.share_url')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={async () => {
                if (!gridRef.current) return;
                setExporting(true);
                await new Promise((resolve) =>
                  requestAnimationFrame(() => setTimeout(resolve, 50))
                );
                try {
                  await downloadElementAsImage(gridRef.current, 'llernote-mypick.png');
                  toast({ title: t('share.image_generated'), type: 'success' });
                } finally {
                  setExporting(false);
                }
              }}
            >
              <FaDownload />
              {t('mypick.generate_image')}
            </Button>
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
            <Button size="xs" onClick={() => (window.location.href = window.location.pathname)}>
              {t('mypick.make_own')}
            </Button>
          </HStack>
        )}
        <MyPickGrid
          ref={gridRef}
          myPick={shared ? shared.myPick : myPick}
          rows={config.rows}
          editable={!shared && !exporting}
          exporting={exporting}
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
          onAddRow={() => setAddingRow(true)}
          onAddColumn={() => setAddingColumn(true)}
          columns={config.columns}
        />

        <PickDialog
          title={picking ? t(`mypick.slot_${picking.column.slot}`) : ''}
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
        />

        <PickDialog
          title={t('mypick.add_row')}
          items={rowItems}
          selectedIds={[]}
          max={1}
          open={addingRow}
          onClose={() => setAddingRow(false)}
          onChange={(ids) => {
            const ref = ids[ids.length - 1];
            if (ref) {
              const [type, id] = ref.split(':') as [MyPickRow['type'], string];
              if (!config.rows.some((r) => r.type === type && r.id === id)) {
                updateConfig({ rows: [...config.rows, { type, id }] });
              }
            }
            setAddingRow(false);
          }}
        />

        <PickDialog
          title={t('mypick.add_column')}
          items={columnItems}
          selectedIds={[]}
          max={1}
          open={addingColumn}
          onClose={() => setAddingColumn(false)}
          onChange={(ids) => {
            const ref = ids[ids.length - 1];
            if (ref) {
              const [kind, slot] = ref.split(':') as [string, MyPickSlot];
              if (kind === 'slot') addColumn({ type: 'slot', slot });
              else if (kind === 'year-right') addYear('right', slot);
              else addYear('left', slot);
            }
            setAddingColumn(false);
          }}
        />
      </Stack>
    </>
  );
}
