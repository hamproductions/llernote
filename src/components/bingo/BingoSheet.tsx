import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaPlus } from 'react-icons/fa6';
import { Box, Grid, HStack, Stack, styled } from 'styled-system/jsx';
import { FitCaption } from './FitCaption';
import { BROWN, GREEN, PINK, foregroundFor, franchiseColor } from './bingo-theme';
import { Text } from '~/components/ui/text';
import { series } from '~/data/core';
import { getPicUrl } from '~/utils/assets';
import { hasSongThumb } from '~/utils/song-thumbs';
import type { BingoCard, scoreBingo } from '~/utils/bingo';
import type { ShortNames } from '~/utils/abbreviations';
import type { Performance, Song } from '~/types';

const BUNTING = series.map((item) => item.color);

export function BingoSheet({
  ref,
  card: current,
  performance,
  score,
  songById,
  skin,
  shared,
  short,
  active,
  highlighted = false,
  onOpenSquare
}: {
  ref?: Ref<HTMLDivElement>;
  card: BingoCard;
  performance?: Performance;
  score: ReturnType<typeof scoreBingo>;
  songById: Map<string, Song>;
  skin: { paper: string; ink: string; line: string; pink: string; party: boolean };
  shared: boolean;
  short?: ShortNames;
  active?: number;
  highlighted?: boolean;
  onOpenSquare?: (index: number) => void;
}) {
  const { t } = useTranslation();
  const gridSize = Math.sqrt(current.cells.length);
  const songTotal = current.cells.length - (current.freeIndex === null ? 0 : 1);
  return (
    <Box
      ref={ref}
      style={{ background: skin.paper, color: skin.ink, borderColor: skin.line }}
      position="relative"
      borderRadius="3xl"
      borderWidth="3px"
      px={{ base: '3', md: '5' }}
      pb={{ base: '3', md: '4' }}
      fontFamily="'Zen Maru Gothic', sans-serif"
      overflow="hidden"
    >
      {skin.party && (
        <Box
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(${skin.ink}14 1.2px, transparent 1.6px)`,
            backgroundSize: '14px 14px'
          }}
          inset="0"
          position="absolute"
          pointerEvents="none"
        />
      )}
      {skin.party && (
        <HStack
          aria-hidden="true"
          style={{ borderColor: BROWN }}
          position="relative"
          gap="0"
          justifyContent="space-between"
          borderTopWidth="2px"
          mx={{ base: '-2', md: '-4' }}
          px="2"
          borderStyle="dotted"
        >
          {Array.from({ length: 11 }, (_, index) => (
            <Box
              key={index}
              style={{
                background: BUNTING[index % BUNTING.length],
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
              }}
              w={{ base: '4', md: '6' }}
              h={{ base: '4', md: '6' }}
            />
          ))}
        </HStack>
      )}
      {skin.party &&
        [
          { top: '14%', left: '5%', size: '14px', color: '#ffd84d' },
          { top: '9%', right: '7%', size: '18px', color: '#8fd3ff' },
          { top: '22%', right: '3%', size: '10px', color: PINK }
        ].map((sparkle, index) => (
          <Box
            key={index}
            aria-hidden="true"
            style={{
              top: sparkle.top,
              left: sparkle.left,
              right: sparkle.right,
              width: sparkle.size,
              height: sparkle.size,
              background: sparkle.color,
              clipPath:
                'polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)'
            }}
            position="absolute"
          />
        ))}
      <Stack position="relative" gap="1" alignItems="center" pt="2" pb="2" textAlign="center">
        {performance && !current.performanceId.startsWith('-') && (
          <Text
            fontSize={{ base: '2xs', md: 'xs' }}
            fontWeight="700"
            opacity="0.75"
            whiteSpace="nowrap"
          >
            {performance.date}{' '}
            {short?.performance(performance) ??
              performance.performanceName ??
              performance.concertName ??
              ''}
          </Text>
        )}
        <Text
          as="h2"
          textWrap="balance"
          fontSize={{ base: 'lg', md: '2xl' }}
          fontWeight="700"
          lineHeight="1.25"
          overflowWrap="anywhere"
        >
          {performance
            ? (short?.event(performance) ?? performance.tourName)
            : t('bingo.default_title')}
        </Text>
        {current.performanceId && !performance && (
          <Text fontSize="sm">{t('bingo.unknown_performance', { id: current.performanceId })}</Text>
        )}
        {gridSize === 5 ? (
          <Grid
            aria-hidden="true"
            style={{
              color: skin.pink,
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: skin.party ? '2px' : '1px',
              paddingInline: skin.party ? '2px' : '1px'
            }}
            alignSelf="stretch"
            fontSize={{ base: 'xl', md: '3xl' }}
            fontWeight="900"
            lineHeight="1"
            textAlign="center"
          >
            {'BINGO'.split('').map((letter) => (
              <span key={letter}>{letter}</span>
            ))}
          </Grid>
        ) : (
          <Text
            aria-hidden="true"
            style={{ color: skin.pink }}
            pl="0.3em"
            fontSize={{ base: 'xl', md: '3xl' }}
            fontWeight="900"
            letterSpacing="0.3em"
            lineHeight="1"
            whiteSpace="nowrap"
          >
            BINGO
          </Text>
        )}
      </Stack>
      <Grid
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          background: skin.party ? skin.line : '#d9d4de',
          borderColor: skin.party ? skin.line : '#d9d4de'
        }}
        position="relative"
        gap={skin.party ? '2px' : '1px'}
        borderRadius="lg"
        borderWidth={skin.party ? '2px' : '1px'}
        overflow="hidden"
      >
        {current.cells.map((id, index) => {
          const song = id ? songById.get(id) : null;
          const free = index === current.freeIndex;
          const marked = score.available && score.marked[index];
          const winning = score.winningCells.has(index);
          const franchise = franchiseColor(song?.seriesIds);
          const thumb = song && hasSongThumb(song.id);
          const isActive = !shared && highlighted && active === index;
          const label = free
            ? t('bingo.free')
            : ((song && (short?.song(song) ?? song.name)) ??
              (id ? t('bingo.unknown_song', { id }) : t('bingo.empty_cell')));
          return (
            <styled.button
              type="button"
              key={index}
              disabled={Boolean(shared)}
              aria-label={`${index + 1}: ${label}${marked ? ` (${t('bingo.hit')})` : ''}`}
              aria-pressed={!shared && !free ? active === index : undefined}
              onClick={() => onOpenSquare?.(index)}
              data-bingo-cell={index}
              data-hit={marked || undefined}
              data-franchise={song ? franchise : undefined}
              style={{
                background: free ? skin.pink : '#ffffff'
              }}
              cursor={shared ? 'default' : 'pointer'}
              display="flex"
              position="relative"
              flexDirection="column"
              aspectRatio="1"
              minW="0"
              minH="0"
              p="0"
              color="inherit"
              fontFamily="inherit"
              overflow="hidden"
              _focusVisible={{ outline: '3px solid', outlineOffset: '-3px' }}
              _hover={!shared ? { filter: 'brightness(1.06)' } : undefined}
            >
              {song && (
                <Box inset="0" position="absolute" overflow="hidden">
                  {thumb && (
                    <img
                      src={getPicUrl(song.id, 'thumbnail')}
                      alt=""
                      width="180"
                      height="180"
                      crossOrigin="anonymous"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                </Box>
              )}
              {song && (
                <Box
                  style={{
                    background:
                      'linear-gradient(0deg, rgba(10,8,16,0.8) 0%, rgba(10,8,16,0.45) 65%, transparent)',
                    borderBottom: `3px solid ${franchise}`
                  }}
                  position="absolute"
                  left="0"
                  right="0"
                  bottom="0"
                  px={{ base: '0.5', md: '1' }}
                  pt={{ base: '2', md: '3' }}
                  pb={{ base: '0.5', md: '1' }}
                  color="white"
                  fontSize={{ base: '8px', sm: '10px', md: '11px' }}
                  lineHeight={{ base: '10px', sm: '12px', md: '13px' }}
                  textShadow="0 1px 2px rgba(0,0,0,0.8)"
                >
                  <FitCaption>{label}</FitCaption>
                </Box>
              )}
              {!song && !free && (
                <Stack flex="1" gap="0" justifyContent="center" alignItems="center" opacity="0.4">
                  <Text fontSize={{ base: 'xs', md: 'md' }} fontWeight="900">
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  {!shared && (
                    <Box fontSize="2xs">
                      <FaPlus aria-hidden="true" />
                    </Box>
                  )}
                </Stack>
              )}
              {free && (
                <Stack flex="1" gap="0" justifyContent="center" alignItems="center">
                  <Text
                    style={{ color: '#ffffff' }}
                    fontSize={{ base: 'sm', md: 'xl' }}
                    fontWeight="900"
                    letterSpacing="0.08em"
                    lineHeight="1"
                    whiteSpace="nowrap"
                  >
                    FREE
                  </Text>
                </Stack>
              )}
              {isActive && (
                <Box
                  aria-hidden="true"
                  style={{
                    boxShadow: `inset 0 0 0 3px ${skin.pink}, inset 0 0 0 5px #ffffff`,
                    background: `${skin.pink}33`
                  }}
                  zIndex="3"
                  inset="0"
                  position="absolute"
                  pointerEvents="none"
                />
              )}
              {marked && !free && (
                <Box
                  aria-hidden="true"
                  style={{
                    background: winning ? franchise : '#ffffff',
                    color: winning ? foregroundFor(franchise) : franchise,
                    borderColor: skin.ink
                  }}
                  display="grid"
                  position="absolute"
                  top="1"
                  right="1"
                  transform="rotate(-8deg)"
                  borderRadius="full"
                  borderWidth="2px"
                  w={{ base: '5', md: '7' }}
                  h={{ base: '5', md: '7' }}
                  fontSize={{ base: '2xs', md: 'xs' }}
                  placeItems="center"
                >
                  <FaCheck
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                </Box>
              )}
            </styled.button>
          );
        })}
      </Grid>
      {score.available && (
        <HStack position="relative" gap="2" justifyContent="center" pt="4" flexWrap="wrap">
          <Text
            style={{ background: skin.party ? GREEN : skin.pink }}
            borderRadius="full"
            py="1"
            px="4"
            color="white"
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight="900"
            whiteSpace="nowrap"
          >
            {t('bingo.hits', { count: score.hits, total: songTotal })} ·{' '}
            {t('bingo.lines', { count: score.lines })}
          </Text>
          {score.unresolved > 0 && (
            <Text fontSize="xs" opacity="0.75">
              {t('bingo.unresolved', { count: score.unresolved })}
            </Text>
          )}
        </HStack>
      )}
    </Box>
  );
}
