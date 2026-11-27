import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaChevronDown, FaImage } from 'react-icons/fa6';
import { Box } from 'styled-system/jsx';
import { ExportMenu, ExportMenuGroup, ExportMenuItem, ExportMenuItemBody } from './ExportMenu';
import type { ActionItem } from './ExportMenu';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Menu } from '~/components/ui/menu';
import { Spinner } from '~/components/ui/spinner';
import type { useAbbreviatedExport } from '~/hooks/useAbbreviations';

export function ImageMenu({
  actions,
  busy,
  exportNames,
  ...triggerProps
}: {
  actions: ActionItem[];
  busy: boolean;
  exportNames: Pick<ReturnType<typeof useAbbreviatedExport>, 'abbreviate' | 'setAbbreviate'>;
} & Omit<ComponentProps<typeof Button>, 'children'>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { abbreviate, setAbbreviate } = exportNames;

  return (
    <ExportMenu
      open={open && !busy}
      onOpenChange={(details) => setOpen(details.open && !busy)}
      trigger={
        <Button
          size="sm"
          variant="outline"
          aria-busy={busy}
          aria-disabled={busy}
          cursor={busy ? 'not-allowed' : 'pointer'}
          gap="2"
          minH={{ base: '11', sm: '9' }}
          opacity={busy ? 0.6 : 1}
          {...triggerProps}
        >
          {busy ? <Spinner size="sm" /> : <FaImage />}
          {t('share.image')}
          {abbreviate && (
            <Badge size="sm" variant="solid">
              {t('share.abbreviated')}
            </Badge>
          )}
          <FaChevronDown />
        </Button>
      }
    >
      <ExportMenuGroup label={t('share.image')}>
        {actions.map((action) => (
          <ExportMenuItem
            key={action.id}
            value={action.id}
            onClick={action.onSelect}
            icon={action.icon}
            label={action.label}
          />
        ))}
      </ExportMenuGroup>
      <Menu.Separator />
      <Menu.CheckboxItem
        value="abbreviate"
        checked={abbreviate}
        onCheckedChange={setAbbreviate}
        closeOnSelect={false}
        cursor="pointer"
        gap="2.5"
        alignItems="flex-start"
        h="auto"
        minH={{ base: '12', sm: '10' }}
        py="2.5"
        _highlighted={{ bg: 'bg.emphasized' }}
      >
        <ExportMenuItemBody
          icon={
            <Box
              display="grid"
              borderColor="fg.muted"
              borderRadius="xs"
              borderWidth="1px"
              w="4"
              h="4"
              placeItems="center"
              css={{ '& svg': { w: '2.5', h: '2.5' } }}
            >
              {abbreviate && <FaCheck />}
            </Box>
          }
          label={t('share.abbreviate_image')}
        />
      </Menu.CheckboxItem>
    </ExportMenu>
  );
}
