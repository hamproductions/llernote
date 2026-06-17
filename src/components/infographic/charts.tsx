import { ANY, DAYS, GName, LEGS, TYPE, gridX, pct, useInfo } from './shared';

export function ChangeChart() {
  const { d, t, groups, gLabel, hover } = useInfo();
  const W = 1100,
    rowH = 58,
    padL = 138,
    padR = 56,
    padT = 8,
    padB = 26;
  const x0 = padL,
    x1 = W - padR,
    H = padT + groups.length * rowH + padB;
  const series: [string, string, string][] = [
    ['changeDays', DAYS, t('infographic.between_days')],
    ['changeLegs', LEGS, t('infographic.between_legs')],
    ['changeRate', ANY, t('infographic.between_any')]
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {gridX(x0, x1, padT, padT + groups.length * rowH)}
      {groups.map((g, i) => {
        const a = d.byGroup[g];
        const yBase = padT + i * rowH;
        const bh = 12,
          gap = 4;
        const yStart = yBase + (rowH - (series.length * bh + (series.length - 1) * gap)) / 2;
        return (
          <g key={g}>
            <GName g={g} x={padL - 12} y={yBase + rowH / 2} />
            {series.map(([key, col, lbl], k) => {
              const v = a[key] as number | null;
              const y = yStart + k * (bh + gap);
              if (v == null)
                return (
                  <g key={key}>
                    <rect
                      x={x0}
                      y={y}
                      width={x1 - x0}
                      height={bh}
                      fill="currentColor"
                      opacity={0.06}
                      rx={3}
                    />
                    <text
                      x={x0 + 8}
                      y={y + bh / 2}
                      dominantBaseline="central"
                      fill="currentColor"
                      opacity={0.5}
                      fontSize={10.5}
                      fontStyle="italic"
                    >
                      {t('infographic.single_venue')}
                    </text>
                  </g>
                );
              const w = (x1 - x0) * v;
              return (
                <g key={key}>
                  <rect
                    x={x0}
                    y={y}
                    width={x1 - x0}
                    height={bh}
                    fill="currentColor"
                    opacity={0.06}
                    rx={3}
                  />
                  <rect
                    x={x0}
                    y={y}
                    width={w}
                    height={bh}
                    fill={col}
                    rx={3}
                    {...hover(`${gLabel(g)} · ${lbl}: ${pct(v)}`, col)}
                  />
                  <text
                    x={x0 + w + 6}
                    y={y + bh / 2}
                    dominantBaseline="central"
                    fill="currentColor"
                    opacity={0.9}
                    fontSize={10.5}
                    fontWeight={600}
                  >
                    {pct(v)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function CompChart() {
  const { d, groups, gLabel, typeLabel, hover } = useInfo();
  const types: ['group' | 'subunit' | 'solo' | 'collab', string][] = [
    ['group', TYPE.group],
    ['subunit', TYPE.subunit],
    ['solo', TYPE.solo],
    ['collab', TYPE.collab]
  ];
  const avgComp = (g: string) => {
    const ps: any[] = d.flagPerfByGroup[g] ?? [];
    const out = { group: 0, subunit: 0, solo: 0, collab: 0 };
    if (!ps.length) return out;
    const byLive = new Map<number, any[]>();
    for (const p of ps) {
      const a = byLive.get(p.liveIdx) ?? [];
      a.push(p);
      byLive.set(p.liveIdx, a);
    }
    const lives = [...byLive.values()];
    for (const k of ['group', 'subunit', 'solo', 'collab'] as const) {
      const perLive = lives.map((arr) => arr.reduce((s, p) => s + p.comp[k], 0) / arr.length);
      out[k] = perLive.reduce((s, v) => s + v, 0) / perLive.length;
    }
    return out;
  };
  const W = 760,
    rowH = 34,
    padL = 132,
    padR = 12,
    padT = 6,
    padB = 8;
  const x0 = padL,
    x1 = W - padR,
    H = padT + groups.length * rowH + padB;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {groups.map((g, i) => {
        const comp = avgComp(g);
        const total = types.reduce((acc, [k]) => acc + comp[k], 0) || 1;
        const y = padT + i * rowH + 7,
          bh = rowH - 14;
        let cx = x0;
        return (
          <g key={g}>
            <GName g={g} size={12} x={padL - 10} y={y + bh / 2} />
            {types.map(([k, col]) => {
              const w = (x1 - x0) * (comp[k] / total);
              if (w <= 0.5) return null;
              const seg = (
                <g key={k}>
                  <rect
                    x={cx}
                    y={y}
                    width={w}
                    height={bh}
                    fill={col}
                    {...hover(
                      `${gLabel(g)} · ${typeLabel(k)}: ${comp[k].toFixed(1)} / live (${Math.round((comp[k] / total) * 100)}%)`,
                      col
                    )}
                  />
                  {w > 22 && (
                    <text
                      x={cx + w / 2}
                      y={y + bh / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={11}
                      fill="#ffffff"
                      fontWeight={700}
                    >
                      {comp[k].toFixed(1)}
                    </text>
                  )}
                </g>
              );
              cx += w;
              return seg;
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function Donut() {
  const { d, typeLabel, hover } = useInfo();
  const cen = d.songCensus;
  const types: [string, string][] = [
    ['group', TYPE.group],
    ['subunit', TYPE.subunit],
    ['solo', TYPE.solo],
    ['collab', TYPE.collab]
  ];
  const total = types.reduce((a, [k]) => a + (cen[k] || 0), 0);
  const R = 84,
    r = 52,
    cx = 130,
    cy = 110;
  let ang = -Math.PI / 2;
  const arcs = types
    .map(([k, col]) => {
      const frac = (cen[k] || 0) / total;
      if (frac <= 0) return null;
      const a0 = ang,
        a1 = ang + frac * Math.PI * 2;
      ang = a1;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rad: number, a: number) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
      const [x1o, y1o] = p(R, a0),
        [x2o, y2o] = p(R, a1),
        [x2i, y2i] = p(r, a1),
        [x1i, y1i] = p(r, a0);
      return (
        <path
          key={k}
          d={`M${x1o} ${y1o} A${R} ${R} 0 ${large} 1 ${x2o} ${y2o} L${x2i} ${y2i} A${r} ${r} 0 ${large} 0 ${x1i} ${y1i} Z`}
          fill={col}
          {...hover(`${typeLabel(k)}: ${cen[k]} songs (${Math.round(frac * 100)}%)`, col)}
        />
      );
    })
    .filter(Boolean);
  return (
    <svg viewBox="0 0 260 220" width="100%" style={{ display: 'block' }}>
      {arcs}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill="currentColor"
        fontSize={26}
        fontWeight={700}
      >
        {total}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="currentColor" opacity={0.6} fontSize={11}>
        songs
      </text>
    </svg>
  );
}

export function StructChart() {
  const { d, t, groups, gLabel, hover } = useInfo();
  const struct = (g: string) => {
    const lv = d.flagByGroup[g] ?? [];
    const tot = lv.reduce((a: number, l: any) => a + l.shows, 0) || 1;
    const wavg = (sel: (l: any) => number) =>
      lv.reduce((a: number, l: any) => a + sel(l) * l.shows, 0) / tot;
    return {
      mc: wavg((l) => l.mcPerShow),
      vtr: wavg((l) => l.vtrPerShow),
      encores: wavg((l) => l.encoresPerShow)
    };
  };
  const W = 1100,
    rowH = 56,
    padL = 138,
    padR = 70,
    padT = 8,
    padB = 8;
  const x0 = padL,
    x1 = W - padR;
  const stats = groups.map((g) => ({ g, ...struct(g) }));
  const max = Math.max(1, ...stats.map((s) => Math.max(s.mc, s.vtr, s.encores)));
  const H = padT + groups.length * rowH + padB;
  const series: [string, string, (s: any) => number][] = [
    [t('infographic.struct_mc'), '#3b82f6', (s) => s.mc],
    [t('infographic.struct_vtr'), '#a855f7', (s) => s.vtr],
    [t('infographic.struct_encores'), '#f59e0b', (s) => s.encores]
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {stats.map((s, i) => {
        const yBase = padT + i * rowH,
          bh = 12,
          gap = 4;
        const yStart = yBase + (rowH - (series.length * bh + (series.length - 1) * gap)) / 2;
        return (
          <g key={s.g}>
            <GName g={s.g} x={padL - 12} y={yBase + rowH / 2} />
            {series.map(([lbl, col, sel], k) => {
              const v = sel(s);
              const y = yStart + k * (bh + gap),
                w = (x1 - x0) * (v / max);
              return (
                <g key={lbl}>
                  <rect
                    x={x0}
                    y={y}
                    width={x1 - x0}
                    height={bh}
                    fill="currentColor"
                    opacity={0.06}
                    rx={3}
                  />
                  <rect
                    x={x0}
                    y={y}
                    width={w}
                    height={bh}
                    fill={col}
                    rx={3}
                    {...hover(`${gLabel(s.g)} · ${lbl}: ${v.toFixed(1)} / show`, col)}
                  />
                  <text
                    x={x0 + w + 6}
                    y={y + bh / 2}
                    dominantBaseline="central"
                    fill="currentColor"
                    opacity={0.9}
                    fontSize={10.5}
                    fontWeight={600}
                  >
                    {v.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
