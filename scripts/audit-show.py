#!/usr/bin/env python3
"""Independent audit of one show. Re-derives every song's members, weight and billing straight
from the raw data (no code shared with analyze-show.py) and compares with analyze-show's output.
Usage: python3 scripts/audit-show.py <performanceId> <analyze-show-output.json>"""
import json, re, sys, collections as C

pid, other = sys.argv[1], sys.argv[2]
J = lambda f: json.load(open('data/' + f))
items = J('performance-setlists.json')[pid]['items']
songs = {s['id']: s for s in J('song-info.json')}
artists = {a['id']: a for a in J('artists-info.json')}
chars = {c['id']: c for c in J('character-info.json')}
series = {s['id']: s['name'] for s in J('series-info.json')}
sq = lambda s: re.sub(r'\s|　', '', s or '')

# ---- lineup: straight from the llfans 出演者 note
note = next(t['note'] for t in J('raw/llfans-detailed-tours.json')
            for c in t['concerts'] for p in c['performances'] if p['id'] == pid)
main, guest = note.split('ゲスト出演')
variant = C.defaultdict(set)  # (unit id, label) -> character ids
for c in chars.values():
    for u in c.get('units') or []:
        if u.get('additionalInfo'): variant[(u['id'], u['additionalInfo'])].add(c['id'])
named = {cid for cid, c in chars.items() if any(sq(x['seiyuu']) and sq(x['seiyuu']) in sq(note) for x in c['casts'])}
group_lines = {'4': variant[('91', '1期生〜3期生')],          # 『スーパースター』: Liella!
               '6': variant[('133', '102〜105期生')],         # 蓮ノ空（102期〜105期生）
               '8': {cid for cid, c in chars.items() if c['seriesId'] == '8'}}  # いきづらい部！
lineup = set(named)
for s, members in group_lines.items(): lineup |= members
findings = []
def flag(level, msg): findings.append((level, msg))
if len(lineup) != 65: flag('FAIL', f'lineup size {len(lineup)} != 65')

# ---- given-name lookup for remark member lists ("穂乃果、ことり… Ver.")
def lookup(tok):
    tok = {'ランジュ': '嵐珠'}.get(tok, tok)
    hits = [cid for cid, c in chars.items() if sq(c['fullName']).endswith(tok) or sq(c['fullName']).startswith(tok)]
    on = [h for h in hits if h in lineup or chars[h]['seriesId'] == '5']
    return on or hits
GROUP = {"μ's": '1', 'Aqours': '2', '虹ヶ咲': '3', 'Liella': '4', '蓮ノ空': '6', 'いきづらい部': '8'}

def weight(rm):
    if re.search(r'Movie\s?Edit', rm): return 1.0
    if 'メドレー' in rm: return 0.3
    if re.search(r'1番.*(ラスサビ|[CD]メロ)|2コーラス', rm): return 0.75
    if re.search(r'TV\s?サイズ|TV\s?Size|Movie\s?サイズ|Movie\s?Size|ショート|Short', rm, re.I): return 0.5
    return 1.0

OVR = json.load(open('data/show-overrides.json')).get(pid, {})
rows = []
for it in items:
    if it['type'] != 'song': continue
    s = songs[it['songId']]; rm = it.get('remarks') or ''
    tail = rm.split('｜')[-1]
    members, how = None, ''
    if '出演者全員' in rm:
        members, how = set(lineup) | {c for c in chars if chars[c]['seriesId'] == '5' and c in named}, 'all cast'
    elif re.search(r'B\.\s?G\.\s?P\.', tail):
        ids = [a['id'] for a in s['artists'] if (a['id'], 'B. G. P.') in variant]
        members, how = (set().union(*[variant[(i, 'B. G. P.')] for i in ids]) if ids else None), 'remark B.G.P. → artist variant'
    elif re.search(r'\d〜\d期生', tail):
        members, how = set(variant[('91', '1期生〜3期生')]), 'remark 1〜3期生 → variant'
    elif 'Ver.' in tail or tail.startswith('Liella') or '｜' in rm:
        toks = [x.strip() for x in re.split('[、,]', tail.replace('Ver.', '')) if x.strip()]
        if all(re.fullmatch(r'(メドレー|ショート|TVサイズ|文化祭|椿滝桜|・|\s)+', x) for x in toks): toks = []  # format words only, no names
        out = set(); ok = True
        for tk in toks:
            g = next((v for k, v in GROUP.items() if tk.startswith(k)), None)
            if g: out |= {c for c in lineup if chars[c]['seriesId'] == g}; continue
            h = lookup(tk)
            if len(h) != 1: ok = False; ('Ver.' in tail) and flag('WARN', f"#{it['position']+1} {s['name']}: token '{tk}' resolves to {[chars[x]['fullName'] for x in h]}")
            else: out |= set(h)
        if '｜' in rm and 'Ver.' not in tail and not all(any(tk.startswith(k) for k in GROUP) or len(lookup(tk)) == 1 for tk in toks): toks, out, ok = [], set(), False  # free text after ｜, not a member list
        if toks and ok and out: members, how = out, 'remark names'
    if members is None:
        members = set()
        for a in s['artists']:
            v = a.get('variant')
            members |= variant[(a['id'], v)] if v and variant.get((a['id'], v)) else {c for c in artists[a['id']]['characters'] if c}
        how = 'artist (+variant)'
    absent = {c for c in members if c not in lineup and chars[c]['seriesId'] != '5'}
    members -= absent
    cnt = C.Counter(chars[c]['seriesId'] for c in members)
    ss = [str(x) for x in s.get('seriesIds') or []]
    best = max(cnt.get(x, 0) for x in ss) if ss else 0
    tied = [x for x in ss if cnt.get(x, 0) == best]
    billed = tied[0] if len(tied) == 1 else 'OTHERS'
    if len(tied) > 1: flag('NOTE', f"#{it['position']+1} {s['name']}: tie between {[series[x] for x in tied]} → Others")
    nm = [artists[a['id']]['name'] for a in s['artists'] if a['id'] in artists]; sz = max([len([c for c in artists[a['id']]['characters'] if c]) for a in s['artists'] if a['id'] in artists] or [0])
    ids = s.get('seriesIds') or []
    otype = 'Guest (SIM)' if ids == [5] else 'Cross-franchise' if len(ids) > 1 else 'Full group' if any(n in ("μ's", 'Aqours', '虹ヶ咲学園スクールアイドル同好会', '蓮ノ空女学院スクールアイドルクラブ', 'いきづらい部！') or n.startswith('Liella!') for n in nm) else 'Solo' if sz == 1 else 'Unit'
    rows.append(dict(otype=otype, pos=it['position'], name=s['name'], rm=rm, w=OVR.get(str(it['position']), {}).get('weight', weight(rm)), members=members, how=how, absent=absent, billed=('その他（複数シリーズ）' if billed == 'OTHERS' else series[billed])))

