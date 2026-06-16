import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaMusic, FaXmark } from 'react-icons/fa6';
import { Box, Center, Grid, HStack, Stack } from 'styled-system/jsx';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { IconButton } from '~/components/ui/icon-button';
import { Text } from '~/components/ui/text';
import { SITE_DISPLAY_URL } from '~/utils/site';

export interface BoardCard {
  /** `award:<key>` or `unit:<artistId>` */
  id: string;
  label: string;
  badge?: string;
  accentColor?: string;
  hint?: string;
  removable?: boolean;
  picked?: {
    name: string;
    sub?: string;
    image?: string;
    color?: string;
  };
}

export interface LiveMyPickBoardProps {
  liveName: string;
  liveSub?: string;
  accentColor?: string;
  awards: BoardCard[];
  units: BoardCard[];
  editable?: boolean;
  exporting?: boolean;
  onPick?: (cardId: string) => void;
  onClear?: (cardId: string) => void;
  onRemove?: (cardId: string) => void;
}

function CardImage({ src, color }: { src?: string; color?: string }) {
  return (
    <Box
      style={color ? { backgroundColor: color } : undefined}
      flexShrink={0}
      borderColor="mypick.border"
      borderRadius="l1"
      borderWidth="1px"
      w="64px"
      h="40px"
      bgColor="mypick.tile"
      overflow="hidden"
    >
      {src ? (
        <img
          src={src}
          alt=""
          crossOrigin="anonymous"
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Center w="full" h="full" color="mypick.subtle">
          <FaMusic size={14} />
        </Center>
      )}
    </Box>
  );
}

function PickCard({
  card,
  editable,
  onPick,
  onClear,
  onRemove
}: {
  card: BoardCard;
  editable: boolean;
  onPick?: (cardId: string) => void;
  onClear?: (cardId: string) => void;
  onRemove?: (cardId: string) => void;
}) {
  const { t } = useTranslation();
  const picked = card.picked;

  return (
    <Stack
      style={card.accentColor ? { borderLeftColor: card.accentColor } : undefined}
      gap="2"
      borderColor="mypick.border"
      borderLeftWidth="4px"
      borderLeftColor={card.accentColor ? undefined : 'accent.default'}
      borderRadius="l2"
      borderWidth="1px"
      p="3"
      bgColor="mypick.tile"
    >
      <HStack gap="2" justifyContent="space-between" alignItems="flex-start">
        <HStack gap="2" alignItems="center" minW="0">
          <Text color="mypick.text" fontSize="sm" fontWeight="bold" lineClamp={2}>
            {card.label}
          </Text>
          {card.badge && (
            <Badge size="sm" variant="subtle">
              {card.badge}
            </Badge>
          )}
        </HStack>
        {editable && card.removable && (
          <IconButton
            aria-label={t('mypick_live.remove_award')}
            variant="ghost"
            size="xs"
            onClick={() => onRemove?.(card.id)}
          >
            <FaXmark />
          </IconButton>
        )}
      </HStack>

      <HStack
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={editable ? t('mypick_live.pick_song_for', { name: card.label }) : undefined}
        onClick={editable ? () => onPick?.(card.id) : undefined}
        onKeyDown={
          editable
            ? (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick?.(card.id);
                }
              }
            : undefined
        }
        cursor={editable ? 'pointer' : 'default'}
        gap="2"
        alignItems="center"
        borderRadius="l1"
        p="1"
        _hover={editable ? { bgColor: 'mypick.accentSoft' } : undefined}
      >
        <CardImage src={picked?.image} color={picked?.color} />
        <Stack flex="1" gap="0" minW="0">
          {picked ? (
            <>
              <Text color="mypick.text" fontSize="sm" fontWeight="medium" lineClamp={2}>
                {picked.name}
              </Text>
              {picked.sub && (
                <Text color="mypick.muted" fontSize="xs" lineClamp={1}>
                  {picked.sub}
                </Text>
              )}
            </>
          ) : (
            <Text color="mypick.muted" fontSize="sm">
              {t('mypick_live.empty_pick')}
            </Text>
          )}
        </Stack>
      </HStack>

      {card.hint && (
        <Text color="mypick.muted" fontSize="2xs">
          {card.hint}
        </Text>
      )}

      {editable && picked && (
        <HStack justifyContent="flex-end">
          <Button variant="link" size="xs" onClick={() => onClear?.(card.id)}>
            {t('mypick_live.clear_pick')}
          </Button>
        </HStack>
      )}
    </Stack>
  );
}

export const LiveMyPickBoard = forwardRef<HTMLDivElement, LiveMyPickBoardProps>(
  function LiveMyPickBoard(
    {
      liveName,
      liveSub,
      accentColor,
      awards,
      units,
      editable = false,
      exporting = false,
      onPick,
      onClear,
      onRemove
    },
    ref
  ) {
    const { t } = useTranslation();

    return (
      <Stack
        ref={ref}
        gap="5"
        borderRadius="l3"
        w="full"
        p={{ base: '4', md: '5' }}
        color="mypick.text"
        bgColor="mypick.panelSolid"
      >
        <Stack
          style={accentColor ? { borderLeftColor: accentColor } : undefined}
          gap="1"
          borderLeftWidth="4px"
          borderLeftColor={accentColor ? undefined : 'accent.default'}
          pl="3"
        >
          <Text fontSize="lg" fontWeight="bold" overflowWrap="anywhere">
            {liveName}
          </Text>
          {liveSub && (
            <Text color="mypick.muted" fontSize="sm">
              {liveSub}
            </Text>
          )}
        </Stack>

        <Stack gap="3">
          <Text fontSize="md" fontWeight="bold">
            {t('mypick_live.awards.section')}
          </Text>
          <Grid
            gap="3"
            gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
          >
            {awards.map((card) => (
              <PickCard
                key={card.id}
                card={card}
                editable={editable}
                onPick={onPick}
                onClear={onClear}
                onRemove={onRemove}
              />
            ))}
          </Grid>
        </Stack>

        {units.length > 0 && (
          <Stack gap="3">
            <Text fontSize="md" fontWeight="bold">
              {t('mypick_live.units.section')}
            </Text>
            <Grid
              gap="3"
              gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
            >
              {units.map((card) => (
                <PickCard
                  key={card.id}
                  card={card}
                  editable={editable}
                  onPick={onPick}
                  onClear={onClear}
                />
              ))}
            </Grid>
          </Stack>
        )}

        {exporting && (
          <Text
            color="mypick.muted"
            fontSize="xs"
            fontWeight="semibold"
            letterSpacing="0.18em"
            textAlign="center"
            textTransform="uppercase"
          >
            {SITE_DISPLAY_URL}
          </Text>
        )}
      </Stack>
    );
  }
);
