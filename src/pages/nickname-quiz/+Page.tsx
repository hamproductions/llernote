import { useTranslation } from 'react-i18next';
import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { NicknameQuiz } from '~/components/nickname-quiz/NicknameQuiz';

export default function Page() {
  const { t } = useTranslation();
  return (
    <>
      <Metadata title={`${t('nicknameQuiz.title')} - LLerNote`} helmet />
      <Stack gap="6" py={{ base: '4', md: '8' }}>
        <NicknameQuiz />
      </Stack>
    </>
  );
}
