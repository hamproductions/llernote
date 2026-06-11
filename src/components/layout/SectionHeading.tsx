import type { ReactNode } from 'react';
import { Box, HStack } from 'styled-system/jsx';
import { Heading } from '~/components/ui/heading';

export function SectionHeading({
  children,
  size = 'lg'
}: {
  children: ReactNode;
  size?: 'lg' | '2xl';
}) {
  return (
    <HStack gap="2.5" alignItems="center">
      <Box
        style={{ background: 'linear-gradient(180deg, #e4007f, #ff7a00)' }}
        alignSelf="stretch"
        borderRadius="full"
        w="1"
      />
      <Heading as={size === '2xl' ? 'h1' : 'h2'} textStyle="display" fontSize={size}>
        {children}
      </Heading>
    </HStack>
  );
}