# ---- compare with analyze-show output, song by song
d = json.load(open(other))
theirs = {r[0]: r for r in d['songlist']}
byname = {c['fullName']: cid for cid, c in chars.items()}
print(f"{'#':>2} {'song':<26} {'w':>4} {'n':>3}  {'billed':<12} {'source':<30} check")
for r in rows:
    t = theirs.get(r['pos'])
    tm = {byname[n] for n in t[11]} if t else set()
    ok = t and abs(t[3] - r['w']) < 1e-9 and tm == r['members'] and t[10][0] == r['billed'] and t[12] == r['otype']
    why = '' if ok else f" MISMATCH w={t[3] if t else None} vs {r['w']} | only-mine={sorted(chars[c]['fullName'] for c in r['members']-tm)} only-theirs={sorted(chars[c]['fullName'] for c in tm-r['members'])} | billed {t[10][0] if t else None} vs {r['billed']}"
    if not ok: flag('FAIL', f"#{r['pos']+1} {r['name']}:{why}")
    ab = f" (dropped absent: {', '.join(chars[c]['fullName'] for c in r['absent'])})" if r['absent'] else ''
    print(f"{r['pos']+1:>2} {r['name'][:26]:<26} {r['w']:>4} {len(r['members']):>3}  {r['billed'][:12]:<12} {r['how']:<30} {'OK' if ok else 'FAIL'}{ab}")

# ---- recompute every headline number
per = C.Counter(); sertime = C.Counter()
for r in rows:
    sertime[r['billed']] += r['w']
    for c in r['members']: per[c] += r['w']
nums = {'songs': len(rows), 'weighted': round(sum(r['w'] for r in rows), 2), 'performers': len(per)}
for k, v in nums.items():
    mine, their = v, (round(d[k], 2) if isinstance(d[k], float) else d[k])
    print(f"{k}: audit={mine} analyze={their} {'OK' if mine == their else 'FAIL'}")
    if mine != their: flag('FAIL', f'{k} audit={mine} analyze={their}')
tp = {p[0]: p[4] for p in d['perf']}
for c, v in per.items():
    if abs(tp.get(chars[c]['fullName'], -1) - v) > 1e-9: flag('FAIL', f"performer {chars[c]['fullName']}: audit {v} vs analyze {tp.get(chars[c]['fullName'])}")
missing = lineup - set(per)
if missing: flag('WARN', f"on lineup but on no song: {[chars[c]['fullName'] for c in missing]}")
print('\nsong time by franchise (audit):', {k: round(v, 2) for k, v in sertime.most_common()})
print('performer-song total (audit):', round(sum(per.values()), 2), ' analyze:', round(sum(tp.values()), 2))
print('\nFINDINGS:' if findings else '\nFINDINGS: none')
for lv, m in findings: print(f'  [{lv}] {m}')
import os
if os.environ.get('AUDIT_OUT'):
    json.dump([dict(pos=r['pos'], name=r['name'], w=r['w'], otype=r['otype'], billed=r['billed'], members=sorted(chars[c]['fullName'] for c in r['members'])) for r in rows],
              open(os.environ['AUDIT_OUT'], 'w'), ensure_ascii=False)
sys.exit(1 if any(lv == 'FAIL' for lv, _ in findings) else 0)
