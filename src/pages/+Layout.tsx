import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiX } from 'react-icons/bi';
import {
  FaCalendarDays,
  FaChartPie,
  FaChartSimple,
  FaEllipsis,
  FaHouse,
  FaMapLocationDot,
  FaMusic,
  FaStar,
  FaTicket
} from 'react-icons/fa6';
import { Box, Container, HStack, Stack } from 'styled-system/jsx';
import { DetailStackProvider } from '~/components/detail/DetailStack';
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
import { isActiveRoute, toAppUrl } from '~/utils/url';
import { usePageContext } from 'vike-react/usePageContext';

interface NavItem {
  path: string;
  key: string;
  icon: React.ComponentType<{ size?: number }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', key: 'navigation.home', exact: true, icon: FaHouse },
  { path: '/events', key: 'navigation.events', icon: FaTicket },
  { path: '/calendar', key: 'navigation.calendar', icon: FaCalendarDays },
  { path: '/venues', key: 'navigation.venues', icon: FaMapLocationDot },
  { path: '/stats', key: 'navigation.stats', icon: FaChartSimple },
  { path: '/songs', key: 'navigation.songs', icon: FaMusic },
  { path: '/infographic', key: 'navigation.infographic', icon: FaChartPie },
  { path: '/mypick', key: 'navigation.mypick', icon: FaStar }
];

const MOBILE_PRIMARY_PATHS = ['/', '/events', '/calendar', '/songs'];
const MOBILE_PRIMARY_NAV_ITEMS = NAV_ITEMS.filter(({ path }) =>
  MOBILE_PRIMARY_PATHS.includes(path)
);

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { urlPathname } = usePageContext();
  const currentPath = toAppUrl(urlPathname);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  function HeaderNav() {
    return (
      <>
        {NAV_ITEMS.map(({ path, key, exact, icon: Icon }) => {
          const isActive = isActiveRoute(path, currentPath, exact);
          return (
            <Link
              key={path}
              href={toAppUrl(path)}
              aria-label={t(key)}
              aria-current={isActive ? 'page' : undefined}
              data-active={isActive ? true : undefined}
              display="flex"
              gap="1.5"
              alignItems="center"
              borderRadius="md"
              py="1.5"
              px={{ base: '2', lg: '2.5' }}
              color={isActive ? 'accent.text' : 'fg.muted'}
              textDecoration="none"
              fontSize="sm"
              fontWeight={isActive ? 'semibold' : 'medium'}
              bgColor={isActive ? 'accent.subtle' : 'transparent'}
              whiteSpace="nowrap"
              _hover={{ bgColor: isActive ? 'accent.subtle' : 'bg.subtle', textDecoration: 'none' }}
            >
              <Icon size={15} />
              <Text as="span" hideBelow="lg">
                {t(key)}
              </Text>
            </Link>
          );
        })}
      </>
    );
  }

  function DrawerNav() {
    return (
      <>
        {NAV_ITEMS.map(({ path, key, exact, icon: Icon }) => {
          const isActive = isActiveRoute(path, currentPath, exact);
          return (
            <Link
              key={path}
              href={toAppUrl(path)}
              aria-current={isActive ? 'page' : undefined}
              data-active={isActive ? true : undefined}
              onClick={() => setIsDrawerOpen(false)}
              display="flex"
              gap="3"
              alignItems="center"
              borderRadius="md"
              w="full"
              py="2.5"
              px="3"
              color={isActive ? 'accent.text' : 'fg.default'}
              textDecoration="none"
              fontSize="md"
              fontWeight={isActive ? 'semibold' : 'medium'}
              bgColor={isActive ? 'accent.subtle' : 'transparent'}
              _hover={{ bgColor: isActive ? 'accent.subtle' : 'bg.subtle', textDecoration: 'none' }}
            >
              <Icon size={18} />
              {t(key)}
            </Link>
          );
        })}
      </>
    );
  }

  function MobileBottomNav() {
    return (
      <Stack
        hideFrom="md"
        zIndex="overlay"
        position="fixed"
        left="0"
        right="0"
        bottom="0"
        justifyContent="center"
        borderColor="border.default"
        borderTopWidth="1px"
        w="full"
        px="4"
        pt="2"
        pb="calc(env(safe-area-inset-bottom) + 0.5rem)"
        bgColor="bg.default"
      >
        <HStack justifyContent="space-evenly" w="full">
          {MOBILE_PRIMARY_NAV_ITEMS.map(({ path, key, exact, icon: Icon }) => {
            const isActive = isActiveRoute(path, currentPath, exact);
            return (
              <Link
                key={path}
                href={toAppUrl(path)}
                aria-label={t(key)}
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive ? true : undefined}
                display="flex"
                flex="1"
                justifyContent="center"
                alignItems="center"
                rounded="md"
                py="2"
                color={isActive ? 'accent.default' : 'fg.muted'}
                bgColor={isActive ? 'bg.emphasized' : 'transparent'}
                _hover={{ bgColor: 'bg.emphasized', textDecoration: 'none' }}
              >
                <Icon size={20} />
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
            justifyContent="center"
            alignItems="center"
            rounded="md"
            w="full"
            minW="0"
            h="auto"
            py="2"
            color={isDrawerOpen ? 'accent.default' : 'fg.muted'}
            bgColor={isDrawerOpen ? 'bg.emphasized' : 'transparent'}
            _hover={{ bgColor: 'bg.emphasized' }}
          >
            <FaEllipsis size={20} />
          </Button>
        </HStack>
      </Stack>
    );
  }

  return (
    <DetailStackProvider>
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
                <Link href={toAppUrl('/')} _hover={{ textDecoration: 'none' }}>
                  <Text color="accent.default" fontSize="lg" fontWeight="bold">
                    LLerNote
                  </Text>
                </Link>
                <HStack hideBelow="md" gap="0.5">
                  <HeaderNav />
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
                <Stack gap={1}>
                  <DrawerNav />
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
    </DetailStackProvider>
  );
}
