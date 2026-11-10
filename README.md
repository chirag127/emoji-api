# Emoji Metadata

Every fully-qualified RGI emoji in Unicode 18.0 — 3,963 records with CLDR name, group, subgroup, the emoji version it arrived in, and skin-tone data.

No authentication. No server. No rate limit. The committed JSON is the database.

    curl https://chirag127.github.io/emoji-api/api/v1/data.json

## What you get

| Field | Example | Notes |
| --- | --- | --- |
| `emoji` | `"👋"` | The emoji itself, in its fully-qualified form. |
| `id` / `codepoints` | `"1F44B"` / `["U+1F44B"]` | Hex codepoints, dash-joined for the id, so sequences like `1F468-200D-2764-FE0F-200D-1F468` are addressable. |
| `name` | `"waving hand"` | CLDR short name, English. |
| `version` | `"0.6"` | Emoji version the emoji was introduced in, taken from the `E` tag in the source line. |
| `group` / `subgroup` | `"People & Body"` / `"hand-fingers-open"` | 9 groups, 98 subgroups, CLDR order preserved in `order`. |
| `skinToneSupport` | `true` | Whether the emoji comes in skin tones; 1,848 records are true. |
| `skinToneVariants` | `5` | How many tone variants exist for this emoji: 308 emoji carry them, 1,540 variants in total. |
| `tone` / `base` | `"dark"` / `"1F44B"` | Set on a tone variant, pointing back at the untinted emoji. |

## Endpoints

| Endpoint | Description | Size |
| --- | --- | --- |
| `/api/v1/data.json` | All 3,963 emoji, in CLDR order | 1,669,605 bytes |
| `/api/v1/individual/{id}.json` | One emoji, e.g. `/api/v1/individual/1F44B.json` | 288–573 bytes each |
| `/api/v1/search-index.json` | The same records keyed by codepoint id, for a single-fetch lookup | 1,902,902 bytes |
| `/api/v1/meta.json` | Record count, emoji version, retrieval time | 555 bytes |

## Data source and accuracy

[`emoji-test.txt`](https://unicode.org/Public/emoji/latest/emoji-test.txt) — the UTS #51 keyboard/display test data, version 18.0,
fetched on 2026-11-10. It is the authoritative list of what is recommended for keyboards and display, and it carries the group,
subgroup, CLDR name and the emoji version for every entry.

`skinToneSupport` and the base/variant links come from the `Emoji_Modifier_Base` property in
[`emoji-data.txt`](https://unicode.org/Public/UCD/latest/ucd/emoji/emoji-data.txt) (Unicode 18.0.0). A variant is linked to its base by
CLDR name, and the scraper refuses to publish if a base with tone variants is not really an `Emoji_Modifier_Base` — so a bad name match
fails the build instead of producing silent nonsense.

Only `fully-qualified` entries are published. The source also lists 1,029 minimally-qualified and 243 unqualified spellings, plus 9
components, which are the same emoji written defectively or the skin-tone modifiers themselves.

## Limits, stated plainly

- No keywords, no annotations, no translations. CLDR's annotations are a separate download and are not in this file, so you cannot search
  by keyword here — search the `name` field instead.
- No images. `emoji` is the character; rendering is your font's problem, and a font that is behind will show boxes for newer emoji.
- Skin-tone support is only complete for single-tone emoji. Emoji where two people each take a tone, such as handshake, have combined
  variants whose names carry two tones; those 500 records have `tone: null` and `base: null`.
- Version 18.0 is what was published on the fetch date. Emoji 19 will add entries and this file will be stale until the scraper runs again.

## Contract

[openapi.yaml](./openapi.yaml) describes all four endpoints. The record type:

```ts
type Emoji = {
  id: string;            // "1F44B"
  emoji: string;         // "👋"
  name: string;          // "waving hand"
  codepoints: string[];  // ["U+1F44B"]
  version: string;       // "0.6"
  group: string;         // "People & Body"
  subgroup: string;      // "hand-fingers-open"
  skinToneSupport: boolean;
  skinToneVariants: number;
  tone: string | null;   // "dark" on a tone variant
  base: string | null;   // "1F44B" on a tone variant
  status: 'fully-qualified';
  order: number;         // 172
};
```

## Licence

Code: MIT — see [LICENSE](./LICENSE). Data: Unicode data files are covered by the
[Unicode License V3](https://www.unicode.org/license.txt), which permits use, modification and redistribution provided the copyright and
permission notice travels with the data. Unicode and the Unicode Logo are trademarks of Unicode, Inc.

---

## About the author

**Chirag Singhal** — building free, open APIs and tools. Everything here is free, no
authentication, no rate limits, no telemetry. If it saves you time and you want to work
together, that is exactly what this is for.

- **Email — the fastest way to reach me:** [chirag@oriz.in](mailto:chirag@oriz.in)
- **GitHub:** [github.com/chirag127](https://github.com/chirag127)
- **LinkedIn:** [linkedin.com/in/chirag127](https://www.linkedin.com/in/chirag127/)
- **X:** [x.com/singhal127](https://x.com/singhal127)
- **YouTube:** [@ChiragSinghal127](https://www.youtube.com/@ChiragSinghal127)
- **Instagram:** [chiragsinghal127](https://www.instagram.com/chiragsinghal127/)
- **Reddit:** [Far_Macaron_9910](https://www.reddit.com/user/Far_Macaron_9910/)
- **Buy me a coffee:** [buymeacoffee.com/chirag127](https://buymeacoffee.com/chirag127)

**Hiring?** I build developer tooling, data APIs and web platforms. Email me — I reply to
everything.
