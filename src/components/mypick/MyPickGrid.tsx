import { Fragment, forwardRef, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaEllipsis,
  FaMusic,
  FaPlus,
  FaXmark
} from 'react-icons/fa6';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { IconButton } from '~/components/ui/icon-button';
import { Menu } from '~/components/ui/menu';
import {
  useArtistById,
  useCharacters,
  usePerformanceById,
  useSeriesById,
  useSongById
} from '~/hooks/useData';
import { getPicUrl } from '~/utils/assets';
import { localizedName } from '~/utils/names';
import { clickable } from '~/utils/clickable';
import { isGroupArtist } from '~/utils/mypick-options';
import { SITE_DISPLAY_URL } from '~/utils/site';
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
    bg: `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0.14), color-mix(in srgb, var(--colors-mypick-panel-solid) 76%, transparent))`,
    border: `rgba(${r}, ${g}, ${b}, 0.3)`,
    text: `color-mix(in srgb, rgb(${r}, ${g}, ${b}) 34%, var(--colors-mypick-text))`
  };
};

export const EXPORT_BG = '#16131b';

const EXPORT_THEME = {
  bg: EXPORT_BG,
  ink: '#f4f1ea',
  tile: '#ffffff',
  tileBorder: 'rgba(244, 241, 234, 0.24)',
  emptyText: 'rgba(244, 241, 234, 0.45)',
  divider: 'rgba(244, 241, 234, 0.18)',
  serif: "'Didot', 'Bodoni 72', Georgia, 'Hiragino Mincho ProN', 'Yu Mincho', serif"
};

const exportTone = (color: string) => {
  const { r, g, b } = hexToRgb(color);
  return {
    bg: `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0.2), rgba(${r}, ${g}, ${b}, 0.05))`,
    border: `rgba(${r}, ${g}, ${b}, 0.4)`,
    text: `color-mix(in srgb, rgb(${r}, ${g}, ${b}) 55%, ${'#f4f1ea'})`
  };
};

