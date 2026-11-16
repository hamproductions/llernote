#!/usr/bin/env python3
"""Per-show balance analysis. Usage: python3 scripts/analyze-show.py <performanceId> [out.json]
Performers come from the item remarks ("A、B、C Ver." / "TVサイズ｜A、B Ver.") when they name members,
else from the song's artist (with variant). Short/TV-size/medley count 0.5."""
import json, re, sys, collections as C
L = lambda f: json.load(open('data/' + f))
pid = sys.argv[1]
S, P = L('performance-setlists.json')[pid], {x['id']: x for x in L('performance-info.json')}[pid]
SI = {x['id']: x for x in L('song-info.json')}; AR = {x['id']: x for x in L('artists-info.json')}
CH = {x['id']: x for x in L('character-info.json')}; SER = {x['id']: x for x in L('series-info.json')}
# Song weight tiers (assumptions, not measured durations). First match wins.
TIERS = [(re.compile(r'Movie\s?Edit', re.I), 1.0),
         (re.compile(r'メドレー|medley', re.I), 0.3),
         (re.compile(r'1番.*(ラスサビ|[CDＤ]メロ)|ショート.*1番|2コーラス'), 0.75),
         (re.compile(r'TV\s?サイズ|TV\s?Size|ショート|Short|抜粋|さわり', re.I), 0.5)]
def weight(rm, tiered=True):
    for rx, w in TIERS:
        if rx.search(rm or ''): return w if tiered else (1.0 if w == 1.0 else 0.5)
    return 1.0
PART = re.compile(r'メドレー|medley|TV\s?サイズ|ショート|Short|抜粋|さわり', re.I)
norm = lambda s: re.sub(r'[\s　]', '', s)
ALIAS = {'ランジュ': '嵐珠'}
def by_token(t):
    t = ALIAS.get(t, t)
    m = [c['id'] for c in CH.values() if norm(c['fullName']).endswith(t) or norm(c['fullName']).startswith(t)]
    return m
GROUPS = {'μ\'s': '1', 'Aqours': '2', '虹ヶ咲学園スクールアイドル同好会': '3', 'Liella!': '4', '蓮ノ空女学院スクールアイドルクラブ': '6', 'いきづらい部！': '8'}
def series_chars(sid): return [c['id'] for c in CH.values() if c['seriesId'] == sid]
VAR = C.defaultdict(list)
for c in CH.values():
    for u in c.get('units') or []:
        if u.get('additionalInfo'): VAR[(u['id'], u['additionalInfo'])].append(c['id'])
def resolve_artist(a, remark=''):  # same variant logic as src/utils/setlistAnalysis.ts resolveArtistCharacterIds
    for (uid, label), cs in VAR.items():  # remark such as 'B. G. P. Ver.' naming a variant this artist has
        if uid == a['id'] and remark and label.replace(' ', '') in remark.replace(' ', '') and label.replace(' ', '') == 'B.G.P.': return cs
    if a.get('variant') and VAR.get((a['id'], a['variant'])): return VAR[(a['id'], a['variant'])]
    return [c for c in AR[a['id']]['characters'] if c]
def parse_remark(rm0):
    rm0 = rm0 or ''; rm = rm0.split('｜')[-1]
    if 'Ver.' not in rm and not rm.startswith('Liella') and '｜' not in rm0: return None  # '｜' = a member list may follow even without 'Ver.'
    body = rm.replace('Ver.', '').strip(); toks = [t.strip() for t in re.split('[、,，]', body) if t.strip()]
    if not toks: return None
    out = []
    for t in toks:
        g = next((v for k, v in {"μ's": '1', 'μ’s': '1', 'Aqours': '2', '虹ヶ咲': '3', 'Liella': '4', '蓮ノ空': '6', 'いきづらい部': '8'}.items() if t.startswith(k)), None)
        if g: out += series_chars(g)
        elif re.fullmatch(r'\d〜\d期生', t): out += VAR[('91', '1期生〜3期生')]  # Liella! 1期生〜3期生 member list from the data
        else:
            m = by_token(t)
            if len(m) == 1: out += m
            else: return None  # e.g. "B. G. P." style labels
    return out
# Official lineup from the tour note ("出演者:" block): named cast via seiyuu, whole-series lines (Liella!, 蓮ノ空, いきづらい部) via series.
def lineup_for(pid):
    note = ''
    for tour in json.load(open('data/raw/llfans-detailed-tours.json')):
        for c in tour['concerts']:
            if any(p['id'] == pid for p in c['performances']): note = tour.get('note') or ''
    global FULL_NOTE; FULL_NOTE = norm(note)
    if '出演者' not in note: return set()
    note = norm(note.split('ゲスト出演')[0]); out = set()
    for c in CH.values():
        s = c['seriesId']; nm = [norm(x['seiyuu']) for x in c['casts']]
        if any(n and n in note for n in nm): out.add(c['id'])
    for line in note.split('『')[1:]:
        if 'ラブライブ！スーパースター' in line and '役' not in line: out |= set(VAR[('91', '1期生〜3期生')])  # the data's own Liella! 1期生〜3期生 list; Sunny Passion (摩央/悠奈) are a separate guest unit, not in this setlist
        if '蓮ノ空' in line and '役' not in line:  
            out |= set(VAR[('133', '102〜105期生')])  # the data's own 102〜105期生 member list
        if 'イキヅライブ' in line and '役' not in line: out |= set(series_chars('8'))
    return out
