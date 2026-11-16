import { useTranslation } from 'react-i18next';
import { Box } from 'styled-system/jsx';
import { TYPE_COLOR, f1, f2, fesColor, fesSeriesName } from './fes-style';
import { SONG_TYPES, type FesDerived, type FesDiff, type FesSong } from '~/utils/fes-report';

const SVG = { width: '100%', height: 'auto', display: 'block', overflow: 'visible' } as const;
const TEXT = { fill: 'currentColor', fontSize: 12 } as const;
const MUTED = { ...TEXT, opacity: 0.65 } as const;

interface Click {
  onSong: (title: string, pick: (s: FesSong) => boolean) => void;
  onSeries: (series: string) => void;
  onPerformer: (id: string) => void;
}

export function SongTimeStack({ d, click }: { d: FesDerived; click: Click }) {
  const { t } = useTranslation();
  const rowH = 30;
  const lw = 120;
  const W = 900;
  const max = Math.max(1, ...d.songTime.map((r) => r.weight));
  const bw = W - lw - 70;
  return (
    <svg viewBox={`0 0 ${W} ${d.songTime.length * rowH + 4}`} style={SVG} role="img">
      {d.songTime.map((r, i) => {
        let x = lw;
        return (
          <g key={r.series}>
            <text x={lw - 8} y={i * rowH + 17} textAnchor="end" {...TEXT}>
              {fesSeriesName(r.series, t('fes.others'))}
            </text>
            {SONG_TYPES.map((type) => {
              const w = r.byType[type] ?? 0;
              if (!w) return null;
              const width = (w / max) * bw;
              const rect = (
                <rect
                  key={type}
                  x={x}
                  y={i * rowH + 3}
                  width={Math.max(width - 1, 1)}
                  height={20}
                  rx={2}
                  fill={TYPE_COLOR[type]}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    click.onSong(
                      `${fesSeriesName(r.series, t('fes.others'))} · ${t(`fes.type_${type}`)}`,
                      (s) => s.billed === r.series && s.type === type
                    )
                  }
                >
                  <title>{`${t(`fes.type_${type}`)}: ${f2(w)}`}</title>
                </rect>
              );
              x += width;
              return rect;
            })}
            <text x={x + 6} y={i * rowH + 17} {...MUTED}>
              {f1(r.weight)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function TypeLegend() {
  const { t } = useTranslation();
  return (
    <Box display="flex" gap="2" color="fg.muted" fontSize="xs" flexWrap="wrap">
      {SONG_TYPES.map((type) => (
        <span key={type}>
          <i
            style={{
              display: 'inline-block',
              width: 9,
              height: 9,
              borderRadius: 2,
              marginRight: 5,
              background: TYPE_COLOR[type]
            }}
          />
          {t(`fes.type_${type}`)}
        </span>
      ))}
    </Box>
  );
}

export function FlowStrip({ songs, click }: { songs: FesSong[]; click: Click }) {
  const H = 84;
  const W = 900;
  const gap = songs.length > 60 ? 1 : 2;
  const bw = (W - gap * (songs.length - 1)) / Math.max(songs.length, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} style={SVG} role="img">
      {songs.map((s, i) => {
        const h =
          s.weight === 1 ? H : s.weight >= 0.75 ? H * 0.8 : s.weight >= 0.5 ? H * 0.55 : H * 0.35;
        const total = Object.values(s.mix).reduce((a, b) => a + b, 0) || 1;
        let y = H;
        return (
          <g
            key={s.key}
            style={{ cursor: 'pointer' }}
            onClick={() => click.onSong(s.name, (x) => x.key === s.key)}
          >
            <title>{`${s.name} · ${s.members.length}`}</title>
            {Object.entries(s.mix).map(([series, n]) => {
              const hh = (h * n) / total;
              y -= hh;
              return (
                <rect
                  key={series}
                  x={i * (bw + gap)}
                  y={y}
                  width={bw}
                  height={Math.max(hh - 0.5, 1)}
                  fill={fesColor(series)}
                  rx={1}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function FranchiseDots({ d, click }: { d: FesDerived; click: Click }) {
  const { t } = useTranslation();
  const rows = d.franchises.filter((f) => f.series !== '5').sort((a, b) => b.avg - a.avg);
  const W = 900;
  const lw = 130;
  const mx = Math.max(10, Math.ceil(Math.max(1, ...rows.map((r) => r.max)) / 2) * 2);
  const X = (v: number) => lw + (v / mx) * (W - lw - 60);
  const H = rows.length * 34 + 22;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={SVG} role="img">
      {Array.from({ length: mx / 2 + 1 }, (_, i) => i * 2).map((v) => (
        <g key={v}>
          <line x1={X(v)} x2={X(v)} y1={0} y2={H - 18} stroke="currentColor" opacity={0.12} />
          <text x={X(v)} y={H - 3} textAnchor="middle" {...MUTED}>
            {v}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = i * 34 + 14;
        const c = fesColor(r.series);
        return (
          <g key={r.series} style={{ cursor: 'pointer' }} onClick={() => click.onSeries(r.series)}>
            <title>{`${fesSeriesName(r.series, t('fes.others'))}: ${f1(r.avg)} (${f2(r.min)}–${f2(r.max)})`}</title>
            <text
              x={lw - 8}
              y={y + 4}
              textAnchor="end"
              {...TEXT}
            >{`${fesSeriesName(r.series, t('fes.others'))} (${r.members})`}</text>
            <line
              x1={X(r.min)}
              x2={X(r.max)}
              y1={y}
              y2={y}
              stroke={c}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.45}
            />
            <circle cx={X(r.min)} cy={y} r={4} fill="none" stroke={c} strokeWidth={2} />
            <circle cx={X(r.max)} cy={y} r={4} fill="none" stroke={c} strokeWidth={2} />
            <circle cx={X(r.avg)} cy={y} r={7} fill={c} />
            <text x={X(r.max) + 10} y={y + 4} {...MUTED}>{`avg ${f1(r.avg)}`}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function CollabBars({ d, click }: { d: FesDerived; click: Click }) {
  const { t } = useTranslation();
  const rows = d.franchises
    .filter((f) => f.series !== '5')
    .sort((a, b) => b.collabShare - a.collabShare);
  const W = 900;
  const lw = 130;
  const bw = W - lw - 70;
  return (
    <svg viewBox={`0 0 ${W} ${rows.length * 28 + 4}`} style={SVG} role="img">
      {rows.map((r, i) => (
        <g key={r.series} style={{ cursor: 'pointer' }} onClick={() => click.onSeries(r.series)}>
          <title>{`${fesSeriesName(r.series, t('fes.others'))}: ${Math.round(r.collabShare * 100)}%`}</title>
          <text x={lw - 8} y={i * 28 + 16} textAnchor="end" {...TEXT}>
            {fesSeriesName(r.series, t('fes.others'))}
          </text>
          <rect
            x={lw}
            y={i * 28 + 3}
            width={bw}
            height={17}
            rx={4}
            fill="currentColor"
            opacity={0.1}
          />
          <rect
            x={lw}
            y={i * 28 + 3}
            width={Math.max(r.collabShare * bw, 1)}
            height={17}
            rx={4}
            fill={fesColor(r.series)}
          />
          <text
            x={lw + bw + 8}
            y={i * 28 + 16}
            {...MUTED}
          >{`${Math.round(r.collabShare * 100)}%`}</text>
        </g>
      ))}
    </svg>
  );
}

export function PerformerBars({
  d,
  limit,
  nameOf,
  click
}: {
  d: FesDerived;
  limit: number;
  nameOf: (id: string) => string;
  click: Click;
}) {
  const rows = d.performers.slice(0, limit);
  const W = 900;
  const lw = 160;
  const bw = W - lw - 70;
  const max = Math.max(1, ...d.performers.map((p) => p.weight));
  return (
    <svg viewBox={`0 0 ${W} ${rows.length * 26 + 4}`} style={SVG} role="img">
      {rows.map((p, i) => {
        const w = Math.max(2, (p.weight / max) * bw);
        const cw = (p.collab / max) * bw;
        return (
          <g key={p.id} style={{ cursor: 'pointer' }} onClick={() => click.onPerformer(p.id)}>
            <title>{`${nameOf(p.id)}: ${f2(p.weight)} (${f2(p.collab)})`}</title>
            <text x={lw - 8} y={i * 26 + 16} textAnchor="end" {...TEXT}>
              {nameOf(p.id)}
            </text>
            <rect x={lw} y={i * 26 + 3} width={w} height={17} rx={4} fill={fesColor(p.series)} />
            {cw > 0 && (
              <rect
                x={lw + w - cw}
                y={i * 26 + 3}
                width={cw}
                height={17}
                rx={4}
                fill="#000"
                opacity={0.33}
              />
            )}
            <text x={lw + w + 6} y={i * 26 + 16} {...MUTED}>
              {f2(p.weight)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ShiftChart({ a, b }: { a: FesDerived; b: FesDerived }) {
  const { t } = useTranslation();
  const series = [...new Set([...a.songTime, ...b.songTime].map((r) => r.series))];
  const at = (d: FesDerived, s: string) => d.songTime.find((r) => r.series === s)?.weight ?? 0;
  series.sort((x, y) => at(b, y) + at(a, y) - at(b, x) - at(a, x));
  const W = 900;
  const lw = 130;
  const mx = Math.max(1, ...series.map((s) => Math.max(at(a, s), at(b, s)))) * 1.12;
  const X = (v: number) => lw + (v / mx) * (W - lw - 110);
  const H = series.length * 32 + 24;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={SVG} role="img">
      {series.map((s, i) => {
        const y = i * 32 + 14;
        const v1 = at(a, s);
        const v2 = at(b, s);
        const up = v2 > v1;
        const col = v2 === v1 ? 'currentColor' : up ? '#16a34a' : '#dc2626';
        return (
          <g key={s}>
            <title>{`${fesSeriesName(s, t('fes.others'))}: ${f2(v1)} → ${f2(v2)}`}</title>
            <text x={lw - 8} y={y + 4} textAnchor="end" {...TEXT}>
              {fesSeriesName(s, t('fes.others'))}
            </text>
            <line
              x1={X(v1)}
              x2={X(v2)}
              y1={y}
              y2={y}
              stroke={col}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.7}
            />
            <circle cx={X(v1)} cy={y} r={6} fill="none" stroke={fesColor(s)} strokeWidth={3} />
            <circle cx={X(v2)} cy={y} r={6} fill={fesColor(s)} />
            <text x={X(Math.max(v1, v2)) + 14} y={y + 4} fill={col} fontSize={12} fontWeight={600}>
              {`${v2 - v1 > 0 ? '+' : ''}${f2(v2 - v1)}  (${f2(v1)} → ${f2(v2)})`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export type BumpView = 'all' | 'repeat' | 'change';

/** Two running orders side by side; lines join the songs played on both days. */
export function BumpChart({
  from,
  to,
  diff,
  view,
  focus,
  onOpen
}: {
  from: FesSong[];
  to: FesSong[];
  diff: FesDiff;
  view: BumpView;
  focus?: string;
  onOpen: (songId: string) => void;
}) {
  const RH = 17;
  const top = 22;
  const repeatedIds = new Set(diff.repeated.map((r) => r.from.songId));
  const droppedIds = new Set(diff.dropped.map((s) => s.songId));
  const addedIds = new Set(diff.added.map((s) => s.songId));
  const left = from.filter((s) =>
    view === 'all' ? true : view === 'repeat' ? repeatedIds.has(s.songId) : droppedIds.has(s.songId)
  );
  const right = to.filter((s) =>
    view === 'all' ? true : view === 'repeat' ? repeatedIds.has(s.songId) : addedIds.has(s.songId)
  );
  const n = Math.max(left.length, right.length);
  const W = 900;
  const xl = 330;
  const xr = 570;
  const yL = new Map(left.map((s, i) => [s.songId, top + i * RH + RH / 2]));
  const yR = new Map(right.map((s, i) => [s.songId, top + i * RH + RH / 2]));
  const dim = (s: FesSong) => (focus ? s.billed !== focus : false);
  const label = (s: FesSong) => `${s.no}. ${s.name}`.slice(0, 34);
  return (
    <svg viewBox={`0 0 ${W} ${top + n * RH + 10}`} style={SVG} role="img">
      <text x={xl - 8} y={12} textAnchor="end" fill="currentColor" fontSize={12} fontWeight={600}>
        {from[0] ? `Day ${from[0].day + 1}` : ''}
      </text>
      <text x={xr + 8} y={12} fill="currentColor" fontSize={12} fontWeight={600}>
        {to[0] ? `Day ${to[0].day + 1}` : ''}
      </text>
      {left.map((s) => {
        const y2 = yR.get(s.songId);
        const y1 = yL.get(s.songId)!;
        return y2 === undefined ? null : (
          <path
            key={`l-${s.key}`}
            d={`M${xl},${y1} C${xl + 95},${y1} ${xr - 95},${y2} ${xr},${y2}`}
            fill="none"
            stroke={fesColor(s.billed)}
            strokeWidth={2.4}
            opacity={dim(s) ? 0.1 : 0.75}
          />
        );
      })}
      {left.map((s, i) => {
        const gone = droppedIds.has(s.songId);
        const y = top + i * RH + RH / 2;
        return (
          <g
            key={`L-${s.key}`}
            style={{ cursor: 'pointer' }}
            opacity={dim(s) ? 0.18 : 1}
            onClick={() => onOpen(s.songId)}
          >
            <title>{s.name}</title>
            <circle cx={xl} cy={y} r={3.6} fill={gone ? '#dc2626' : fesColor(s.billed)} />
            <text
              x={xl - 12}
              y={y + 4}
              textAnchor="end"
              fill={gone ? '#dc2626' : 'currentColor'}
              fontSize={12}
              fontWeight={gone ? 600 : 400}
            >
              {(gone ? '✕ ' : '') + label(s)}
            </text>
          </g>
        );
      })}
      {right.map((s, i) => {
        const fresh = addedIds.has(s.songId);
        const y = top + i * RH + RH / 2;
        return (
          <g
            key={`R-${s.key}`}
            style={{ cursor: 'pointer' }}
            opacity={dim(s) ? 0.18 : 1}
            onClick={() => onOpen(s.songId)}
          >
            <title>{s.name}</title>
            <circle cx={xr} cy={y} r={3.6} fill={fresh ? '#16a34a' : fesColor(s.billed)} />
            <text
              x={xr + 12}
              y={y + 4}
              fill={fresh ? '#16a34a' : 'currentColor'}
              fontSize={12}
              fontWeight={fresh ? 600 : 400}
            >
              {(fresh ? '+ ' : '') + label(s)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
