#!/usr/bin/env python3
"""Score data/predictions/day2-from-day1.json against the real Day 2 setlist.
Usage: python3 scripts/score-prediction.py <day1Id> <day2Id> <prediction.json> [out.json]"""
import json, sys, difflib, collections as C
SONG = '--level=song' in sys.argv
d1, d2, pred, *o = [x for x in sys.argv[1:] if not x.startswith('--')]
J = lambda f: json.load(open('data/' + f))
S = J('performance-setlists.json'); SI = {x['id']: x for x in J('song-info.json')}
songs = lambda pid: [(it['position'], it['songId']) for it in S[pid]['items'] if it['type'] == 'song' and it.get('songId')]
a, b = songs(d1), songs(d2); ia, ib = [x[1] for x in a], [x[1] for x in b]
keep = set()
for blk in difflib.SequenceMatcher(None, ia, ib, autojunk=False).get_matching_blocks(): keep |= set(range(blk.a, blk.a + blk.size))
P = json.load(open(pred)); res = []
for s in P['slots']:
    i = s['slot'] - 1
    kept = (s['song_id'] in ib) if SONG else (i in keep); moved = (not SONG) and (not kept) and s['song_id'] in ib
    res.append(dict(slot=s['slot'], song=s['song'], cls=s['cls'], p_changed=s['p_changed'], kept=kept, moved=moved, changed=not kept,
                    in_day2=s['song_id'] in ib, hit_candidate=None))
n = len(res); actual = sum(r['changed'] for r in res); expected = sum(r['p_changed'] for r in res)
brier = sum((r['p_changed'] - r['changed']) ** 2 for r in res) / n
base = actual / n; brier_flat = sum((base - r['changed']) ** 2 for r in res) / n
cands = {s['slot']: {c['song'] for c in s['candidates']} for s in P['slots']}
names_d2 = {SI[x]['name'] for x in ib if x in SI}
print(f'[{"song-level: changed = dropped" if SONG else "slot-level"}] Day1 {len(a)} songs, Day2 {len(b)} songs; shared songs: {len(set(ia) & set(ib))}; D1 slots kept in place: {len(keep)}')
print(f'changed slots: predicted {expected:.1f}, actual {actual} of {n}')
print(f'Brier (lower better): model {brier:.3f}  vs always-{base:.0%} {brier_flat:.3f}  vs coin-flip 0.250')
by = C.defaultdict(lambda: [0, 0, 0.0])
for r in res: by[r['cls']][0] += r['changed']; by[r['cls']][1] += 1; by[r['cls']][2] += r['p_changed']
for k, v in by.items(): print(f'  {k:<26} predicted changed {v[2]:.1f}/{v[1]}  actual {v[0]}/{v[1]}')
hit = sum(1 for s in P['slots'] if cands[s['slot']] & names_d2); print('slots where >=1 of the top-5 candidates appeared in Day 2:', hit)
if o: json.dump(dict(slots=res, expected=expected, actual=actual, brier=brier, brier_flat=brier_flat), open(o[0], 'w'), ensure_ascii=False, indent=1)
