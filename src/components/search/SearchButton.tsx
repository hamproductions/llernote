import { useTranslation } from 'react-i18next';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { HStack } from 'styled-system/jsx';
import { Button } from '~/components/ui/button';
import { Kbd } from '~/components/ui/kbd';
import { useCommandPalette } from './CommandPaletteProvider';

export function SearchButton() {
  const { t } = useTranslation();
  const { open } = useCommandPalette();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={open}
      aria-label={t('search.open', { defaultValue: 'Search' })}
    >
      <FaMagnifyingGlass />
      <HStack hideBelow="md" gap="1.5">
        {t('search.label', { defaultValue: 'Search' })}
        <Kbd>⌘K</Kbd>
      </HStack>
    </Button>
  );
}
