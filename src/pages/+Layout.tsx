import { join } from 'path-browserify';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiX } from 'react-icons/bi';
import {
  FaCalendarDays,
  FaChartSimple,
  FaEllipsis,
  FaHouse,
  FaMapLocationDot,
  FaMusic,
  FaTicket
} from 'react-icons/fa6';
import { Box, Container, HStack, Stack } from 'styled-system/jsx';
import { ColorModeToggle } from '~/components/layout/ColorModeToggle';
import { Footer } from '~/components/layout/Footer';
import { LanguageToggle } from '~/components/layout/LanguageToggle';
import { SettingsMenu } from '~/components/layout/SettingsMenu';
import { Drawer } from '~/components/ui/drawer';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { getAssetUrl } from '~/utils/assets';
import { usePageContext } from 'vike-react/usePageContext';

const NAV_ITEMS = [
  { path: '/', key: 'navigation.home', exact: true, icon: FaHouse },
  { path: '/events', key: 'navigation.events', icon: FaTicket },
  { path: '/calendar', key: 'navigation.calendar', icon: FaCalendarDays },
  { path: '/venues', key: 'navigation.venues', icon: FaMapLocationDot },
  { path: '/stats', key: 'navigation.stats', icon: FaChartSimple },
  { path: '/songs', key: 'navigation.songs', icon: FaMusic },
  { path: '/mypick', key: 'navigation.mypick', icon: FaChartSimple }
];

const MOBILE_PRIMARY_NAV_ITEMS = NAV_ITEMS.filter(({ path }) =>
  ['/', '/events', '/calendar', '/songs'].includes(path)
);

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { urlPathname } = usePageContext();
  const currentPath = join(import.meta.env.BASE_URL, urlPathname);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isActivePath = (path: string, exact?: boolean) => {
    const href = join(import.meta.env.BASE_URL, path);
    return exact ? currentPath === href : currentPath.startsWith(href);
  };

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  function NavLinks() {
    return (
      <>
        {NAV_ITEMS.map(({ path, key, exact }) => {
          const href = join(import.meta.env.BASE_URL, path);
          const isActive = isActivePath(path, exact);
          return (
            <Link
              key={path}
              href={href}
              data-active={isActive ? true : undefined}
              onClick={() => setIsDrawerOpen(false)}
              _active={{ fontWeight: 'bold' }}
            >
              {t(key)}
            </Link>
          );
        })}
      </>
    );
  }

  function MobileBottomNav() {
    return (
      <Box
        hideFrom="md"
        zIndex="40"
        position="fixed"
        left="3"
        right="3"
        bottom="3"
        pb="env(safe-area-inset-bottom)"
        pointerEvents="none"
      >
        <HStack
          gap="1"
          justifyContent="space-between"
          borderColor="border.subtle"
          borderRadius="full"
          borderWidth="1px"
          py="1.5"
          px="2"
          bgColor="bg.default/95"
          boxShadow="lg"
          backdropFilter="blur(18px)"
          pointerEvents="auto"
        >
          {MOBILE_PRIMARY_NAV_ITEMS.map(({ path, key, exact, icon: Icon }) => {
            const href = join(import.meta.env.BASE_URL, path);
            const isActive = isActivePath(path, exact);
            return (
              <Link
                key={path}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive ? true : undefined}
                display="flex"
                flex="1"
                gap="0.5"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                borderRadius="full"
                minW="0"
                minH="12"
                color={isActive ? 'accent.text' : 'fg.muted'}
                textDecoration="none"
                fontSize="2xs"
                fontWeight={isActive ? 'semibold' : 'medium'}
                bgColor={isActive ? 'accent.subtle' : 'transparent'}
                _hover={{
                  bgColor: isActive ? 'accent.subtle' : 'bg.subtle',
                  textDecoration: 'none'
                }}
              >
                <Icon size={17} />
                <Text as="span" maxW="full" truncate>
                  {t(key)}
                </Text>
              </Link>
            );
          })}
          <Button
            aria-label={t('common.open_menu')}
            aria-expanded={isDrawerOpen}
            variant="ghost"
            onClick={() => setIsDrawerOpen(true)}
            display="flex"
            flex="1"
            gap="0.5"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            borderRadius="full"
            minW="0"
            minH="12"
            color={isDrawerOpen ? 'accent.text' : 'fg.muted'}
            fontSize="2xs"
            fontWeight={isDrawerOpen ? 'semibold' : 'medium'}
            bgColor={isDrawerOpen ? 'accent.subtle' : 'transparent'}
          >
            <FaEllipsis size={17} />
            <Text as="span" maxW="full" truncate>
              {t('common.menu', { defaultValue: 'Menu' })}
            </Text>
          </Button>
        </HStack>
      </Box>
    );
  }

  return (
    <Stack position="relative" w="full" minH="100vh" bgColor="bg.default">
      <Container
        zIndex="1"
        position="relative"
        flex={1}
        w="full"
        px={4}
        pt={4}
        pb={{ base: '24', md: '4' }}
      >
        <Stack>
          <HStack justifyContent="space-between" alignItems="center" w="full">
            <HStack gap="4" alignItems="center">
              <Link href={join(import.meta.env.BASE_URL, '/')} _hover={{ textDecoration: 'none' }}>
                <Text color="accent.default" fontSize="lg" fontWeight="bold">
                  LLerNote
                </Text>
              </Link>
              <HStack hideBelow="md">
                <NavLinks />
              </HStack>
            </HStack>

            <HStack hideBelow="md" justifySelf="flex-end">
              <LanguageToggle />
              <ColorModeToggle />
              <SettingsMenu />
            </HStack>
          </HStack>
          {children}
        </Stack>
      </Container>
      <Footer />
      <MobileBottomNav />

      <Drawer.Root open={isDrawerOpen} onOpenChange={(e) => setIsDrawerOpen(e.open)}>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <HStack justifyContent="space-between" alignItems="center" w="full">
                <Drawer.Title>{t('common.menu', { defaultValue: 'Menu' })}</Drawer.Title>
                <Drawer.CloseTrigger asChild>
                  <IconButton variant="ghost" size="sm">
                    <BiX size={24} />
                  </IconButton>
                </Drawer.CloseTrigger>
              </HStack>
            </Drawer.Header>
            <Drawer.Body>
              <Stack gap={4}>
                <NavLinks />
              </Stack>
            </Drawer.Body>
            <Drawer.Footer>
              <HStack justifyContent="space-between" w="full">
                <LanguageToggle />
                <HStack>
                  <ColorModeToggle />
                  <SettingsMenu />
                </HStack>
              </HStack>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>

      <Box
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(228,0,127,0.14) 0%, rgba(0,152,240,0.05) 45%, transparent 70%)'
        }}
        zIndex="0"
        position="fixed"
        top="-40%"
        left="50%"
        transform="translateX(-50%)"
        w="140vw"
        h="80vh"
        pointerEvents="none"
      />
      <Box
        style={{
          ['--bg-image' as 'backgroundImage']: `url('${getAssetUrl('/assets/bg.webp')}')`
        }}
        zIndex="0"
        position="fixed"
        top="0"
        left="0"
        w="100vw"
        h="100vh"
        backgroundPosition="center"
        backgroundAttachment="fixed"
        backgroundImage="var(--bg-image)"
        backgroundSize="cover"
        opacity="0.03"
        mixBlendMode={{ base: 'darken', _dark: 'lighten' }}
        pointerEvents="none"
      />
    </Stack>
  );
}
