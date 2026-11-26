import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiX } from 'react-icons/bi';
import {
  FaCalendarDays,
  FaChartPie,
  FaChartSimple,
  FaChevronDown,
  FaCircleQuestion,
  FaEllipsis,
  FaHouse,
  FaMapLocationDot,
  FaMusic,
  FaPeopleGroup,
  FaWandMagicSparkles,
  FaShirt,
  FaScaleBalanced,
  FaStar,
  FaTicket,
  FaTrophy
} from 'react-icons/fa6';
import { Box, Container, HStack, Stack } from 'styled-system/jsx';
import { DetailStackProvider } from '~/components/detail/DetailStack';
import { CommandPaletteProvider } from '~/components/search/CommandPaletteProvider';
import { SearchButton } from '~/components/search/SearchButton';
import { ColorModeToggle } from '~/components/layout/ColorModeToggle';
import { Footer } from '~/components/layout/Footer';
import { LanguageToggle } from '~/components/layout/LanguageToggle';
import { SettingsMenu } from '~/components/layout/SettingsMenu';
import { Drawer } from '~/components/ui/drawer';
import { Menu } from '~/components/ui/menu';
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

interface NavGroup {
  id: string;
  key: string;
  icon: React.ComponentType<{ size?: number }>;
  items: NavItem[];
}

/** Everyday pages stay one click away. */
const PRIMARY_ITEMS: NavItem[] = [
  { path: '/', key: 'navigation.home', exact: true, icon: FaHouse },
  { path: '/events', key: 'navigation.events', icon: FaTicket },
  { path: '/calendar', key: 'navigation.calendar', icon: FaCalendarDays },
  { path: '/venues', key: 'navigation.venues', icon: FaMapLocationDot },
  { path: '/songs', key: 'navigation.songs', icon: FaMusic },
  { path: '/sort', key: 'navigation.sort', icon: FaScaleBalanced },
  { path: '/costumes', key: 'navigation.costumes', icon: FaShirt }
];

/** Statistics and the things you make live in dropdowns so the header stays short. */
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'insights',
    key: 'navigation.group_insights',
    icon: FaChartSimple,
    items: [
      { path: '/stats', key: 'navigation.stats', icon: FaChartSimple },
      { path: '/infographic', key: 'navigation.infographic', icon: FaChartPie },
      { path: '/fes', key: 'navigation.fes', icon: FaPeopleGroup }
    ]
  },
  {
    id: 'create',
    key: 'navigation.group_create',
    icon: FaWandMagicSparkles,
    items: [
      { path: '/create', key: 'completion.title', icon: FaMusic },
      { path: '/mypick', key: 'navigation.mypick', exact: true, icon: FaStar },
      { path: '/mypick/live', key: 'navigation.mypick_live', icon: FaTrophy },
      { path: '/bingo', key: 'bingo.title', icon: FaMusic },
      { path: '/nickname-quiz', key: 'nicknameQuiz.title', icon: FaCircleQuestion }
    ]
  }
];

