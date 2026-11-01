import { Stack } from 'styled-system/jsx';
import { Metadata } from '~/components/layout/Metadata';
import { SetlistdleGame } from '~/components/setlistdle/SetlistdleGame';

export default function Page() {
  return (
    <>
      <Metadata title="SetlistDle · LLerNote" helmet />
      <Stack gap="6" py={{ base: '4', md: '8' }}>
        <SetlistdleGame />
      </Stack>
    </>
  );
}
