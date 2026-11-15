#!/usr/bin/env python3
"""Predict which Day-2 slots differ from Day 1, from how past consecutive-day shows changed.
Usage: python3 scripts/predict-day2.py <day1PerfId> <out.json>
Only Day 1 (and history before it) is used, so the output can be committed BEFORE Day 2 is known and
scored afterwards with scripts/score-prediction.py.

Model: every song of every past consecutive-day pair (setlists >= 15 songs, same tour + venue) is
aligned with difflib; each Day-1 song is 'kept' (same place in Day 2) or not. Songs are classed by role
(opening, closing, short/medley/TV, many-series or 11+ people, solo/duo, unit/group). P(kept) per class =
all-pairs rate shrunk toward the rate from multi-franchise pairs (>=3 series), weighted n/(n+PRIOR_N)."""
import json, re, sys, difflib, collections as C
from datetime import date

J = lambda f: json.load(open('data/' + f))
S, P = J('performance-setlists.json'), {x['id']: x for x in J('performance-info.json')}
SI = {x['id']: x for x in J('song-info.json')}; AR = {x['id']: x for x in J('artists-info.json')}
SER = {s['id']: s['name'] for s in J('series-info.json')}
d1, out = sys.argv[1], sys.argv[2]
PRIOR_N = 20
SHORT = re.compile(r'メドレー|ショート|Short|TV', re.I)

def songs(pid):
    sl = S.get(pid)
    return [(it['position'], it['songId'], it.get('remarks') or '') for it in sl['items'] if it['type'] == 'song' and it.get('songId')] if sl else None

def cls(sid, rm, i, n):
    so = SI.get(sid)
    nch = max([len([c for c in AR[x['id']]['characters'] if c]) for x in so['artists'] if x['id'] in AR] or [0]) if so else 0
    nser = len(so.get('seriesIds') or []) if so else 1
    if i == 0: return 'opening'
    if i >= n - 1: return 'closing'
    if SHORT.search(rm): return 'short/medley/TV'
    if nser >= 2 or nch >= 11: return 'many-series / 11+ people'
    if nch <= 2: return 'solo/duo'
    return 'unit/group (3-10)'

# ---- history: consecutive-day pairs strictly before Day 1
cut = P[d1]['date']
bytour = C.defaultdict(list)
for p in P.values(): bytour[(p['tourName'], p['venue'])].append(p)
pairs = []
for ps in bytour.values():
    ps = sorted(ps, key=lambda p: (p['date'], p['id']))
    for a, b in zip(ps, ps[1:]):
        if a['date'] >= cut: continue
        if (date.fromisoformat(b['date']) - date.fromisoformat(a['date'])).days == 1:
            sa, sb = songs(a['id']), songs(b['id'])
            if sa and sb and len(sa) >= 15 and len(sb) >= 15: pairs.append((a, b, sa, sb))
multi = [x for x in pairs if len(x[0]['seriesIds']) >= 3]
def rates(pp):
    r = C.defaultdict(lambda: [0, 0])
    for a, b, sa, sb in pp:
        ia, ib = [x[1] for x in sa], [x[1] for x in sb]
        keep = set()
        for blk in difflib.SequenceMatcher(None, ia, ib, autojunk=False).get_matching_blocks(): keep |= set(range(blk.a, blk.a + blk.size))
        for i, (pos, sid, rm) in enumerate(sa):
            k = cls(sid, rm, i, len(sa)); r[k][1] += 1; r[k][0] += i in keep
    return r
ra, rm_ = rates(pairs), rates(multi)
pk = {}
for k in ra:
    prior = ra[k][0] / ra[k][1]; n = rm_[k][1] if k in rm_ else 0
    ev = rm_[k][0] / n if n else prior; w = n / (n + PRIOR_N)
    pk[k] = dict(p=round(w * ev + (1 - w) * prior, 3), all_pairs=round(prior, 3), multi=round(ev, 3) if n else None, n_all=ra[k][1], n_multi=n)

# ---- Day 1 slots + replacement candidates (songs of that franchise in its recent shows, not already on Day 1)
s1 = songs(d1); on_d1 = {x[1] for x in s1}
recent = [p for p in P.values() if p['date'] < cut and p['date'] >= '2025-11-01' and S.get(p['id'])]
freq = C.defaultdict(C.Counter)  # franchise -> song id -> number of recent shows
for p in recent:
    for sid in {x[1] for x in songs(p['id']) or []}:
        so = SI.get(sid)
        if so and so.get('seriesIds'): freq[str(so['seriesIds'][0])][sid] += 1
slots = []
for i, (pos, sid, rm) in enumerate(s1):
    so = SI[sid]; k = cls(sid, rm, i, len(s1)); fr = str(so['seriesIds'][0]) if so.get('seriesIds') else ''
    cands = [(SI[c]['name'], n) for c, n in freq[fr].most_common(40) if c not in on_d1 and not (SHORT.search(rm) and False)][:5]
    slots.append(dict(slot=i + 1, position=pos, song_id=sid, song=so['name'], remarks=rm, cls=k, franchise=SER.get(fr, fr),
                      p_kept=pk[k]['p'], p_changed=round(1 - pk[k]['p'], 3), candidates=[dict(song=a, recent_shows=b) for a, b in cands]))
exp = sum(s['p_changed'] for s in slots)
json.dump(dict(day1=d1, generated_from_history_before=cut, pairs_all=len(pairs), pairs_multi=len(multi), class_rates=pk,
               expected_changed_slots=round(exp, 1), of=len(slots), slots=slots), open(out, 'w'), ensure_ascii=False, indent=1)
print(f'{len(pairs)} past pairs ({len(multi)} multi-franchise). Expected changed slots: {exp:.1f} of {len(slots)}')
for k, v in sorted(pk.items(), key=lambda kv: -kv[1]['p']): print(f"  {k:<26} P(kept)={v['p']:.0%}  (all {v['all_pairs']:.0%} n={v['n_all']}, multi {v['multi'] if v['multi'] is None else format(v['multi'], '.0%')} n={v['n_multi']})")
