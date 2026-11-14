#!/usr/bin/env python3
"""Setlist balance analysis. Usage: python3 scripts/analyze-setlist-balance.py [min_songs=8]
Medley/short/TV-size items count 0.5 (same rule as src/utils/setlistAnalysis.ts)."""
import json, re, sys, collections as C
D = 'data/'
L = lambda f: json.load(open(D + f))
S, P, SI, AR, CH, SER = L('performance-setlists.json'), {x['id']: x for x in L('performance-info.json')}, {x['id']: x for x in L('song-info.json')}, {x['id']: x for x in L('artists-info.json')}, {x['id']: x for x in L('character-info.json')}, {x['id']: x['name'] for x in L('series-info.json')}
PARTIAL = re.compile(r'メドレー|medley|TV\s?サイズ|TV\s?Size|ショート|Short\s?Ver|抜粋|さわり', re.I)
MIN = int(sys.argv[1]) if len(sys.argv) > 1 else 8
def short(s): return {'1':"μ's",'2':'Aqours','3':'虹ヶ咲','4':'Liella','6':'蓮ノ空','5':'SIM','7':'Yohane','8':'BLUEBIRD'}.get(s, s)
def gini(v):
    v = sorted(v); n = len(v); t = sum(v)
    return 0 if not n or not t else (2 * sum((i + 1) * x for i, x in enumerate(v)) / (n * t)) - (n + 1) / n

def cast(cid):
    c = CH.get(cid); return (c['casts'][0]['seiyuu'] if c and c['casts'] else None), (c['fullName'] if c else cid), (c['seriesId'] if c else None)

spot_tot = C.Counter(); group_tot = C.Counter(); perf_tot = C.Counter(); perf_kind = {}; lives = []
for pid, sl in S.items():
    p = P.get(pid)
    if not p or not sl['items']: continue
    g, per, spot, kinds, nsong, w_tot, skipped = C.Counter(), C.Counter(), C.Counter(),  C.defaultdict(C.Counter), 0, 0, 0
    for it in sl['items']:
        if it['type'] != 'song': continue
        song = SI.get(it.get('songId'))
        if not song or not song.get('artists'): skipped += 1; continue
        w = 0.5 if PARTIAL.search(it.get('remarks') or '') else 1
        arts = [AR[a['id']] for a in song['artists'] if a['id'] in AR]
        if not arts: skipped += 1; continue
        # group = artist name (a collab song has >1 artist entries or members from >1 series)
        chars = {c for a in arts for c in a['characters'] if c}
        series = {cast(c)[2] for c in chars} - {None}
        collab = len(arts) > 1 or len(series) > 1
        for a in arts: g[a['name']] += w / len(arts)
        small = max(len(a['characters']) for a in arts) <= 6
        for c in chars:
            nm = cast(c)[0] or cast(c)[1]
            per[nm] += w; kinds[nm]['collab' if collab else 'normal'] += w
            if small: spot[nm] += w
        nsong += w; w_tot += 1
    lives.append(dict(id=pid, name=p.get('performanceName') or p['tourName'], date=p['date'], venue=p['venue'], series=p['seriesIds'], songs=nsong, g=g, per=per, spot=spot, kinds=kinds, skipped=skipped))
    for k, v in g.items(): group_tot[k] += v
    for k, v in spot.items(): spot_tot[k] += v
    for k, v in per.items():
        perf_tot[k] += v
        for kk, vv in kinds[k].items(): perf_kind.setdefault(k, C.Counter())[kk] += vv

def table(title, rows, hdr):
    print(f'\n## {title}\n'); print('| ' + ' | '.join(hdr) + ' |'); print('|' + '---|' * len(hdr))
    for r in rows: print('| ' + ' | '.join(str(x) for x in r) + ' |')

print(f'# Setlist balance ({len(lives)} lives with setlists; partials=0.5)')
table('Songs per group (weighted, all lives, top 30)', [(k, f'{v:.1f}') for k, v in group_tot.most_common(30)], ['Group', 'Songs'])
table('Songs per performer (cast), normal vs collab (top 40)', [(k, f'{v:.1f}', f"{perf_kind[k]['normal']:.1f}", f"{perf_kind[k]['collab']:.1f}", f"{100*perf_kind[k]['collab']/v:.0f}%") for k, v in perf_tot.most_common(40)], ['Performer', 'Total', 'Normal', 'Collab', 'Collab%'])

table('Spotlight songs per performer (sub-unit/duo/solo, ≤6 members; top 25 / bottom 10 of ≥20)', [(k, f'{v:.1f}') for k, v in spot_tot.most_common(25)] + [('…', '')] + [(k, f'{v:.1f}') for k, v in sorted(((k, v) for k, v in spot_tot.items() if v >= 20), key=lambda x: x[1])[:10]], ['Performer', 'Spotlight songs'])
# per-live fairness
rows = []
for l in lives:
    if l['songs'] < MIN or len(l['per']) < 3: continue
    v = list(l['per'].values()); gv = list(l['g'].values()); top = max(l['per'], key=l['per'].get)
    l['perf_gini'] = gini(v); l['spot_gini'] = gini([l['spot'].get(k, 0) for k in l['per']]); l['grp_gini'] = gini(gv)
    l['spread'] = max(v) / max(min(v), .5)
    l['top'] = (top, l['per'][top]); l['min'] = min(l['per'].values())
    rows.append(l)
fmt = lambda l: (l['date'], l['name'][:46], f"{l['songs']:.0f}", len(l['per']), f"{l['perf_gini']:.2f}", f"{l['grp_gini']:.2f}", f"{l['top'][0]} ({l['top'][1]:.1f})", f"{l['min']:.1f}")
H = ['Date', 'Live', 'Songs', 'Performers', 'Perf Gini', 'Group Gini', 'Most-featured', 'Least']
table(f'Most EQUAL lives (lowest performer Gini, ≥{MIN} songs)', [fmt(l) for l in sorted(rows, key=lambda x: x['perf_gini'])[:15]], H)
table('Most UNEQUAL lives (highest performer Gini)', [fmt(l) for l in sorted(rows, key=lambda x: -x['perf_gini'])[:15]], H)
# per-franchise average
by = C.defaultdict(list)
for l in rows:
    for s in l['series'][:1]: by[short(s)].append(l)
table('Fairness by series (first listed series)', [(k, len(v), f"{sum(x['perf_gini'] for x in v)/len(v):.3f}", f"{sum(x['grp_gini'] for x in v)/len(v):.3f}") for k, v in sorted(by.items(), key=lambda kv: -len(kv[1]))], ['Series', 'Lives', 'Avg perf Gini', 'Avg group Gini'])
yr = C.defaultdict(list)
for l in rows: yr[l['date'][:4]].append(l['perf_gini'])
table('Fairness by year (avg performer Gini)', [(y, len(v), f'{sum(v)/len(v):.3f}') for y, v in sorted(yr.items())], ['Year', 'Lives', 'Avg Gini'])
# cumulative inequality
v = sorted(perf_tot.values()); by2 = C.defaultdict(list)
for l in rows: by2[short(l['series'][0])].append(l['spot_gini'])
table('Spotlight (sub-unit/solo) inequality by series, avg Gini', [(k, len(v), f'{sum(v)/len(v):.3f}') for k, v in by2.items()], ['Series', 'Lives', 'Avg spotlight Gini'])
print(f'\nOverall performer Gini (cumulative): {gini(v):.3f}; group Gini: {gini(list(group_tot.values())):.3f}')
