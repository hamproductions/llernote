import { createContext, useContext, useState } from 'react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, HStack, Wrap } from 'styled-system/jsx';
import { SectionHeading } from '~/components/layout/SectionHeading';
import { useAnalysis } from '~/hooks/useAnalysis';
import { useDetail } from '~/components/detail/DetailStack';
import { useSongById } from '~/hooks/useData';
import { localizedName } from '~/utils/names';

export const GROUP_LABEL: Record<string, { en: string; ja: string }> = {
  "μ's": { en: "μ's", ja: "μ's" },
  Aqours: { en: 'Aqours', ja: 'Aqours' },
  Nijigasaki: { en: 'Nijigasaki', ja: '虹ヶ咲' },
  'Liella!': { en: 'Liella!', ja: 'Liella!' },
  Hasunosora: { en: 'Hasunosora', ja: '蓮ノ空' },
  'Ikizurai-bu!': { en: 'Ikizurai-bu!', ja: 'イキヅライブ' },
  Yohane: { en: 'Yohane', ja: '幻日のヨハネ' },
  'School Idol Musical': { en: 'Musical', ja: 'スクールアイドルミュージカル' }
};

export const NEW = '#22d3ee';
export const REG = '#64748b';
export const RET = '#f59e0b';
export const DAYS = '#3b82f6';
export const LEGS = '#22d3ee';
export const ANY = '#a855f7';
export const TYPE: Record<string, string> = {
  group: '#3b82f6',
  subunit: '#a855f7',
  solo: '#ec4899',
  collab: '#64748b',
  unknown: '#64748b'
};
export const FLOW_C: Record<string, string> = {
  main: 'var(--colors-accent-default)',
  encore: 'var(--colors-accent-7)',
  mc: '#f59e0b',
  vtr: '#a855f7',
  other: 'var(--colors-fg-muted)'
};
export const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);

type Tip = { x: number; y: number; label: string; color?: string } | null;

type InfoCtx = {
  d: any;
  t: (k: string, o?: any) => string;
  lang: 'en' | 'ja';
  groups: string[];
  spinoff: string[];
  includeSpinoff: boolean;
  setIncludeSpinoff: (v: boolean) => void;
  gLabel: (g: string) => string;
  typeLabel: (k: string) => string;
  songName: (id: string) => string;
  hover: (label: string, color?: string) => any;
  openSong: (id: string) => void;
  openEvent: (id: string) => void;
};

const Ctx = createContext<InfoCtx | null>(null);
export const useInfo = () => useContext(Ctx) as InfoCtx;

export function InfographicProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const [includeSpinoff, setIncludeSpinoff] = useState(false);
  const d = useAnalysis(includeSpinoff) as any;
  const { openSong, openEvent } = useDetail();
  const songById = useSongById();
  const [tip, setTip] = useState<Tip>(null);
  const lang = i18n.language === 'ja' ? 'ja' : 'en';
  const gLabel = (g: string) => GROUP_LABEL[g]?.[lang] ?? g;
  const typeLabel = (k: string) => t(`infographic.type_${k}`);
  const songName = (id: string) => {
    const s = songById.get(id);
    return s ? localizedName(i18n.language, s.name, s.englishName) : id;
  };
  const hover = (label: string, color?: string) => ({
    onMouseMove: (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, label, color }),
    onMouseLeave: () => setTip(null),
    style: { cursor: 'default' as const }
  });
  const spinoff: string[] = d.spinoff ?? [];
  const allGroups = d.canon.filter((g: string) => d.byGroup[g]);
  const groups = includeSpinoff ? allGroups : allGroups.filter((g: string) => !spinoff.includes(g));
  const value: InfoCtx = {
    d,
    t,
    lang,
    groups,
    spinoff,
    includeSpinoff,
    setIncludeSpinoff,
    gLabel,
    typeLabel,
    songName,
    hover,
    openSong,
    openEvent
  };
  return (
    <Ctx.Provider value={value}>
      {tip && (
        <Box
          style={{
            left: Math.min(tip.x + 14, window.innerWidth - 300),
            top: tip.y + 14,
            whiteSpace: 'pre-line',
            borderLeft: `3px solid ${tip.color ?? 'var(--colors-accent-default)'}`
          }}
          zIndex={9999}
          position="fixed"
          borderColor="border.default"
          borderRadius="md"
          borderWidth="1px"
          maxW="320px"
          py="1.5"
          px="2.5"
          fontSize="xs"
          bg="bg.default"
          boxShadow="lg"
          pointerEvents="none"
        >
          {tip.label}
        </Box>
      )}
      {children}
    </Ctx.Provider>
  );
}

export const Panel = ({ children }: { children: React.ReactNode }) => (
  <Box borderColor="border.subtle" borderRadius="l2" borderWidth="1px" p="4" bg="bg.default">
    {children}
  </Box>
);

export const H = ({ children }: { children: React.ReactNode }) => (
  <Box mt="6">
    <SectionHeading size="lg">{children}</SectionHeading>
  </Box>
);

export const Legend = ({ items }: { items: [string, string][] }) => (
  <Wrap gap="4" mt="2" color="fg.muted" fontSize="xs">
    {items.map(([col, label]) => (
      <HStack key={label} gap="1.5">
        <Box style={{ background: col }} borderRadius="2px" w="2.5" h="2.5" />
        <span>{label}</span>
      </HStack>
    ))}
  </Wrap>
);

export const gridX = (x0: number, x1: number, yTop: number, yBot: number) =>
  [0, 0.25, 0.5, 0.75, 1].map((tk) => {
    const x = x0 + (x1 - x0) * tk;
    return (
      <g key={tk}>
        <line x1={x} y1={yTop} x2={x} y2={yBot} stroke="currentColor" opacity={0.12} />
        <text
          x={x}
          y={yBot + 14}
          textAnchor="middle"
          fill="currentColor"
          opacity={0.55}
          fontSize={11}
        >
          {Math.round(tk * 100)}%
        </text>
      </g>
    );
  });

export function GName({
  g,
  x,
  y,
  anchor = 'end',
  size = 13
}: {
  g: string;
  x: number;
  y: number;
  anchor?: 'end' | 'start' | 'middle';
  size?: number;
}) {
  const { d, gLabel } = useInfo();
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={d.groupColor[g]}
      fontSize={size}
      fontWeight={700}
      dominantBaseline="middle"
    >
      {gLabel(g)}
    </text>
  );
}
