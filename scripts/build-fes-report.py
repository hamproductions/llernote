#!/usr/bin/env python3
"""Build the LL Fes Day 1 / Day 2 / Full report as one HTML file.
Usage: python3 scripts/build-fes-report.py <out.html> [workdir]
Runs analyze-show.py for both days, folds in the Day-1 prediction + its score, and fills
scripts/fes-report-template.html."""
import json, os, re, subprocess, sys, difflib, tempfile, collections as C

OUT = sys.argv[1]
WORK = sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp(prefix='fesreport-')
os.makedirs(WORK, exist_ok=True)
D1_ID, D2_ID = '756', '757'
J = lambda f: json.load(open('data/' + f))
run = lambda *a: subprocess.run(['python3', *a], check=True, capture_output=True, text=True).stdout

SHORT = {'ラブライブ！': "μ's", 'ラブライブ！サンシャイン!!': 'Aqours', '虹ヶ咲学園スクールアイドル同好会': '虹ヶ咲', 'ラブライブ！スーパースター!!': 'Liella!',
         'スクールアイドルミュージカル': 'SIM', '蓮ノ空女学院スクールアイドルクラブ': '蓮ノ空', 'イキヅライブ！ LOVELIVE! BLUEBIRD': 'いきづらい部', 'その他（複数シリーズ）': 'Others'}
COL = {"μ's": '#f200b5', 'Aqours': '#0098f0', '虹ヶ咲': '#ff9400', 'Liella!': '#993399', '蓮ノ空': '#fb8a9b', 'いきづらい部': '#f2540a', 'SIM': '#9a8f94', 'Others': '#64748b'}
SERIES_COLOR = {'#f200b5': "μ's", '#0098f0': 'Aqours', '#ff9400': '虹ヶ咲', '#993399': 'Liella!', '#fb8a9b': '蓮ノ空', '#00a0e0': 'いきづらい部', '#c40035': 'SIM'}

def load_day(pid, label):
    path = f'{WORK}/show{pid}.json'
    run('scripts/analyze-show.py', pid, path)
    a = json.load(open(path))
    perf = [dict(name=p[0], cast=p[1], color=COL[SHORT[p[3]]], fr=SHORT[p[3]]) for p in a['perf']]
    songs = []
    for r in a['songlist']:
        pos, name, rm, w, n, src, collab, cols, artist, wb, billed, members, otype = r[:13]
        mix = [[COL[SERIES_COLOR[c]], SERIES_COLOR[c], k] for c, k in cols]
        songs.append(dict(day=label, pos=pos + 1, name=name, remarks=rm, w=w, n=n, collab=bool(collab), type=otype,
                          billed=[SHORT[billed[0]], COL[SHORT[billed[0]]]], members=members, mix=mix, artist=artist))
    st = C.Counter()
    for s in songs: st[s['billed'][0]] += s['w']
    return dict(songs=songs, perf=perf, series_all=[[k, round(v, 2)] for k, v in st.most_common()])

d1, d2 = load_day(D1_ID, 'D1'), load_day(D2_ID, 'D2')
full = dict(songs=d1['songs'] + [dict(s, pos=s['pos']) for s in d2['songs']], perf=d1['perf'],
            series_all=[[k, round(sum(v for kk, v in d1['series_all'] + d2['series_all'] if kk == k), 2)] for k in {k for k, _ in d1['series_all'] + d2['series_all']}])
DAYS = dict(d1=d1, d2=d2, full=full)

# ---- Day 1 -> Day 2 changes + prediction scoring
S, SI = J('performance-setlists.json'), {x['id']: x for x in J('song-info.json')}
sg = lambda pid: [(it['position'], it['songId']) for it in S[pid]['items'] if it['type'] == 'song' and it.get('songId')]
a, b = sg(D1_ID), sg(D2_ID); ia, ib = [x[1] for x in a], [x[1] for x in b]
keep = set()
for blk in difflib.SequenceMatcher(None, ia, ib, autojunk=False).get_matching_blocks(): keep |= set(range(blk.a, blk.a + blk.size))
nm = lambda s: SI[s]['name']
p1 = json.load(open('data/predictions/day2-from-day1.json')); p2 = json.load(open('data/predictions/day2-from-day1-song-level.json'))
run('scripts/score-prediction.py', D1_ID, D2_ID, 'data/predictions/day2-from-day1-song-level.json', f'{WORK}/score_song.json', '--level=song')
sc = json.load(open(f'{WORK}/score_song.json'))
slots = []
for s1, s2, r in zip(p1['slots'], p2['slots'], sc['slots']):
    inplace = r['slot'] - 1 in keep
    out = 'played again, same relative order' if inplace else ('played again, moved' if s1['song_id'] in set(ib) else 'dropped')
    slots.append([s1['slot'], s1['song'], s1['cls'], round(s1['p_changed'] * 100), round(s2['p_changed'] * 100), out, s1['song_id'] not in set(ib)])
act = [1 if x[6] else 0 for x in slots]; base = sum(act) / len(act)
P1, P2 = [x[3] / 100 for x in slots], [x[4] / 100 for x in slots]
brier = lambda pr: round(sum((p - q) ** 2 for p, q in zip(pr, act)) / len(act), 3)
STATIC = dict(shared=len(set(ia) & set(ib)), n1=len(a), n2=len(b), inplace=len(keep), sameidx=sum(1 for i, x in enumerate(ia) if i < len(ib) and ib[i] == x),
              d1only=[nm(x) for x in ia if x not in set(ib)], d2only=[nm(x) for x in ib if x not in set(ia)], slots=slots, dropped=sum(act),
              exp1=round(sum(P1), 1), exp2=round(sum(P2), 1), b1=brier(P1), b2=brier(P2), bflat=brier([base] * len(act)),
              pairs=p2['pairs_all'], pairs_multi=p2['pairs_multi'])

html = open('scripts/fes-report-template.html').read()
html = html.replace('__DAYS__', json.dumps(DAYS, ensure_ascii=False)).replace('__STATIC__', json.dumps(STATIC, ensure_ascii=False))
open(OUT, 'w').write(html)
print(f'wrote {OUT} ({len(html)//1024} KB): D1 {len(d1["songs"])} songs, D2 {len(d2["songs"])} songs, full {len(full["songs"])}')
