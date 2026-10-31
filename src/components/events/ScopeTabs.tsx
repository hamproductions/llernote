import { useTranslation } from 'react-i18next';
import { Box, HStack } from 'styled-system/jsx';
import type { Scope } from '~/utils/attendance/witness';

const SCOPES: Scope[] = ['all', 'inperson', 'remote'];

export function ScopeTabs({
  value,
  onChange,
  size = 'sm'
}: {
  value: Scope;
  onChange: (scope: Scope) => void;
  size?: 'xs' | 'sm';
}) {
  const { t } = useTranslation();
  return (
    <HStack
      role="group"
      aria-label={t('settings.scope_label')}
      gap="0.5"
      borderColor="border.default"
      borderRadius="l2"
      borderWidth="1px"
      p="0.5"
      bgColor="bg.default"
    >
      {SCOPES.map((scope) => {
        const on = value === scope;
        const label = t(`common.scope_${scope}` as 'common.scope_all');
        return (
          <Box
            as="button"
            key={scope}
            onClick={() => onChange(scope)}
            aria-pressed={on}
            aria-label={label}
            cursor="pointer"
            borderRadius="l1"
            py={size === 'xs' ? '0.5' : '1'}
            px={size === 'xs' ? '2' : '2.5'}
            color={on ? 'accent.fg' : 'fg.muted'}
            fontSize={size === 'xs' ? 'xs' : 'sm'}
            fontWeight="medium"
            bgColor={on ? 'accent.default' : 'transparent'}
            whiteSpace="nowrap"
            _hover={on ? undefined : { bgColor: 'bg.subtle' }}
          >
            {label}
          </Box>
        );
      })}
    </HStack>
  );
}
