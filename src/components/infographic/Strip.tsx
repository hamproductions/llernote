import { FLOW_C, NEW, REG, RET, TYPE, useInfo } from './shared';

type Seg = { px: number; c: string; op: number };

const MARKER_W = 0.8;

export function Strip({
  g,
  mode,
  includeSpinoff
}: {
  g: string;
  mode: string;
  includeSpinoff: boolean;
}) {
  const { d, gLabel, openEvent, hover } = useInfo();
  const perfs = (d.flagPerfByGroup[g] as any[]).filter((p) => includeSpinoff || !p.spinoff);
  const unitsOf = (p: any) =>
    mode === 'flow'
      ? p.performed +
        MARKER_W * p.flow.filter((r: any) => r.k !== 'main' && r.k !== 'encore').length
      : p.performed;
  const maxP = Math.max(1, ...perfs.map(unitsOf));
  const n = perfs.length;
  const W = 1100,
    padL = 30,
    padR = 8,
    padT = 8,
    padB = 58,
    plotH = 110;
  const innerW = W - padL - padR,
    step = innerW / n,
    gap = Math.min(2, step * 0.18),
    bw = Math.max(2.5, Math.min(26, step - gap));
  const col = d.groupColor[g];
  const h = (v: number) => (plotH * v) / maxP;

  const bands: [number, number][] = [];
  let start = 0;
  for (let i = 1; i <= n; i++)
    if (i === n || perfs[i].liveIdx !== perfs[start].liveIdx) {
      bands.push([start, i - 1]);
      start = i;
    }

  const segsOf = (p: any): Seg[] => {
    if (mode === 'flow')
      return p.flow
        .map((r: { k: string; n: number }) =>
          r.k === 'main'
            ? { px: h(r.n), c: FLOW_C.main, op: 1 }
            : r.k === 'encore'
              ? { px: h(r.n), c: FLOW_C.encore, op: 1 }
              : { px: h(MARKER_W), c: FLOW_C[r.k] || FLOW_C.other, op: 1 }
        )
        .reverse();
    if (mode === 'core')
      return [
        { px: h(p.core), c: col, op: 1 },
        { px: h(p.venueU), c: col, op: 0.66 },
        { px: h(p.dayU), c: col, op: 0.44 },
        { px: h(p.perfU), c: col, op: 0.26 },
        { px: h(p.rotating), c: col, op: 0.13 }
      ];
    if (mode === 'dna')
      return [
        { px: h(p.comp.group), c: TYPE.group, op: 1 },
        { px: h(p.comp.subunit), c: TYPE.subunit, op: 1 },
        { px: h(p.comp.solo), c: TYPE.solo, op: 1 },
        { px: h(p.comp.collab), c: TYPE.collab, op: 1 }
      ];
    return [
      { px: h(p.regular), c: REG, op: 1 },
      { px: h(p.returnee), c: RET, op: 1 },
      { px: h(p.new), c: NEW, op: 1 }
    ];
  };

  const tipOf = (p: any) => {
    const head = `${gLabel(g)} ${p.liveLabel} · ${p.name} (${p.date})\n`;
    if (mode === 'flow') {
      const mc = p.flow.filter((r: any) => r.k === 'mc').length;
      const vtr = p.flow.filter((r: any) => r.k === 'vtr').length;
      return (
        head +
        `${p.main} main · ${p.encore} encore` +
        (mc ? ` · ${mc} MC` : '') +
        (vtr ? ` · ${vtr} VTR` : '')
      );
    }
    if (mode === 'core')
      return (
        head +
        `${p.core} core · ${p.venueU} venue · ${p.dayU} day · ${p.perfU} perf · ${p.rotating} rotating`
      );
    if (mode === 'dna')
      return head + `${p.comp.group} group · ${p.comp.subunit} unit · ${p.comp.solo} solo`;
    return head + `${p.new} new · ${p.returnee} returnee · ${p.regular} regular`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${padT + plotH + padB}`} width="100%" style={{ display: 'block' }}>
      {[0, 0.5, 1].map((tk) => {
        const y = padT + plotH * (1 - tk);
        return (
          <g key={tk}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="currentColor" opacity={0.12} />
            <text
              x={padL - 5}
              y={y + 3}
              textAnchor="end"
              fill="currentColor"
              opacity={0.55}
              fontSize={10}
            >
              {Math.round(maxP * tk)}
            </text>
          </g>
        );
      })}
      {bands.map(([a, b], bi) => {
        const bx0 = padL + step * a,
          bx1 = padL + step * (b + 1),
          cxm = (bx0 + bx1) / 2,
          bandW = bx1 - bx0;
        return (
          <g key={bi}>
            {bi % 2 === 1 && (
              <rect
                x={bx0}
                y={padT}
                width={bandW}
                height={plotH}
                fill="currentColor"
                opacity={0.07}
              />
            )}
            {bi > 0 && (
              <line
                x1={bx0}
                y1={padT}
                x2={bx0}
                y2={padT + plotH}
                stroke="currentColor"
                opacity={0.28}
              />
            )}
            {bandW >= 58 ? (
              <>
                <text
                  x={cxm}
                  y={padT + plotH + 15}
                  textAnchor="middle"
                  fill="currentColor"
                  opacity={0.95}
                  fontSize={10.5}
                  fontWeight={700}
                >
                  {perfs[a].liveLabel}
                </text>
                <text
                  x={cxm}
                  y={padT + plotH + 27}
                  textAnchor="middle"
                  fill="currentColor"
                  opacity={0.55}
                  fontSize={10}
                >
                  &apos;{perfs[a].date.slice(2, 4)}
                </text>
              </>
            ) : (
              <text
                x={cxm}
                y={padT + plotH + 11}
                textAnchor="end"
                transform={`rotate(-38 ${cxm} ${padT + plotH + 11})`}
                fill="currentColor"
                opacity={0.85}
                fontSize={9.5}
                fontWeight={600}
              >
                {perfs[a].liveLabel} &apos;{perfs[a].date.slice(2, 4)}
              </text>
            )}
          </g>
        );
      })}
      {perfs.map((p: any, i: number) => {
        const cx = padL + step * i + step / 2,
          x = cx - bw / 2;
        let yb = padT + plotH;
        return (
          <g
            key={i}
            {...hover(tipOf(p))}
            onClick={() => openEvent(p.pid)}
            style={{ cursor: 'pointer' }}
          >
            {segsOf(p).map((s, si) => {
              if (s.px <= 0) return null;
              const rect = (
                <rect
                  key={si}
                  x={x}
                  y={yb - s.px}
                  width={bw}
                  height={s.px}
                  fill={s.c}
                  opacity={s.op}
                />
              );
              yb -= s.px;
              return rect;
            })}
          </g>
        );
      })}
    </svg>
  );
}
