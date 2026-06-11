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
import { cellKey, columnKey, rowKey } from '~/types/attendance';
import type { MyPick, MyPickColumn, MyPickRow } from '~/types/attendance';

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value = parseInt(
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized,
    16
  );
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

const rowTone = (color: string) => {
  const { r, g, b } = hexToRgb(color);
  return {
    bg: `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0.16), rgba(255, 255, 255, 0.72))`,
    border: `rgba(${r}, ${g}, ${b}, 0.28)`,
    text: `rgb(${Math.max(r - 58, 35)}, ${Math.max(g - 58, 35)}, ${Math.max(b - 58, 35)})`
  };
};

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
      inset="0"
      position="absolute"
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
          width="200"
          height="200"
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
      <>
        <CellImage src={getPicUrl(character.id, 'character')} top />
        <Box insetX="0" position="absolute" bottom="0" p="2" bgColor="black.a8">
          <Text color="white" fontSize="2xs" fontWeight="bold" textAlign="center" lineClamp={2}>
            {localizedName(i18n.language, character.fullName, character.englishName)}
          </Text>
        </Box>
      </>
    );
  }
  if (column.slot === 'song') {
    const song = songById.get(pickedId);
    if (!song) return null;
    return (
      <>
        <CellImage src={getPicUrl(song.id, 'thumbnail')} />
        <Box insetX="0" position="absolute" bottom="0" p="2" bgColor="black.a8">
          <Text color="white" fontSize="2xs" fontWeight="bold" textAlign="center" lineClamp={2}>
            {localizedName(i18n.language, song.name, song.englishName)}
          </Text>
        </Box>
      </>
    );
  }
  const performance = performanceById.get(pickedId);
  if (!performance) return null;
  return (
    <Stack
      inset="0"
      position="absolute"
      gap="2"
      justifyContent="center"
      alignItems="center"
      p="3"
      textAlign="center"
      bgColor="white"
    >
      <Text textStyle="display" color="accent.default" fontSize="sm" lineHeight="1">
        {performance.date}
      </Text>
      <Text fontSize="2xs" fontWeight="bold" lineClamp={5}>
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
  const seriesById = useSeriesById();
  const artistById = useArtistById();
  const exportColumnWidth = 200;
  const exportLabelWidth = 192;
  const exportGap = 24;
  const exportWidth =
    exportLabelWidth + columns.length * exportColumnWidth + columns.length * exportGap;

  const columnLabel = (col: MyPickColumn) =>
    col.type === 'slot'
      ? t(`mypick.slot_${col.slot}`)
      : `${col.year} ${t(`mypick.slot_${col.slot}`)}`;

  const rowMeta = (row: MyPickRow) => {
    if (row.type === 'series') {
      const series = seriesById.get(row.id);
      const color = series?.color ?? '#e4007f';
      return {
        label: series ? getSeriesShortName(series.id, series.name) : row.id,
        sub: series?.name ?? row.id,
        color,
        tone: rowTone(color)
      };
    }
    const artist = artistById.get(row.id);
    const color = seriesById.get(String(artist?.seriesIds[0] ?? ''))?.color ?? '#e4007f';
    return {
      label: artist?.name ?? row.id,
      sub: artist?.englishName ?? t('mypick.row_group'),
      color,
      tone: rowTone(color)
    };
  };

  if (rows.length === 0 || columns.length === 0) {
    return (
      <Box
        ref={ref}
        borderColor="accent.default"
        borderRadius="l3"
        borderWidth="2px"
        w="full"
        p="8"
        bgColor="white"
      >
        <Stack gap="3" alignItems="center">
          <Text color="fg.muted" fontSize="sm">
            {t('mypick.empty')}
          </Text>
          {editable && (
            <HStack gap="2">
              {columns.length === 0 && onAddColumn && (
                <IconButton
                  aria-label={t('mypick.add_column')}
                  variant="outline"
                  onClick={onAddColumn}
                >
                  <FaPlus />
                </IconButton>
              )}
              {rows.length === 0 && onAddRow && (
                <IconButton aria-label={t('mypick.add_row')} variant="outline" onClick={onAddRow}>
                  <FaPlus />
                </IconButton>
              )}
            </HStack>
          )}
        </Stack>
      </Box>
    );
  }

  const gridColumns = exporting
    ? `${exportLabelWidth}px repeat(${columns.length}, ${exportColumnWidth}px)`
    : `minmax(4.25rem, 0.82fr) repeat(${columns.length}, minmax(0, 1fr))`;

  return (
    <Box
      ref={ref}
      style={{ backdropFilter: exporting ? undefined : 'blur(18px)' }}
      position="relative"
      borderColor="black.a1"
      borderRadius={{ base: '2xl', md: '3xl' }}
      borderWidth="1px"
      w={exporting ? `${exportWidth}px` : 'full'}
      maxW={exporting ? undefined : '7xl'}
      mx="auto"
      p={exporting ? '8' : { base: '3', md: '8' }}
      bgColor="rgba(255, 255, 255, 0.78)"
      boxShadow="xl"
      overflow="hidden"
    >
      <Box
        style={{ background: 'rgba(236, 72, 153, 0.04)', filter: 'blur(48px)' }}
        position="absolute"
        top="-24"
        right="-20"
        borderRadius="full"
        w="96"
        h="96"
        pointerEvents="none"
      />
      <Box
        style={{ background: 'rgba(6, 182, 212, 0.04)', filter: 'blur(48px)' }}
        position="absolute"
        left="-20"
        bottom="-24"
        borderRadius="full"
        w="96"
        h="96"
        pointerEvents="none"
      />
      <Stack zIndex="1" position="relative" gap={exporting ? '6' : { base: '3.5', md: '6' }}>
        {exporting && (
          <Stack gap="1" alignItems="center" textAlign="center">
            <Text
              textStyle="display"
              color="fg.default"
              fontSize="4xl"
              letterSpacing="0.04em"
              textTransform="uppercase"
            >
              My Pick LLerNote
            </Text>
            <Text color="fg.muted" fontSize="sm" letterSpacing="0.18em">
              LoveLive! favorites collection
            </Text>
          </Stack>
        )}
        <Grid
          style={{ gridTemplateColumns: gridColumns }}
          gap={exporting ? `${exportGap}px` : { base: '2', md: '4' }}
          alignItems="end"
        >
          <Stack gap="0.5" justifyContent="end" alignItems="flex-start" pb="1">
            <Text
              textStyle="display"
              color="fg.default"
              fontSize={{ base: '2xs', sm: 'xs', md: 'md' }}
              letterSpacing="0.08em"
              lineHeight="1"
              textTransform="uppercase"
            >
              Selections
            </Text>
          </Stack>
          {columns.map((col) => (
            <HStack
              key={columnKey(col)}
              position="relative"
              gap="1"
              justifyContent="center"
              alignItems="center"
              py="1"
            >
              <Stack gap="0" alignItems="center" minW="0">
                <Text
                  textStyle="display"
                  color="fg.default"
                  fontSize={{ base: '2xs', sm: 'xs', md: 'lg' }}
                  lineHeight="1.1"
                  textAlign="center"
                  lineClamp={2}
                >
                  {columnLabel(col)}
                </Text>
                {col.type === 'year' && (
                  <Text
                    color="fg.muted"
                    fontSize={{ base: '3xs', md: '2xs' }}
                    letterSpacing="0.1em"
                    lineHeight="1.1"
                    textTransform="uppercase"
                  >
                    {col.year}
                  </Text>
                )}
              </Stack>
              {editable && onRemoveColumn && columns.length > 1 && (
                <IconButton
                  aria-label={t('common.delete')}
                  variant="ghost"
                  size="xs"
                  onClick={() => onRemoveColumn(col)}
                  position="absolute"
                  top="-2"
                  right="-2"
                  minW="4"
                  h="4"
                  color="fg.subtle"
                >
                  <FaXmark size={10} />
                </IconButton>
              )}
            </HStack>
          ))}
        </Grid>

        <Stack gap={exporting ? '4' : { base: '2', md: '4' }}>
          {rows.map((row) => {
            const meta = rowMeta(row);
            return (
              <Grid
                key={rowKey(row)}
                style={{
                  gridTemplateColumns: gridColumns,
                  background: meta.tone.bg,
                  borderColor: meta.tone.border,
                  gap: exporting ? `${exportGap}px` : undefined
                }}
                position="relative"
                gap={exporting ? undefined : { base: '2', md: '4' }}
                alignItems="center"
                borderRadius={{ base: 'xl', md: '2xl' }}
                borderWidth={exporting ? '2px' : '1px'}
                p={exporting ? '5' : { base: '1.5', sm: '2', md: '3.5' }}
                transition="all"
              >
                <Center minW="0" h={exporting ? '20' : { base: '10', sm: '12', md: '16' }}>
                  <Stack gap="0.5" alignItems="center" minW="0" textAlign="center">
                    <Text
                      textStyle="display"
                      title={meta.sub}
                      style={{ color: meta.tone.text }}
                      fontSize={exporting ? 'xl' : { base: 'xs', md: 'md' }}
                      lineHeight="1.05"
                      lineClamp={2}
                    >
                      {meta.label}
                    </Text>
                    <Text
                      hideBelow={exporting ? undefined : 'sm'}
                      color="fg.muted"
                      fontSize={exporting ? 'xs' : { base: '3xs', md: '2xs' }}
                      lineHeight="1.1"
                      lineClamp={2}
                    >
                      {meta.sub}
                    </Text>
                  </Stack>
                  {editable && onRemoveRow && rows.length > 1 && (
                    <IconButton
                      aria-label={t('common.delete')}
                      variant="ghost"
                      size="xs"
                      onClick={() => onRemoveRow(row)}
                      position="absolute"
                      top="-1.5"
                      left="-1.5"
                      minW="4"
                      h="4"
                      color="fg.subtle"
                    >
                      <FaXmark size={10} />
                    </IconButton>
                  )}
                </Center>
                {columns.map((col) => {
                  const key = cellKey(row, col);
                  const pickedId = myPick?.cells?.[key] ?? null;
                  return (
                    <Box
                      key={key}
                      {...(editable
                        ? clickable(
                            () => onPickCell?.(row, col),
                            `${meta.label} ${columnLabel(col)}`
                          )
                        : {})}
                      style={{
                        aspectRatio: '1 / 1',
                        width: exporting ? `${exportColumnWidth}px` : undefined,
                        height: exporting ? `${exportColumnWidth}px` : undefined
                      }}
                      cursor={editable ? 'pointer' : undefined}
                      position="relative"
                      borderColor={pickedId ? 'white' : 'border.subtle'}
                      borderRadius={{ base: 'xl', md: '2xl' }}
                      borderWidth={pickedId ? '0' : exporting ? '2px' : '1px'}
                      bgColor={pickedId ? 'bg.subtle' : 'rgba(255, 255, 255, 0.38)'}
                      boxShadow={pickedId ? 'md' : 'sm'}
                      overflow="hidden"
                      borderStyle={pickedId ? undefined : 'dashed'}
                      _hover={
                        editable
                          ? {
                              borderColor: 'accent.8',
                              bgColor: 'rgba(255, 255, 255, 0.62)',
                              transform: 'translateY(-1px)'
                            }
                          : undefined
                      }
                    >
                      {pickedId ? (
                        <CellContent column={col} pickedId={pickedId} />
                      ) : (
                        <Center h="full">
                          <Stack
                            gap={{ base: '1', md: '2' }}
                            justifyContent="center"
                            alignItems="center"
                            p={{ base: '1.5', sm: '3' }}
                            color="fg.subtle"
                          >
                            <FaPlus size={exporting ? 28 : 18} />
                            <Text
                              fontSize={exporting ? 'xs' : { base: '3xs', md: '2xs' }}
                              fontWeight="semibold"
                              letterSpacing="0.12em"
                              lineHeight="1.15"
                              textAlign="center"
                              textTransform="uppercase"
                            >
                              {editable ? t(`mypick.slot_${col.slot}`) : t('mypick.no_pick')}
                            </Text>
                          </Stack>
                        </Center>
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
                          borderRadius="full"
                          p="1"
                          color="white"
                          bgColor="black.a7"
                          _hover={{ bgColor: 'black.a9' }}
                        >
                          <FaXmark size={10} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Grid>
            );
          })}
        </Stack>

        {editable && (
          <HStack gap="2" justifyContent="center" flexWrap="wrap">
            {onAddColumn && (
              <HStack
                {...clickable(onAddColumn, t('mypick.add_column'))}
                cursor="pointer"
                gap="2"
                justifyContent="center"
                borderColor="border.default"
                borderRadius="full"
                borderWidth="1px"
                py="2"
                px="4"
                color="fg.muted"
                bgColor="white"
                borderStyle="dashed"
                _hover={{ borderColor: 'accent.8', color: 'accent.default' }}
              >
                <FaPlus size={11} />
                <Text fontSize="xs" fontWeight="medium">
                  {t('mypick.add_column')}
                </Text>
              </HStack>
            )}
            {onAddRow && (
              <HStack
                {...clickable(onAddRow, t('mypick.add_row'))}
                cursor="pointer"
                gap="2"
                justifyContent="center"
                borderColor="border.default"
                borderRadius="full"
                borderWidth="1px"
                py="2"
                px="4"
                color="fg.muted"
                bgColor="white"
                borderStyle="dashed"
                _hover={{ borderColor: 'accent.8', color: 'accent.default' }}
              >
                <FaPlus size={11} />
                <Text fontSize="xs" fontWeight="medium">
                  {t('mypick.add_row')}
                </Text>
              </HStack>
            )}
          </HStack>
        )}

        {exporting && (
          <Fragment>
            <Box borderTopWidth="2px" borderTopColor="black.a1" h="0" />
            <Text
              textStyle="display"
              color="fg.default"
              fontSize="2xl"
              letterSpacing="0.45em"
              textAlign="center"
              textTransform="uppercase"
            >
              llernote.app
            </Text>
          </Fragment>
        )}
      </Stack>
    </Box>
  );
});