FULL_NOTE = ''
LINEUP = lineup_for(pid)
OVR = json.load(open('data/show-overrides.json')).get(pid, {})  # hand corrections, e.g. measured length
rows = []; show_all = set()
items = S['items']
for it in items:
    if it['type'] != 'song': continue
    song = SI.get(it.get('songId'))
    if not song: continue
    ch = parse_remark(it.get('remarks'))
    src = 'remark'
    if ch is None:
        ch = [c for a in song['artists'] if a['id'] in AR for c in resolve_artist(a, it.get('remarks') or '')]; src = 'artist'
    if LINEUP: ch = [c for c in ch if c in LINEUP or CH[c]['seriesId'] == '5']  # drop non-lineup (absent) members; SIM guests kept
    rows.append(dict(pos=it['position'], name=it.get('customSongName') or song['name'], remarks=it.get('remarks'), w=OVR.get(str(it['position']), {}).get('weight', weight(it.get('remarks'))), wb=weight(it.get('remarks'), False),
                     chars=list(dict.fromkeys(ch)), src=src, artist=' / '.join(dict.fromkeys(AR[a['id']]['name'] for a in song['artists'] if a['id'] in AR)), song=song))
    show_all |= set(ch)
# "all cast" songs
for r in rows:
    if r['remarks'] and '出演者全員' in r['remarks']: r['chars'] = sorted(LINEUP | show_all if LINEUP else show_all); r['src'] = 'all'
show_all = set(c for r in rows for c in r['chars'])
def cast(c):  # the cast member named on this show's lineup (SIM etc. have several casts over the years)
    cs = CH[c]['casts']
    if not cs: return CH[c]['fullName']
    hit = [x['seiyuu'] for x in cs if FULL_NOTE and norm(x['seiyuu']) in FULL_NOTE]
    return hit[0] if hit else cs[0]['seiyuu']
per = C.defaultdict(lambda: dict(w=0.0, n=0, solo=0.0, collab=0.0)); ser = C.Counter(); art = C.Counter()
for r in rows:
    sers = {CH[c]['seriesId'] for c in r['chars']}
    r['collab'] = len(sers) > 1
    r['solo'] = len(r['chars']) == 1
    for c in r['chars']:
        p = per[c]; p['w'] += r['w']; p['n'] += 1
        p['collab' if r['collab'] else 'solo' if False else 'collab'] += 0
        if r['collab']: p['collab'] += r['w']
        if r['solo']: p['solo'] += r['w']
    cnt = C.Counter(CH[c]['seriesId'] for c in r['chars'])
    # bill the whole song to its own franchise: the song's series that most performers belong to (ties -> first listed)
    ss = [str(x) for x in r['song'].get('seriesIds') or []] or [max(cnt, key=cnt.get)]
    top = max(cnt.get(s, 0) for s in ss)
    tied = [s for s in ss if cnt.get(s, 0) == top]
    r['fid'] = tied[0] if len(tied) == 1 else 'OTHERS'
    # original song type = what the song IS (its credited artist + series), not who performed it this time
    anames = [AR[a['id']]['name'] for a in r['song']['artists'] if a['id'] in AR]
    asz = max([len([c for c in AR[a['id']]['characters'] if c]) for a in r['song']['artists'] if a['id'] in AR] or [0])
    sids = r['song'].get('seriesIds') or []
    MAINNAMES = {"μ's", 'Aqours', '虹ヶ咲学園スクールアイドル同好会', '蓮ノ空女学院スクールアイドルクラブ', 'いきづらい部！'}
    r['otype'] = ('Guest (SIM)' if sids == [5] else 'Cross-franchise' if len(sids) >= 2 else
                  'Full group' if any(n in MAINNAMES or n.startswith('Liella!') for n in anames) else 'Solo' if asz == 1 else 'Unit')  # a tie = a cross-franchise song with no single home -> Others
    for s, n in cnt.items(): ser[s] += r['w'] * n / len(r['chars'])
    art[r['artist']] += r['w']
def gini(v):
    v = sorted(v); n = len(v); t = sum(v); return 0 if not t else 2 * sum((i + 1) * x for i, x in enumerate(v)) / (n * t) - (n + 1) / n
out = dict(name=P['tourName'], date=P['date'], songs=len(rows), weighted=sum(r['w'] for r in rows), weighted_binary=sum(r['wb'] for r in rows), performers=len(per),
    series=[[SER[s]['name'], SER[s]['color'], round(v, 2)] for s, v in ser.most_common()],
    artists=[[k, v] for k, v in art.most_common()],
    perf=sorted([[CH[c]['fullName'], cast(c), SER[CH[c]['seriesId']]['color'], SER[CH[c]['seriesId']]['name'], p['w'], p['n'], p['collab'], p['solo']] for c, p in per.items()], key=lambda x: -x[4]),
    gini=gini([p['w'] for p in per.values()]), gini_series=gini(list(ser.values())),
    songlist=[[r['pos'], r['name'], r['remarks'], r['w'], len(r['chars']), r['src'], r['collab'], [[SER[s]['color'], n] for s, n in C.Counter(CH[c]['seriesId'] for c in r['chars']).most_common()], r['artist'][:30], r['wb'], (('その他（複数シリーズ）', '#7a8794') if r['fid'] == 'OTHERS' else (SER[r['fid']]['name'], SER[r['fid']]['color'])), [CH[c]['fullName'] for c in r['chars']], r['otype'], r['song']['id']] for r in rows])
json.dump(out, open(sys.argv[2] if len(sys.argv) > 2 else '/dev/stdout', 'w'), ensure_ascii=False, indent=1)
if len(sys.argv) > 2:
    print(len(rows), 'songs', out['weighted'], 'weighted', len(per), 'performers', 'gini', round(out['gini'], 3))
    print(out['series']); print(out['artists'][:15])
    print([ (r[1], r[4], r[5]) for r in out['songlist']])
    print(out['perf'][:8]); print(out['perf'][-8:])
