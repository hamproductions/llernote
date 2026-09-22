import { describe, expect, it } from 'vitest';
import { parseEventList, parseTotalCount } from '../eventernote-server';

/** Trimmed from a real eventernote.com listing page. */
const page = `
<div class="pagination pagination-centered"><ul><li class=active><span>1</span></li></ul></div>
<h2 class="gb_subtitle">tinmsnakeさんの参加イベント一覧(145件)</h2>
<div class="gb_event_list clearfix">
  <ul>
    <li class="clearfix ">
      <div class="date">
        <p class="day0">2027-05-09 (<span class="wday0">日</span>)</p>
        <p><img src="https://example.test/491866_s.jpg" alt="upcoming"></p>
      </div>
      <div class="event">
        <h4><a href="/events/491866">Liella! 8th LoveLive! Tour &lt;愛知公演&gt; Day.2</a></h4>
        <div class="place">
          会場: <a href="/places/814">ポートメッセなごや 第1展示館</a>
        </div>
        <div class="actor">
          <ul>
            <li>出演者:</li>
            <li><a href="/actors/Liella%21/59030">Liella!</a></li>
            <li><a href="/actors/%E4%BC%8A%E9%81%94/59027">伊達さゆり</a></li>
          </ul>
        </div>
      </div>
      <div class="note_count"><p title="参加者数">126</p></div>
    </li>
    <li class="clearfix past">
      <div class="date">
        <p class="day6">2025-08-17 (<span class="wday6">日</span>)</p>
      </div>
      <div class="event">
        <h4><a href="/events/397471">ニジガク校外学習 愛知公演 DAY.2 ＜昼公演＞</a></h4>
        <div class="place">
          会場: <a href="/places/99">Niterra日本特殊陶業市民会館</a>
        </div>
        <div class="actor">
          <ul>
            <li>出演者:</li>
            <li><a href="/actors/x/1">大西亜玖璃</a></li>
          </ul>
        </div>
      </div>
      <div class="note_count"><p title="参加者数">580</p></div>
    </li>
  </ul>
</div>
<div class="pagination pagination-centered"><ul><li class=next><a href="?page=2">&gt;</a></li></ul></div>
`;

describe('parseEventList', () => {
  it('parses past rows as well as upcoming ones', () => {
    const events = parseEventList(page);

    // Past events carry `class="clearfix past"`. They are the whole point of an
    // attendance import, so a parser that only matched `clearfix ` would return
    // a plausible-looking but badly incomplete list.
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.href)).toEqual(['/events/491866', '/events/397471']);
  });

  it('extracts the fields the importer matches on', () => {
    const [upcoming] = parseEventList(page);

    expect(upcoming).toEqual({
      name: 'Liella! 8th LoveLive! Tour <愛知公演> Day.2',
      href: '/events/491866',
      date: '2027-05-09 (日)',
      place: 'ポートメッセなごや 第1展示館',
      artists: ['Liella!', '伊達さゆり']
    });
  });

  it('leaves a date the client can regex an ISO date out of', () => {
    for (const event of parseEventList(page)) {
      expect(event.date).toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });

  it('strips the 会場: prefix from the venue', () => {
    expect(parseEventList(page).every((e) => !e.place.startsWith('会場'))).toBe(true);
  });

  it('does not mistake nested actor list items for event rows', () => {
    // Each row contains a nested <ul><li> of performers; naive splitting on </li>
    // would shred the rows.
    expect(parseEventList(page).every((e) => e.artists.length > 0)).toBe(true);
  });

  it('ignores pagination list items outside the event list', () => {
    expect(parseEventList(page).every((e) => e.href.startsWith('/events/'))).toBe(true);
  });

  it('returns nothing for a page with no event list', () => {
    expect(parseEventList('<html><body>No events here</body></html>')).toEqual([]);
  });
});

describe('parseTotalCount', () => {
  it('reads the total from the listing heading', () => {
    expect(parseTotalCount(page)).toBe(145);
  });

  it('is undefined when the page states no total', () => {
    expect(parseTotalCount('<h2>no count</h2>')).toBeUndefined();
  });
});
