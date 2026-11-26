import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBoxArchive, FaChevronDown, FaChevronUp, FaRotateLeft } from 'react-icons/fa6';
import { HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import type { SortCandidate } from '~/utils/live-sort';

interface RetiredCandidatesPanelProps {
  retired: SortCandidate[];
  onRestore: (id: string) => void;
  onRestoreAll: () => void;
}

/**
 * Lists what has been retired from ranking so it can be brought back. Collapsed by
 * default: once someone has pruned dozens of lives they did not attend, the list is
 * long and rarely what they came to the setup screen for.
 */
export function RetiredCandidatesPanel({
  retired,
  onRestore,
  onRestoreAll
}: RetiredCandidatesPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (retired.length === 0) return null;

  return (
    <Stack gap="2">
      <HStack gap="2" flexWrap="wrap">
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <FaBoxArchive />
          {t('sort.retired_count', { count: retired.length })}
          {open ? <FaChevronUp /> : <FaChevronDown />}
        </Button>
        {open && (
          <Button variant="outline" size="sm" onClick={onRestoreAll}>
            <FaRotateLeft />
            {t('sort.restore_all')}
          </Button>
        )}
      </HStack>

      {open && (
        <Stack
          as="ul"
          gap="0"
          borderColor="border.default"
          borderRadius="l2"
          borderWidth="1px"
          maxH="20rem"
          overflowY="auto"
        >
          {retired.map((candidate) => (
            <HStack
              as="li"
              key={candidate.id}
              gap="3"
              justifyContent="space-between"
              borderColor="border.subtle"
              borderBottomWidth="1px"
              py="2"
              px="3"
              _last={{ borderBottomWidth: '0' }}
            >
              <Stack gap="0" minW="0">
                <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                  {candidate.title}
                </Text>
                <Text color="fg.subtle" fontSize="xs" lineClamp={1}>
                  {[candidate.subtitle, candidate.startDate].filter(Boolean).join(' · ')}
                </Text>
              </Stack>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onRestore(candidate.id)}
                aria-label={`${t('sort.restore')}: ${candidate.title}`}
                flexShrink={0}
              >
                {t('sort.restore')}
              </Button>
            </HStack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
