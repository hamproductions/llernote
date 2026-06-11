import { Fragment, forwardRef, useState } from 'react';
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
import { clickable } from '~/utils/clickable';
import { useColumnCount } from '~/hooks/useColumnCount';
import { cellKey, columnKey, rowKey } from '~/types/attendance';
import type { MyPick, MyPickColumn, MyPickRow } from '~/types/attendance';

function CellImage({
  src,
  dim = false,
  top = false
}: {
  src: string;
  dim?: boolean;
  top?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Box
      style={{ aspectRatio: '1 / 1' }}
      borderRadius="l2"
      w="full"
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
          style={{
            objectFit: 'cover',
            objectPosition: top ? 'top' : 'center',
            width: '100%',
            height: '100%'
          }}
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
      <Stack gap="1.5" alignItems="center" w="full">
        <CellImage src={getPicUrl(character.id, 'character')} top />
        <Text fontSize="2xs" fontWeight="bold" textAlign="center">
          {localizedName(i18n.language, character.fullName, character.englishName)}
        </Text>
      </Stack>
    );
  }
  if (column.slot === 'song') {
    const song = songById.get(pickedId);
    if (!song) return null;
    return (
      <Stack gap="1.5" alignItems="center" w="full">
        <CellImage src={getPicUrl(song.id, 'thumbnail')} />
        <Text fontSize="2xs" fontWeight="bold" textAlign="center">
          {localizedName(i18n.language, song.name, song.englishName)}
        </Text>
      </Stack>
    );
  }
  const performance = performanceById.get(pickedId);
  if (!performance) return null;
  return (
    <Stack
      gap="1"
      justifyContent="center"
      alignItems="center"
      borderRadius="l2"
      w="full"
      h="full"
      minH="20"
      p="2"
      textAlign="center"
      bgColor="accent.a2"
    >
      <Text textStyle="display" color="accent.default" fontSize="sm" lineHeight="1">
        {performance.date}
      </Text>
      <Text fontSize="2xs" fontWeight="bold">
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
    onAddRow?: () => void;
    onAddColumn?: () => void;
    exporting?: boolean;
  }
>(function MyPickGrid(
  {
    myPick,
    rows,
    columns,
    editable = false,
    onPickCell,
    onClearCell,
    onRemoveRow,
    onRemoveColumn,
    onAddRow,
    onAddColumn,
    exporting = false
  },
  ref
) {
  const { t } = useTranslation();
  const viewportColumns = useColumnCount();
  const compact = viewportColumns === 1 && !exporting;
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
      w={exporting ? 'fit-content' : 'full'}
      p={{ base: '2.5', md: '4' }}
      bgColor="bg.default"
      overflowX="auto"
    >
      <Stack gap="3" minW="fit-content">
        <HStack justifyContent="space-between" alignItems="baseline">
          <Text
            textStyle="display"
            style={
              exporting
                ? undefined
                : {
                    background: 'linear-gradient(92deg, #e4007f 10%, #ff7a00 55%, #00a0e0 95%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }
            }
            color="accent.default"
            fontSize="2xl"
            whiteSpace="nowrap"
          >
            MY PICK
          </Text>
          <Text color="fg.subtle" fontSize="xs">
            {t('stats.generated_by')}
          </Text>
        </HStack>
        <Grid
          style={{
            gridTemplateColumns: compact
              ? `minmax(3.25rem, 4.5rem) repeat(${columns.length}, minmax(0, 1fr))${editable ? ' 1.75rem' : ''}`
              : `minmax(5rem, 6.5rem) repeat(${columns.length}, minmax(7.5rem, 10.5rem))${editable ? ' 2.25rem' : ''}`,
            justifyContent: 'center'
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
          {editable && onAddColumn && (
            <IconButton
              aria-label={t('mypick.add_column')}
              title={t('mypick.add_column')}
              variant="outline"
              size="xs"
              onClick={onAddColumn}
              alignSelf="center"
            >
              <FaPlus />
            </IconButton>
          )}
          {rows.map((row) => {
            const meta = rowMeta(row);
            return (
              <Fragment key={rowKey(row)}>
                <HStack
                  style={{ backgroundColor: meta.color }}
                  position="relative"
                  gap="1"
                  justifyContent="center"
                  borderRadius="l2"
                  py="1"
                  px="2"
                >
                  <Text
                    textStyle="display"
                    title={meta.full}
                    style={{ color: 'white' }}
                    fontSize="xs"
                    textAlign="center"
                    whiteSpace="nowrap"
                  >
                    {meta.label}
                  </Text>
                  {editable && onRemoveRow && (
                    <IconButton
                      aria-label={t('common.delete')}
                      variant="ghost"
                      size="xs"
                      onClick={() => onRemoveRow(row)}
                      style={{ color: 'rgba(255,255,255,0.85)' }}
                      position="absolute"
                      top="-1.5"
                      right="-1.5"
                      minW="4"
                      h="4"
                    >
                      <FaXmark size={10} />
                    </IconButton>
                  )}
                </HStack>
                {columns.map((col) => {
                  const key = cellKey(row, col);
                  const pickedId = myPick?.cells?.[key] ?? null;
                  return (
                    <Box
                      key={key}
                      {...(editable
                        ? clickable(
                            () => onPickCell?.(row, col),
                            `${rowMeta(row).label} ${columnLabel(col)}`
                          )
                        : {})}
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
                      ) : editable ? (
                        <Stack
                          gap="1"
                          justifyContent="center"
                          alignItems="center"
                          h="full"
                          color="fg.subtle"
                        >
                          <FaPlus size={11} />
                          <Text fontSize="2xs">{t(`mypick.slot_${col.slot}`)}</Text>
                        </Stack>
                      ) : null}
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
                })}
                {editable && <Box />}
              </Fragment>
            );
          })}
          {editable && onAddRow && (
            <Box style={{ gridColumn: '1 / -1' }}>
              <HStack
                {...clickable(onAddRow, t('mypick.add_row'))}
                cursor="pointer"
                gap="2"
                justifyContent="center"
                borderColor="border.default"
                borderRadius="l2"
                borderWidth="1px"
                py="2"
                color="fg.muted"
                transition="colors"
                borderStyle="dashed"
                _hover={{ borderColor: 'accent.8', color: 'accent.default' }}
              >
                <FaPlus size={11} />
                <Text fontSize="xs" fontWeight="medium">
                  {t('mypick.add_row')}
                </Text>
              </HStack>
            </Box>
          )}
        </Grid>
      </Stack>
    </Box>
  );
});
