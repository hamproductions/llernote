import { usePageContext } from 'vike-react/usePageContext';
import { Center, Stack } from 'styled-system/jsx';
import { Text } from '~/components/ui/text';

export default function Page() {
  const { is404 } = usePageContext();
  return (
    <Center minH="50vh">
      <Stack alignItems="center">
        <Text fontSize="4xl" fontWeight="bold">
          {is404 ? '404' : '500'}
        </Text>
        <Text>{is404 ? 'Page not found' : 'Something went wrong'}</Text>
      </Stack>
    </Center>
  );
}
