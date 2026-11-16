#!/usr/bin/env python3
"""Compare what the published page computes (audit-page-dump.cjs output) with numbers recomputed
from audit-show.py's raw-data output, for D1 / D2 / Full x (all | active-only + ensembles hidden).
Usage: python3 scripts/audit-page.py <pagedump.json> <aud756.json> <aud757.json>"""
import json, sys, collections as C

dump = json.load(open(sys.argv[1])); A1 = json.load(open(sys.argv[2])); A2 = json.load(open(sys.argv[3]))
J = lambda f: json.load(open('data/' + f))
chars = {c['fullName']: c for c in J('character-info.json')}
SHORT = {'1': "μ's", '2': 'Aqours', '3': '虹ヶ咲', '4': 'Liella!', '5': 'SIM', '6': '蓮ノ空', '8': 'いきづらい部'}
FR = {"ラブライブ！": "μ's", "ラブライブ！サンシャイン!!": 'Aqours', '虹ヶ咲学園スクールアイドル同好会': '虹ヶ咲', 'ラブライブ！スーパースター!!': 'Liella!',
      'スクールアイドルミュージカル': 'SIM', '蓮ノ空女学院スクールアイドルクラブ': '蓮ノ空', 'イキヅライブ！ LOVELIVE! BLUEBIRD': 'いきづらい部', 'その他（複数シリーズ）': 'Others'}
ACTIVE = ['虹ヶ咲', 'Liella!', '蓮ノ空', 'いきづらい部']
fr_of = lambda name: SHORT[chars[name]['seriesId']]
fails = 0
def chk(view, label, exp, got):
    global fails
    ok = exp == got
    if not ok: fails += 1; print(f'FAIL {view} {label}\n   expected {exp}\n   page     {got}')
    return ok
r2 = lambda x: round(x + 1e-9, 2)

for day, rows in (('d1', A1), ('d2', A2), ('full', A1 + A2)):
    for mode in ('all', 'active'):
        v = f'{day}/{mode}'; pg = dump['views'][v]
        songs = [r for r in rows if mode == 'all' or len(r['members']) < 50]          # ensembles (>=50 on stage) hidden in active mode
        billed = [r for r in songs if mode == 'all' or FR[r['billed']] in ACTIVE]
        # performers
        per = C.defaultdict(float)
        for r in songs:
            for m in r['members']: per[m] += r['w']
        per = {m: w for m, w in per.items() if mode == 'all' or fr_of(m) in ACTIVE}
        chk(v, 'per-performer weights', sorted((m, r2(w)) for m, w in per.items()), sorted((p[0], r2(p[2])) for p in pg['perf']))
        # song time by franchise (billing)
        st = C.Counter()
        for r in billed: st[FR[r['billed']]] += r['w']
        chk(v, 'song time by billed franchise', sorted((k, r2(x)) for k, x in st.items()), sorted((k, r2(x)) for k, x in pg['series']))
        # original song type mix + counts
        ct, cn = C.Counter(), C.Counter()
        for r in billed: ct[r['otype']] += r['w']; cn[r['otype']] += 1
        chk(v, 'original-type weights/counts', sorted((k, r2(ct[k]), cn[k]) for k in ct), sorted((c[0], r2(c[1]), c[2]) for c in pg['types']))
        # solos
        chk(v, 'solo songs (name, franchise)', sorted((r['name'], FR[r['billed']]) for r in billed if r['otype'] == 'Solo'), sorted(map(tuple, pg['solos'])))
        # headline numbers
        ng = sorted([w for m, w in per.items() if fr_of(m) != 'SIM'], reverse=True)
        chk(v, 'song count', len(songs), pg['songs'])
        chk(v, 'weighted total', round(sum(r['w'] for r in songs), 2), pg['weighted'])
        chk(v, 'performers excl. guests', len(ng), pg['n_ng'])
        chk(v, 'top-10 share', round(sum(ng[:10]) / sum(ng), 6), round(pg['top10'], 6))
        chk(v, 'solo songs', sorted((r['name'], FR[r['billed']]) for r in billed if r['otype'] == 'Solo'), sorted(map(tuple, pg['solos'])))
        # collab = a song whose performers come from more than one franchise; share of song time and of cast time
        isc = lambda r: len({fr_of(m) for m in r['members']}) > 1
        cw = sum(r['w'] for r in songs if isc(r)); sw_ = sum(r['w'] for r in songs)
        pcw = sum(r['w'] * 1 for r in songs if isc(r) for m in r['members'] if (mode == 'all' or fr_of(m) in ACTIVE)); pw = sum(per.values())
        chk(v, 'collab share (song time, cast time)', [round(cw / sw_, 6), round(pcw / pw, 6)], [round(pg['collab'][0], 6), round(pg['collab'][1], 6)])
        chk(v, 'per-performer collab weight', sorted((m, r2(sum(r['w'] for r in songs if isc(r) and m in r['members']))) for m in per), sorted((p[0], r2(p[3])) for p in pg['perf']))
        # rows actually drawn
        # Gini
        g = sorted(ng, reverse=False); n = len(g); tot = sum(g)
        chk(v, 'gini', round(2 * sum((i + 1) * x for i, x in enumerate(g)) / (n * tot) - (n + 1) / n, 6), round(pg['gini'], 6))
        # push table (active view only)
        if mode == 'active':
            exp = []
            fair = sum(w for m, w in per.items() if fr_of(m) != 'SIM') / len([1 for m in per if fr_of(m) != 'SIM'])
            for f in ACTIVE:
                ws = [w for m, w in per.items() if fr_of(m) == f]; avg = sum(ws) / len(ws)
                bb = sum(r['w'] for r in billed if FR[r['billed']] == f)
                spot = sum(r['w'] for r in billed if FR[r['billed']] == f and r['otype'] in ('Solo', 'Unit'))
                solo = sum(r['w'] for r in songs if FR[r['billed']] == f and r['otype'] == 'Solo')
                exp.append([f, len(ws), r2(bb), r2(avg), r2(avg / fair - 1), r2(solo), r2(spot), r2(min(ws)), r2(max(ws))])
            got = [[x[0], x[1], r2(x[2]), r2(x[3]), r2(x[4]), r2(x[5]), r2(x[6]), r2(x[7]), r2(x[8])] for x in pg['push']]
            chk(v, 'push table', exp, got)
print('page errors:', dump['errs'])
print('TOTAL FAILS:', fails)
sys.exit(1 if fails or dump['errs'] else 0)
