import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaMusic, FaPlus, FaXmark } from 'react-icons/fa6';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { IconButton } from '~/components/ui/icon-button';
import {
  useArtistById,
  useCharacters,
  usePerformanceById,
  useSeriesById,
  useSongById
} from '~/hooks/useData';
import { getPicUrl } from '~/utils/assets';
import { getSeriesShortName } from '~/utils/series-short';
import { localizedName } from '~/utils/names';
import { cellKey, columnKey, rowKey } from '~/types/attendance';
import type { MyPick, MyPickColumn, MyPickRow } from '~/types/attendance';

function CellImage({ src, dim = false }: { src: string; dim?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <Box
      flexShrink={0}
      borderRadius="full"
      w="12"
      h="12"
      bgColor="bg.subtle"
      opacity={dim ? 0.5 : 1}
      overflow="hidden"
    >
      {failed ? (
        <Center w="full" h="full" color="fg.subtle">
          <FaMusic />
        </Center>
      ) : (
        <img
          src={src}
          alt=""
          width="48"
          height="48"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setFailed(true)}
        />
      )}
    </Box>
  );
}

function CellContent({ column, pickedId }: { column: MyPickColumn; pickedId: string }) {
  const { i18n } = useTranslation();
  const characters = useCharacters();
  const songById = useSongById();
  const performanceById = usePerformanceById();

  if (column.slot === 'cast') {
    const character = characters.find((c) => c.id === pickedId);
    if (!character) return null;
    return (
      <Stack gap="1" alignItems="center">
        <CellImage src={getPicUrl(character.id, character.hasIcon ? 'icons' : 'character')} />
        <Text fontSize="2xs" fontWeight="semibold" textAlign="center" lineClamp={2}>
          {localizedName(i18n.language, character.fullName, character.englishName)}
        </Text>
      </Stack>
    );
  }
  if (column.slot === 'song') {
    const song = songById.get(pickedId);
    if (!song) return null;
    return (
      <Stack gap="1" alignItems="center">
        <CellImage src={getPicUrl(song.id, 'thumbnail')} />
        <Text fontSize="2xs" fontWeight="semibold" textAlign="center" lineClamp={2}>
          {localizedName(i18n.language, song.name, song.englishName)}
        </Text>
      </Stack>
    );
  }
  const performance = performanceById.get(pickedId);
  if (!performance) return null;
  return (
    <Stack gap="0.5" justifyContent="center" h="full">
      <Text color="fg.muted" fontSize="2xs" fontVariantNumeric="tabular-nums">
        {performance.date}
      </Text>
      <Text fontSize="2xs" fontWeight="semibold" lineClamp={3}>
        {performance.tourName}
      </Text>
    </Stack>
  );
}

export const MyPickGrid = forwardRef<
  HTMLDivElement,
  {
    myPick: MyPick | null;
    rows: MyPickRow[];
    columns: MyPickColumn[];
    editable?: boolean;
    onPickCell?: (row: MyPickRow, column: MyPickColumn) => void;
    onClearCell?: (key: string) => void;
    onRemoveRow?: (row: MyPickRow) => void;
    onRemoveColumn?: (column: MyPickColumn) => void;
  }