function ActionMenu({
  label,
  items
}: {
  label: string;
  items: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }[];
}) {
  return (
    <Menu.Root positioning={{ placement: 'bottom-end', gutter: 6 }}>
      <Menu.Trigger
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        style={{ appearance: 'none' }}
        cursor="pointer"
        display="inline-flex"
        justifyContent="center"
        alignItems="center"
        borderColor="mypick.actionBorder"
        borderRadius="l1"
        borderWidth="1px"
        w="7"
        h="6"
        color="mypick.muted"
        bgColor="mypick.actionMuted"
        _hover={{
          color: 'accent.default',
          borderColor: 'mypick.borderStrong',
          bgColor: 'mypick.action'
        }}
      >
        <FaEllipsis size={12} />
      </Menu.Trigger>
      <Menu.Positioner zIndex="20">
        <Menu.Content
          borderColor="mypick.border"
          borderRadius="l2"
          borderWidth="1px"
          minW="9rem"
          p="1"
          color="mypick.text"
          bgColor="mypick.panelSolid"
          boxShadow="lg"
        >
          {items.map((item) => (
            <Menu.Item
              key={item.label}
              value={item.label}
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled) item.onClick();
              }}
              cursor={item.disabled ? 'not-allowed' : 'pointer'}
              borderRadius="l1"
              py="2"
              px="2.5"
              color={item.disabled ? 'mypick.subtle' : 'mypick.text'}
              opacity={item.disabled ? 0.42 : 1}
              _hover={
                item.disabled
                  ? undefined
                  : {
                      bgColor: 'mypick.action',
                      color: 'accent.default'
                    }
              }
            >
              <HStack gap="2">
                <Box w="3.5">{item.icon}</Box>
                <Text fontSize="sm">{item.label}</Text>
              </HStack>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}

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

function CellContent({
  column,
  pickedId,
  exporting = false
}: {
  column: MyPickColumn;
  pickedId: string;
  exporting?: boolean;
}) {
  const { i18n } = useTranslation();
  const characters = useCharacters();
  const songById = useSongById();
  const performanceById = usePerformanceById();

  if (column.type === 'member' || (column.type === 'slot' && column.slot === 'cast')) {
    const character = characters.find((c) => c.id === pickedId);
    if (!character) return null;
    return (
      <>
        <CellImage src={getPicUrl(character.id, 'character')} top />
        <Box insetX="0" position="absolute" bottom="0" p="2" bgColor="black.a8">
          <Text
            color="white"
            fontSize={exporting ? 'xs' : '2xs'}
            fontWeight="bold"
            textAlign="center"
            lineClamp={2}
          >
            {localizedName(i18n.language, character.fullName, character.englishName)}
          </Text>
        </Box>
      </>
    );
  }
  if (
    (column.type === 'year' && column.slot === 'song') ||
    (column.type === 'slot' && column.slot === 'song')
  ) {
    const song = songById.get(pickedId);
    if (!song) return null;
    return (
      <>
        <CellImage src={getPicUrl(song.id, 'thumbnail')} />
        <Box insetX="0" position="absolute" bottom="0" p="2" bgColor="black.a8">
          <Text
            color="white"
            fontSize={exporting ? 'xs' : '2xs'}
            fontWeight="bold"
            textAlign="center"
            lineClamp={2}
          >
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
      style={exporting ? { backgroundColor: EXPORT_THEME.tile, color: '#232c4a' } : undefined}
      inset="0"
      position="absolute"
      gap="2"
      justifyContent="center"
      alignItems="center"
      p="3"
      color={exporting ? undefined : 'mypick.text'}
      textAlign="center"
      bgColor={exporting ? undefined : 'mypick.tile'}
    >
      <Text
        lang="ja"
        style={{
          wordBreak: 'auto-phrase' as 'normal',
          color: exporting ? '#232c4a' : undefined
        }}
        minW="0"
        maxW="full"
        color={exporting ? undefined : 'mypick.text'}
        fontSize={exporting ? 'sm' : 'xs'}
        fontWeight="bold"
        lineHeight="1.25"
        lineClamp={4}
        overflowWrap="anywhere"
      >
        {performance.tourName}
      </Text>
      <Text
        color="accent.default"
        fontSize={exporting ? 'xs' : '2xs'}
        fontWeight="semibold"
        lineHeight="1"
      >
        {performance.date}
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
    pickable?: boolean;
    onPickCell?: (row: MyPickRow, column: MyPickColumn) => void;
    onClearCell?: (key: string) => void;
    onRemoveRow?: (row: MyPickRow) => void;
    onRemoveColumn?: (column: MyPickColumn) => void;
    onMoveRow?: (row: MyPickRow, direction: -1 | 1) => void;
    onMoveColumn?: (column: MyPickColumn, direction: -1 | 1) => void;
    onAddRow?: () => void;
    onAddColumn?: () => void;
    onChangeRows?: () => void;
    isCellDisabled?: (row: MyPickRow, column: MyPickColumn) => boolean;
    exporting?: boolean;
  }
>(function MyPickGrid(
  {
    myPick,
    rows,
    columns,
    editable = false,
    pickable = false,
    onPickCell,
    onClearCell,
    onRemoveRow,
    onRemoveColumn,
    onMoveRow,
    onMoveColumn,
    onAddRow,
    onAddColumn,
    onChangeRows,
    isCellDisabled,
    exporting = false
  },
  ref
) {
  const { t, i18n } = useTranslation();
  const seriesById = useSeriesById();
  const artistById = useArtistById();
  const exportColumnWidth = columns.length <= 3 ? 152 : 124;
  const exportLabelWidth = columns.length <= 3 ? 204 : 164;
  const exportGap = columns.length <= 3 ? 14 : 10;
  const exportPadding = 28;
  const exportRowPadding = 16;
  const labelTrack = 'minmax(0, 1.25fr)';
  const cellTrack = 'minmax(0, 1fr)';
  const panelMaxWidth = `${12 + columns.length * 10}rem`;
  const minContentWidth = `${8 + columns.length * 6.5}rem`;
  const exportWidth =
    exportLabelWidth +
    columns.length * exportColumnWidth +
    columns.length * exportGap +
    exportRowPadding * 2 +
    exportPadding * 2;

  const columnLabel = (col: MyPickColumn) => {
    if (col.type === 'member') return t('mypick.column_character');
    if (col.type === 'slot') {
      if (col.slot === 'cast') return t('mypick.column_character');
      if (col.slot === 'song') return t('mypick.column_song');
      return t('mypick.column_event');
    }
    return `${col.year} ${t(col.slot === 'song' ? 'mypick.column_song' : 'mypick.column_event')}`;
  };
  const emptyCellLabel = (col: MyPickColumn) => {
    return columnLabel(col);
  };

  const rowMeta = (row: MyPickRow) => {
    if (row.type === 'series') {
      const series = seriesById.get(row.id);
      const color = series?.color ?? '#e4007f';
      return {
        label: series?.name ?? row.id,
        sub: t('mypick.row_series'),
        color,
        tone: rowTone(color)
      };
    }
    if (row.type === 'category') {
      const colors = {
        group: '#d44785',
        unit: '#8a68d8',
        solo: '#6b8fd6',
        others: '#8d7a88'
      };
      return {
        label: t(`mypick.row_${row.id}`),
        sub: t('mypick.row_artist'),
        color: colors[row.id],
        tone: rowTone(colors[row.id])
      };
    }
    const artist = artistById.get(row.id);
    const color = seriesById.get(String(artist?.seriesIds[0] ?? ''))?.color ?? '#e4007f';
    const rowType =
      !artist || artist.seriesIds.length > 1
        ? t('mypick.row_others')
        : isGroupArtist(artist)
          ? t('mypick.row_group')
          : artist.characters.filter((id) => typeof id === 'string' && id.length > 0).length === 1
            ? t('mypick.row_solo')
            : t('mypick.row_unit');
    return {
      label: artist ? localizedName(i18n.language, artist.name, artist.englishName) : row.id,
      sub: rowType,
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
        bgColor="mypick.panelSolid"
      >
        <Stack gap="3" alignItems="center">
          <Text color="fg.muted" fontSize="sm">
            {t('mypick.empty')}
          </Text>
          {editable && !exporting && (
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
    : `${labelTrack} repeat(${columns.length}, ${cellTrack})`;

  return (
    <Box
      ref={ref}
      style={{
        backdropFilter: exporting ? undefined : 'blur(18px)',
        width: exporting ? `${exportWidth}px` : undefined,
        maxWidth: exporting ? undefined : panelMaxWidth,
        background: exporting ? EXPORT_THEME.bg : undefined,
        color: exporting ? EXPORT_THEME.ink : undefined
      }}
      position="relative"
      borderColor="mypick.border"
      borderRadius={{ base: '2xl', md: '3xl' }}
      borderWidth={exporting ? '0' : '1px'}
      w={exporting ? undefined : 'full'}
      mx="auto"
      p={exporting ? `${exportPadding}px` : { base: '3', md: '4' }}
      bgColor={exporting ? undefined : 'mypick.panel'}
      boxShadow={exporting ? undefined : '0 18px 60px var(--colors-mypick-shadow)'}
      overflowX={exporting ? 'visible' : 'auto'}
      overflowY="hidden"
    >
      <Stack
        style={{ minWidth: exporting ? undefined : minContentWidth }}
        zIndex="1"
        position="relative"
        gap={exporting ? '6' : { base: '3.5', md: '6' }}
      >
        {exporting && (
          <Stack gap="2.5" alignItems="center" pt="2" textAlign="center">
            <Text
              style={{
                color: EXPORT_THEME.ink,
                fontFamily: EXPORT_THEME.serif,
                letterSpacing: '0.32em'
              }}
              fontSize="3xl"
              fontWeight="bold"
              lineHeight="1"
            >
              MY PICK LOVELIVE
            </Text>
            <Text
              lang="ja"
              style={{ color: EXPORT_THEME.ink, letterSpacing: '0.24em' }}
              fontSize="xs"
              fontWeight="semibold"
            >
              {t('mypick.export_subtitle')}
            </Text>
            <HStack gap="1.5" justifyContent="center" pt="1">
              {rows.map((row) => (
                <Box
                  key={rowKey(row)}
                  style={{ backgroundColor: rowMeta(row).color, width: 26, height: 9 }}
                  borderRadius="full"
                />
              ))}
            </HStack>
          </Stack>
        )}
        <Grid
          style={{
            gridTemplateColumns: gridColumns,
            paddingInline: exporting ? `${exportRowPadding}px` : undefined
          }}
          gap={exporting ? `${exportGap}px` : { base: '2', md: '3' }}
          justifyContent="start"
          alignItems="center"
          borderColor="transparent"
          borderWidth={exporting ? undefined : '1px'}
          px={exporting ? undefined : { base: '1.5', sm: '2', md: '2' }}
        >
          <HStack gap="2" justifyContent="center" alignItems="center" minW="0" minH="10">
            <Text
              style={
                exporting
                  ? {
                      color: EXPORT_THEME.ink,
                      fontFamily: EXPORT_THEME.serif,
                      letterSpacing: '0.2em'
                    }
                  : undefined
              }
              color={exporting ? undefined : 'mypick.text'}
              fontSize={exporting ? 'sm' : { base: '2xs', sm: 'xs', md: 'sm' }}
              fontWeight="bold"
              lineHeight="1"
              textTransform={exporting ? 'uppercase' : undefined}
            >
              Selections
            </Text>
            {editable && !exporting && onChangeRows && (
              <ActionMenu
                label={t('mypick.change_rows')}
                items={[
                  {
                    label: t('mypick.change_rows'),
                    icon: <FaArrowDown size={11} />,
                    onClick: onChangeRows
                  }
                ]}
              />
            )}
          </HStack>
          {columns.map((col, columnIndex) => (
            <Center key={columnKey(col)} minW="0" minH="10">
              <HStack gap="2" justifyContent="center" alignItems="center" w="full" minW="0">
                {exporting ? (
                  <Stack gap="1.5" alignItems="center" minW="0">
                    <Text
                      lang="ja"
                      style={{
                        color: EXPORT_THEME.ink,
                        fontFamily: EXPORT_THEME.serif,
                        letterSpacing: '0.12em'
                      }}
                      fontSize="xl"
                      fontWeight="bold"
                      lineHeight="1.1"
                      textAlign="center"
                    >
                      {columnLabel(col)}
                    </Text>
                    <Box
                      style={{ width: 72, height: 2, backgroundColor: EXPORT_THEME.tileBorder }}
                    />
                  </Stack>
                ) : (
                  <Text
                    flex="0 1 auto"
                    minW="0"
                    color="mypick.text"
                    fontSize={{ base: '3xs', sm: 'xs', md: 'sm' }}
                    fontWeight="bold"
                    lineHeight="1.1"
                    textAlign="center"
                    lineClamp={2}
                    whiteSpace="normal"
                  >
                    {columnLabel(col)}
                  </Text>
                )}
                {editable && !exporting && onRemoveColumn && columns.length > 1 && (
                  <ActionMenu
                    label={`${columnLabel(col)} ${t('common.actions')}`}
                    items={[
                      ...(onMoveColumn
                        ? [
                            {
                              label: t('mypick.move_left'),
                              icon: <FaArrowLeft size={11} />,
                              onClick: () => onMoveColumn(col, -1),
                              disabled: columnIndex === 0
                            },
                            {
                              label: t('mypick.move_right'),
                              icon: <FaArrowRight size={11} />,
                              onClick: () => onMoveColumn(col, 1),
                              disabled: columnIndex === columns.length - 1
                            }
                          ]
                        : []),
                      {
                        label: t('common.delete'),
                        icon: <FaXmark size={11} />,
                        onClick: () => onRemoveColumn(col)
                      }
                    ]}
                  />
                )}
              </HStack>
            </Center>
          ))}
        </Grid>

        <Stack gap={exporting ? '4' : { base: '2', md: '2.5' }}>
          {rows.map((row, rowIndex) => {
            const meta = rowMeta(row);
            return (
              <Grid
                key={rowKey(row)}
                style={{
                  gridTemplateColumns: gridColumns,
                  background: exporting ? exportTone(meta.color).bg : meta.tone.bg,
                  borderColor: exporting ? exportTone(meta.color).border : meta.tone.border,
                  gap: exporting ? `${exportGap}px` : undefined
                }}
                position="relative"
                gap={exporting ? undefined : { base: '2', md: '3' }}
                justifyContent="start"
                alignItems="center"
                borderRadius={{ base: 'xl', md: '2xl' }}
                borderWidth="1px"
                p={exporting ? '4' : { base: '1.5', sm: '2', md: '2' }}
                transition="all"
              >
                <Center
                  minW="0"
                  minH={exporting ? `${exportColumnWidth}px` : { base: '12', sm: '14', md: '16' }}
                  px="1"
                >
                  <HStack gap="2" justifyContent="center" alignItems="center" w="full" minW="0">
                    <Text
                      title={meta.sub}
                      lang="ja"
                      style={{
                        color: exporting ? exportTone(meta.color).text : meta.tone.text,
                        fontFamily: exporting ? EXPORT_THEME.serif : undefined,
                        wordBreak: 'auto-phrase' as 'normal'
                      }}
                      flex="1"
                      minW="0"
                      fontSize={exporting ? 'lg' : { base: '2xs', md: 'sm' }}
                      fontWeight="bold"
                      lineHeight="1.12"
                      textAlign="center"
                      lineClamp={3}
                      overflowWrap="break-word"
                      whiteSpace="normal"
                    >
                      {meta.label}
                    </Text>
                    {editable && !exporting && onRemoveRow && rows.length > 1 && (
                      <ActionMenu
                        label={`${meta.label} ${t('common.actions')}`}
                        items={[
                          ...(onMoveRow
                            ? [
                                {
                                  label: t('mypick.move_up'),
                                  icon: <FaArrowUp size={11} />,
                                  onClick: () => onMoveRow(row, -1),
                                  disabled: rowIndex === 0
                                },
                                {
                                  label: t('mypick.move_down'),
                                  icon: <FaArrowDown size={11} />,
                                  onClick: () => onMoveRow(row, 1),
                                  disabled: rowIndex === rows.length - 1
                                }
                              ]
                            : []),
                          {
                            label: t('common.delete'),
                            icon: <FaXmark size={11} />,
                            onClick: () => onRemoveRow(row)
                          }
                        ]}
                      />
                    )}
                  </HStack>
                </Center>
                {columns.map((col) => {
                  const key = cellKey(row, col);
                  const pickedId = myPick?.cells?.[key] ?? null;
                  const disabled = !pickedId && (isCellDisabled?.(row, col) ?? false);
                  return (
                    <Box
                      key={key}
                      {...(pickable && !exporting && !disabled
                        ? clickable(
                            () => onPickCell?.(row, col),
                            `${meta.label} ${columnLabel(col)}`
                          )
                        : {})}
                      style={{
                        aspectRatio: '1 / 1',
                        width: exporting ? `${exportColumnWidth}px` : undefined,
                        height: exporting ? `${exportColumnWidth}px` : undefined,
                        backgroundColor: exporting
                          ? pickedId
                            ? EXPORT_THEME.tile
                            : disabled
                              ? 'rgba(255, 255, 255, 0.03)'
                              : 'rgba(255, 255, 255, 0.05)'
                          : undefined,
                        borderColor: exporting
                          ? pickedId
                            ? 'transparent'
                            : EXPORT_THEME.tileBorder
                          : undefined
                      }}
                      cursor={
                        pickable && !exporting && !disabled
                          ? 'pointer'
                          : disabled
                            ? 'not-allowed'
                            : undefined
                      }
                      position="relative"
                      borderColor={
                        exporting ? undefined : pickedId ? 'mypick.panelSolid' : 'mypick.border'
                      }
                      borderRadius={{ base: 'xl', md: '2xl' }}
                      borderWidth={pickedId ? '0' : '1px'}
                      bgColor={
                        exporting
                          ? undefined
                          : pickedId
                            ? 'bg.subtle'
                            : disabled
                              ? 'mypick.tileDisabled'
                              : 'mypick.tile'
                      }
                      opacity={disabled ? 0.46 : 1}
                      boxShadow={
                        pickedId
                          ? exporting
                            ? '0 4px 14px rgba(29, 39, 66, 0.1)'
                            : 'sm'
                          : undefined
                      }
                      overflow="hidden"
                      borderStyle={pickedId || disabled ? undefined : 'dashed'}
                      _hover={
                        pickable && !exporting && !disabled
                          ? {
                              borderColor: 'accent.8',
                              bgColor: 'mypick.accentSoft',
                              transform: 'translateY(-1px)'
                            }
                          : undefined
                      }
                    >
                      {pickedId ? (
                        <CellContent column={col} pickedId={pickedId} exporting={exporting} />
                      ) : (
                        <Center h="full">
                          <Stack
                            style={{ color: exporting ? EXPORT_THEME.emptyText : undefined }}
                            gap={{ base: '1', md: '2' }}
                            justifyContent="center"
                            alignItems="center"
                            p={{ base: '1.5', sm: '3' }}
                            color={
                              exporting ? undefined : disabled ? 'mypick.subtle' : 'mypick.muted'
                            }
                          >
                            {!disabled && (pickable || exporting) && (
                              <FaPlus size={exporting ? 28 : 18} />
                            )}
                            <Text
                              fontSize={exporting ? 'xs' : { base: '3xs', md: '2xs' }}
                              fontWeight="semibold"
                              letterSpacing="0.08em"
                              lineHeight="1.15"
                              textAlign="center"
                              textTransform="uppercase"
                              wordBreak="keep-all"
                              lineClamp={2}
                              whiteSpace="normal"
                            >
                              {disabled
                                ? t('mypick.no_options')
                                : pickable
                                  ? emptyCellLabel(col)
                                  : t('mypick.no_pick')}
                            </Text>
                          </Stack>
                        </Center>
                      )}
                      {pickable && !exporting && pickedId && (
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

        {editable && !exporting && (
          <HStack gap="2" justifyContent="center" flexWrap="wrap">
            {onAddColumn && (
              <Button
                type="button"
                onClick={onAddColumn}
                variant="outline"
                size="sm"
                gap="2"
                borderColor="mypick.actionBorder"
                borderRadius="l2"
                minW="9rem"
                color="mypick.text"
                bgColor="mypick.actionMuted"
                _hover={{
                  borderColor: 'mypick.borderStrong',
                  color: 'accent.default',
                  bgColor: 'mypick.action'
                }}
              >
                <FaPlus size={11} />
                <Text fontSize="xs" fontWeight="medium">
                  {t('mypick.add_column')}
                </Text>
              </Button>
            )}
            {onAddRow && (
              <Button
                type="button"
                onClick={onAddRow}
                variant="outline"
                size="sm"
                gap="2"
                borderColor="mypick.actionBorder"
                borderRadius="l2"
                minW="9rem"
                color="mypick.text"
                bgColor="mypick.actionMuted"
                _hover={{
                  borderColor: 'mypick.borderStrong',
                  color: 'accent.default',
                  bgColor: 'mypick.action'
                }}
              >
                <FaPlus size={11} />
                <Text fontSize="xs" fontWeight="medium">
                  {t('mypick.add_row')}
                </Text>
              </Button>
            )}
          </HStack>
        )}

        {exporting && (
          <Fragment>
            <Box style={{ borderTopColor: EXPORT_THEME.divider }} borderTopWidth="1px" h="0" />
            <Text
              style={{
                color: EXPORT_THEME.ink,
                fontFamily: EXPORT_THEME.serif,
                letterSpacing: '0.35em'
              }}
              fontSize="sm"
              fontWeight="semibold"
              textAlign="center"
              textTransform="uppercase"
            >
              {SITE_DISPLAY_URL}
            </Text>
          </Fragment>
        )}
      </Stack>
    </Box>
  );
});
