import { useTranslation } from 'react-i18next';
import buildInfo from '../../../data/build-info.json';
import { Link } from '../ui/link';
import { Text } from '../ui/text';
import { Version } from '../utils/Version';
import { Stack, Wrap, HStack } from 'styled-system/jsx';

export function Footer() {
  const { t, i18n } = useTranslation();

  const formattedDate = new Date(buildInfo.lastUpdated).toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Stack gap="1" justifyContent="center" w="full" p="4" textAlign="center" bgColor="bg.muted">
      <Wrap justifyContent="center" w="full">
        <Text>{t('footer.footer_text')}</Text>
      </Wrap>
      <Wrap gap="1" justifyContent="center" alignItems="center" w="full">
        <Text>
          {t('footer.data_source')}{' '}
          <Link href="https://ll-fans.jp" target="_blank">
            LLFans
          </Link>
        </Text>
        <HStack>
          <Version format="version" />
          <Text color="fg.muted" fontSize="xs">
            {t('footer.data_updated', { date: formattedDate })}
          </Text>
        </HStack>
      </Wrap>
    </Stack>
  );
}