const NAV_ITEMS: NavItem[] = [...PRIMARY_ITEMS, ...NAV_GROUPS.flatMap((g) => g.items)];

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
        {PRIMARY_ITEMS.map(({ path, key, exact, icon: Icon }) => {
          const isActive = isActiveRoute(path, currentPath, exact);
          return (
            <Link
              key={path}
              href={toAppUrl(path)}
              aria-label={t(key)}
              aria-current={isActive ? 'page' : undefined}
              data-active={isActive ? true : undefined}
              display="flex"
              gap="1"
              alignItems="center"
              borderRadius="md"
              py="1.5"
              px={{ base: '1', lg: '1.5', xl: '2' }}
              color={isActive ? 'accent.text' : 'fg.muted'}
              textDecoration="none"
              fontSize="sm"
              fontWeight={isActive ? 'semibold' : 'medium'}
              bgColor={isActive ? 'accent.subtle' : 'transparent'}
              whiteSpace="nowrap"
              _hover={{ bgColor: isActive ? 'accent.subtle' : 'bg.subtle', textDecoration: 'none' }}
            >
              <Icon size={15} />
              <Text as="span" hideBelow="2xl">
                {t(key)}
              </Text>
            </Link>
          );
        })}
        {NAV_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const groupActive = group.items.some((item) =>
            isActiveRoute(item.path, currentPath, item.exact)
          );
          return (
            <Menu.Root key={group.id} positioning={{ placement: 'bottom-start', gutter: 6 }}>
              <Menu.Trigger asChild>
                <Box
                  as="button"
                  aria-label={t(group.key)}
                  data-active={groupActive ? true : undefined}
                  cursor="pointer"
                  display="flex"
                  gap="1"
                  alignItems="center"
                  borderRadius="md"
                  py="1.5"
                  px={{ base: '1', lg: '1.5', xl: '2' }}
                  color={groupActive ? 'accent.text' : 'fg.muted'}
                  fontSize="sm"
                  fontWeight={groupActive ? 'semibold' : 'medium'}
                  bgColor={groupActive ? 'accent.subtle' : 'transparent'}
                  whiteSpace="nowrap"
                  _hover={{ bgColor: groupActive ? 'accent.subtle' : 'bg.subtle' }}
                >
                  <GroupIcon size={15} />
                  <Text as="span" hideBelow="lg">
                    {t(group.key)}
                  </Text>
                  <FaChevronDown size={9} />
                </Box>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content minW="52">
                  {group.items.map(({ path, key, exact, icon: Icon }) => {
                    const isActive = isActiveRoute(path, currentPath, exact);
                    return (
                      <Menu.Item key={path} value={path} asChild>
                        <Link
                          href={toAppUrl(path)}
                          aria-current={isActive ? 'page' : undefined}
                          display="flex"
                          gap="2.5"
                          alignItems="center"
                          color={isActive ? 'accent.text' : 'fg.default'}
                          textDecoration="none"
                          fontWeight={isActive ? 'semibold' : 'medium'}
                          _hover={{ textDecoration: 'none' }}
                        >
                          <Icon size={14} />
                          {t(key)}
                        </Link>
                      </Menu.Item>
                    );
                  })}
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          );
        })}
      </>
    );
  }

  function DrawerNav() {
    const drawerLink = ({ path, key, exact, icon: Icon }: NavItem) => {
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
    };
    return (
      <>
        {PRIMARY_ITEMS.map(drawerLink)}
        {NAV_GROUPS.map((group) => (
          <Stack key={group.id} gap="1" mt="3">
            <Text
              px="3"
              color="fg.subtle"
              fontSize="xs"
              fontWeight="semibold"
              letterSpacing="wide"
              textTransform="uppercase"
            >
              {t(group.key)}
            </Text>
            {group.items.map(drawerLink)}
          </Stack>
        ))}
      </>
    );
  }

  function MobileBottomNav() {
    return (
      <Stack
        hideFrom="lg"
        zIndex="30"
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
      <CommandPaletteProvider>
        <Stack
          position="relative"
          w="full"
          minH="100vh"
          pb={{ base: 'calc(env(safe-area-inset-bottom) + 64px)', lg: '0' }}
          bgColor="bg.default"
        >
          <Container zIndex="1" position="relative" flex={1} w="full" px={4} pt={4} pb="4">
            <Stack>
              <HStack justifyContent="space-between" alignItems="center" w="full">
                <HStack gap="4" alignItems="center">
                  <Link href={toAppUrl('/')} _hover={{ textDecoration: 'none' }}>
                    <Text color="accent.default" fontSize="lg" fontWeight="bold">
                      LLerNote
                    </Text>
                  </Link>
                  <HStack hideBelow="lg" gap="0.5">
                    <HeaderNav />
                  </HStack>
                </HStack>

                <HStack gap="3" alignItems="center" justifySelf="flex-end">
                  <SearchButton />
                  <HStack hideBelow="lg" gap="2">
                    <LanguageToggle />
                    <ColorModeToggle />
                    <SettingsMenu />
                  </HStack>
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
      </CommandPaletteProvider>
    </DetailStackProvider>
  );
}