>(function MyPickGrid(
  { myPick, rows, columns, editable = false, onPickCell, onClearCell, onRemoveRow, onRemoveColumn },
  ref
) {
  const { t } = useTranslation();
  const seriesById = useSeriesById();
  const artistById = useArtistById();

  const columnLabel = (col: MyPickColumn) =>
    col.type === 'slot'
      ? t(`mypick.slot_${col.slot}`)
      : `${col.year} ${t(`mypick.slot_${col.slot}`)}`;

  const rowMeta = (row: MyPickRow) => {
    if (row.type === 'series') {
      const series = seriesById.get(row.id);
      return {
        label: series ? getSeriesShortName(series.id, series.name) : row.id,
        full: series?.name ?? row.id,
        color: series?.color ?? '#e4007f'
      };
    }
    const artist = artistById.get(row.id);
    const color = seriesById.get(String(artist?.seriesIds[0] ?? ''))?.color ?? '#e4007f';
    return { label: artist?.name ?? row.id, full: artist?.name ?? row.id, color };
  };

  return (
    <Box
      ref={ref}
      borderColor="accent.default"
      borderRadius="l3"
      borderWidth="2px"
      w="full"
      p="4"
      bgColor="bg.default"
      overflowX="auto"
    >
      <Stack gap="3" minW="fit-content">
        <HStack justifyContent="space-between" alignItems="baseline">
          <Text color="accent.default" fontSize="xl" fontWeight="bold">
            MY PICK
          </Text>
          <Text color="fg.subtle" fontSize="xs">
            {t('stats.generated_by')}
          </Text>
        </HStack>
        <Grid
          style={{
            gridTemplateColumns: `minmax(6rem, 8rem) repeat(${columns.length}, minmax(7rem, 1fr))`
          }}
          gap="1.5"
          alignItems="stretch"
        >
          <Box />
          {columns.map((col) => (
            <HStack key={columnKey(col)} gap="1" justifyContent="center" alignItems="center">
              <Text
                color="fg.muted"
                fontSize="2xs"
                fontWeight="bold"
                textAlign="center"
                textTransform="uppercase"
              >
                {columnLabel(col)}
              </Text>
              {editable && onRemoveColumn && (
                <IconButton
                  aria-label={t('common.delete')}
                  variant="ghost"
                  size="xs"
                  onClick={() => onRemoveColumn(col)}
                  minW="4"
                  h="4"
                  color="fg.subtle"
                >
                  <FaXmark size={10} />
                </IconButton>
              )}
            </HStack>
          ))}
          {rows.map((row) => {
            const meta = rowMeta(row);
            return [
              <HStack
                key={`${rowKey(row)}-label`}
                style={{
                  backgroundColor: `${meta.color}22`,
                  borderLeft: `4px solid ${meta.color}`
                }}
                gap="1"
                justifyContent="space-between"
                borderRadius="l2"
                py="1"
                px="2"
              >
                <Text
                  title={meta.full}
                  style={{ color: meta.color }}
                  fontSize="xs"
                  fontWeight="bold"
                  lineClamp={2}
                >
                  {meta.label}
                </Text>
                {editable && onRemoveRow && (
                  <IconButton
                    aria-label={t('common.delete')}
                    variant="ghost"
                    size="xs"
                    onClick={() => onRemoveRow(row)}
                    minW="4"
                    h="4"
                    color="fg.subtle"
                  >
                    <FaXmark size={10} />
                  </IconButton>
                )}
              </HStack>,
              ...columns.map((col) => {
                const key = cellKey(row, col);
                const pickedId = myPick?.cells?.[key] ?? null;
                return (
                  <Box
                    key={key}
                    onClick={() => editable && onPickCell?.(row, col)}
                    cursor={editable ? 'pointer' : undefined}
                    position="relative"
                    borderColor="border.subtle"
                    borderRadius="l2"
                    borderWidth="1px"
                    minH="20"
                    p="1.5"
                    bgColor="bg.default"
                    _hover={editable ? { borderColor: 'accent.8' } : undefined}
                  >
                    {pickedId ? (
                      <CellContent column={col} pickedId={pickedId} />
                    ) : (
                      <Stack
                        gap="0.5"
                        justifyContent="center"
                        alignItems="center"
                        h="full"
                        color="fg.subtle"
                      >
                        <FaPlus size={10} />
                      </Stack>
                    )}
                    {editable && pickedId && (
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearCell?.(key);
                        }}
                        cursor="pointer"
                        position="absolute"
                        top="1"
                        right="1"
                        color="fg.subtle"
                        _hover={{ color: 'fg.default' }}
                      >
                        <FaXmark size={11} />
                      </Box>
                    )}
                  </Box>
                );
              })
            ];
          })}
        </Grid>
      </Stack>
    </Box>
  );
});
