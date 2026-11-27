import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaChevronDown, FaCopy } from 'react-icons/fa6';
import { Grid, HStack } from 'styled-system/jsx';
import { ExportMenu, ExportMenuGroup, ExportMenuItem } from './ExportMenu';
import { Button } from '~/components/ui/button';
import { IconButton } from '~/components/ui/icon-button';

export interface CopyOption {
  id: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  disabled?: boolean;
  onCopy: () => Promise<unknown> | void;
}

export function CopySplitButton({ options }: { options: CopyOption[] }) {
  const { t } = useTranslation();
  const [copiedAt, setCopiedAt] = useState<number>();
  const [primary] = options;

  useEffect(() => {
    if (!copiedAt) return;
    const timeout = setTimeout(() => setCopiedAt(undefined), 2000);
    return () => clearTimeout(timeout);
  }, [copiedAt]);

  const copy = async (option: CopyOption) => {
    await option.onCopy();
    setCopiedAt(Date.now());
  };

  return (
    <HStack gap="0">
      <Button
        size="sm"
        onClick={() => void copy(primary)}
        disabled={primary.disabled}
        borderEndRadius="0"
        minH={{ base: '11', sm: '9' }}
      >
        <Grid justifyItems="center">
          <HStack visibility={copiedAt ? 'hidden' : undefined} gap="2" gridArea="1 / 1">
            {primary.icon ?? <FaCopy />} {primary.label}
          </HStack>
          <HStack visibility={copiedAt ? undefined : 'hidden'} gap="2" gridArea="1 / 1">
            <FaCheck /> {t('share.copied')}
          </HStack>
        </Grid>
      </Button>
      <ExportMenu
        placement="bottom-end"
        trigger={
          <IconButton
            size="sm"
            aria-label={t('share.copy_choices')}
            alignSelf="stretch"
            borderStartWidth="1px"
            borderStartColor="white.a8"
            borderStartRadius="0"
            w={{ base: '11', sm: '9' }}
            h="auto"
          >
            <FaChevronDown />
          </IconButton>
        }
      >
        <ExportMenuGroup label={t('share.copy')}>
          {options.map((option) => (
            <ExportMenuItem
              key={option.id}
              value={option.id}
              disabled={option.disabled}
              onClick={() => void copy(option)}
              icon={option.icon ?? <FaCopy />}
              label={option.label}
              description={option.description}
            />
          ))}
        </ExportMenuGroup>
      </ExportMenu>
    </HStack>
  );
}
