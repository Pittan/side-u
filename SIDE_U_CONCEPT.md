# SIDE U — Concept & Handoff

> Status: Concept approved for a new standalone project  
> Updated: 2026-09-23  
> Language: Japanese-first  
> Working title: **SIDE U — Selected by You**

## 1. Purpose

Perfume will release `Favorites (Selected by Perfume) / コールドスリープ` on 2026-12-23. The three members will each select 13 songs for `Side A`, `Side K`, and `Side N`; the official track list has not yet been announced.

SIDE U is an unofficial fan-made web tool based on this idea:

> もし、あなたにも13曲を選ぶSideがあったなら。  
> Perfumeの楽曲から、あなたの「Side U」をつくろう。

This is not a prediction of all three official discs. A user selects exactly 13 songs for a single personal disc, orders them, gives the disc a small amount of personality, shares it, and optionally creates it as an Apple Music playlist.

Official announcement:

- https://www.perfume-web.jp/news/detail.php?id=4331

## 2. Project boundary

Build SIDE U as a **new standalone project/repository**.

The existing repository is a data source and reference implementation only:

- https://github.com/Pittan/perfume-database

Do not attempt to extend or modernize the existing Angular application as part of this project. Import and normalize the useful song data into the new project instead.

## 3. Product principles

1. One purpose: choose a personal 13-track `Side U`.
2. No SIDE U account is required.
3. No server-side storage of a user's selection.
4. No internal social network or public user-content directory.
5. Sharing must work even for people without Apple Music.
6. Apple Music is the only streaming-service integration in scope.
7. The core selection and sharing experience must continue to work if any API or dynamic image service is unavailable.
8. The product must clearly identify itself as unofficial and fan-made.

## 4. Primary user flow

1. Open the landing page.
2. Read the one-sentence concept and start.
3. Search/browse Perfume songs and select exactly 13.
4. Reorder the 13 tracks.
5. Optionally enter a display name of up to 10 visible characters.
6. Optionally select up to three preset tags/phrases.
7. View the completed SIDE U card.
8. Share a URL or a generated image.
9. Optionally connect Apple Music and create one private playlist.

The main CTA should remain disabled until exactly 13 unique songs are selected. Mobile UX is the priority; keep a persistent `n / 13` counter visible.

## 5. Suggested copy

### Hero

**SIDE U — Selected by You**

もし、あなたにも13曲を選ぶSideがあったなら。

### Main CTA

`Side Uをつくる`

### Completion CTA

`この13曲でSide Uを完成する`

### Apple Music CTA

`Apple MusicにSide Uをつくる`

### Disclaimer

`SIDE Uは非公式のファン制作ツールです。Perfume、所属事務所、レコード会社、Appleとは関係ありません。`

## 6. Personalization

### Display name

- Optional.
- Maximum 10 grapheme clusters, not 10 JavaScript UTF-16 code units.
- Normalize with Unicode NFKC.
- Remove control characters, bidirectional-control characters, and invisible formatting characters.
- Render as text only; never insert it as HTML.
- The name should remain in the URL fragment so it is not sent to the server.
- The name appears in the opened page and browser-generated share image.
- The name does **not** appear in the server-generated OGP image in v1.

### Preset tags

Use controlled vocabulary rather than an arbitrary short-text field. A user may choose zero or one item from each category.

Initial candidate set:

| Category | Options |
| --- | --- |
| Scene | 朝から / 深夜に / 移動中に / ライブ前に / ひとりで |
| Mood | 踊りたい / 浸りたい / 泣きたい / 上がりたい / 漂いたい |
| Flavor | 初期曲多め / ライブ映え / 隠れ名曲 / 未来志向 / 余韻重視 |

Display them as tags rather than forcing every combination into a sentence, for example:

`#深夜に  #浸りたい  #隠れ名曲`

Encode numeric preset IDs in the share payload, not the Japanese strings.

The final vocabulary and Japanese wording need a short copy review before launch.

## 7. Song catalog

### Existing source state

At the time of review, the existing repository contained:

- 223 song records, ending around the 2022 `PLASMA` era.
- 127 Spotify mappings and 122 Apple Music mappings.
- Streaming mappings that effectively stop around the 2019 song `再生`.
- No current songs from the two `ネビュラロマンス` albums or the subsequent digital releases.

At least 22 post-`PLASMA` non-instrumental tracks need to be added, plus any separately released versions required by the catalog policy.

Relevant official discography sources:

- https://www.perfume-web.jp/discography/
- https://www.perfume-web.jp/20x25-anniversary/album/
- https://www.perfume-web.jp/discography/detail.php?id=96

### Selection policy

- Include officially released Perfume tracks.
- Exclude instrumental/off-vocal versions from the default eligible pool.
- Keep clearly named official alternate mixes/remixes as separate choices when they are meaningfully distinct.
- Preserve a parent/canonical relationship between alternate versions.
- Do not use lyrics, audio, official album artwork, official artist photographs, or official logo artwork.
- Use stable internal numeric IDs; never use a title as the primary key.

### Proposed normalized shape

```ts
type Song = {
  id: number
  title: string
  kana: string
  artist: 'Perfume' | string
  releasedOn?: string
  parentId?: number
  kind: 'canonical' | 'mix' | 'remix' | 'instrumental' | 'other'
  selectable: boolean
  appleMusic?: {
    songId: string
    storefront: 'jp'
    verifiedAt: string
  }
  sources: Array<{
    label: string
    url: string
  }>
}
```

### Data validation

CI should reject:

- Duplicate internal IDs.
- Missing parents.
- Duplicate Apple Music IDs unless explicitly allowlisted.
- A selectable song with neither a verified Apple Music mapping nor an explicit `unavailable` status.
- Malformed source URLs or release dates.
- Share payload fixtures that reference missing/non-selectable songs.

Whether Apple Music-unavailable songs remain selectable is an open product decision. The preferred behavior is to keep them visible but warn before export and suggest a verified alternate version where possible.

## 8. Share URL design

### Important OGP constraint

URL fragments are not sent in HTTP requests and are not visible to social-media OGP crawlers. A fully fragment-only state can have only a generic OGP card.

Use a hybrid URL:

```text
https://example.com/u/<public-payload>#n=<encoded-display-name>
```

The public payload contains only:

- Schema version.
- 13 ordered internal song IDs.
- Up to three preset IDs.
- A small integrity checksum.

The fragment contains only the optional display name.

Expected payload size is far below normal URL limits. Thirteen unsigned 16-bit song IDs require only 26 bytes before versioning and encoding. Use compact base64url encoding rather than JSON in the final URL.

### Behavior

- The browser reconstructs the complete result from the path plus fragment.
- The OGP Worker reconstructs only songs and preset tags from the path.
- If a platform strips the fragment, the 13-song selection still works; only the display name is lost.
- Invalid payloads should return a safe generic page, never an exception dump.
- Share pages should emit `noindex, nofollow` and must not be listed in a public directory.

## 9. OGP and share images

### Dynamic OGP

Generate a 1200×630 image containing:

- `SIDE U`.
- `Selected by You`.
- The 13 ordered track titles, likely in two columns.
- Selected preset tags.
- Original visual styling and an unofficial-fan-project label.

Do not render the arbitrary display name in server-generated OGP v1.

Suggested routes:

```text
GET /u/:payload       Dynamic HTML metadata plus the application shell
GET /og/:payload.png  Dynamic OGP PNG
```

The HTML response for `/u/:payload` must provide server-visible Open Graph and X/Twitter metadata. A client-rendered SPA alone is insufficient for crawlers.

Use a deterministic OGP URL and long-lived edge caching. Repeated requests for the same payload must reuse the cached image.

Cloudflare Images added server-side text rasterization in September 2026 and supports custom fonts. This is the preferred first implementation to spike:

- https://developers.cloudflare.com/images/optimization/binding/
- https://developers.cloudflare.com/changelog/post/2026-09-02-images-binding-updates/

If dynamic rendering fails or quota is exhausted, return a static generic SIDE U image.

### Browser-generated image

Generate a separate share/download image in the browser. It may include the optional display name because it is not uploaded to the SIDE U server.

Support:

- Web Share API with files on compatible mobile browsers.
- Copy-link fallback.
- PNG download fallback.

Do not upload generated user images in v1.

## 10. Apple Music integration

Apple Music is the only streaming integration in scope.

### Desired behavior

- Connection happens only after the user completes a Side U.
- Request the minimum necessary Apple Music authorization.
- Create one playlist in the user's library containing the 13 tracks in order.
- Default to private/non-public where supported.
- Suggested title: `SIDE U - {displayName}` or simply `SIDE U` when no name is set.
- Generate the description from controlled copy and preset tags; do not accept an arbitrary description.
- Show a per-track error if a catalog mapping is unavailable rather than silently changing the list.

Official API references:

- https://developer.apple.com/musickit/
- https://developer.apple.com/documentation/applemusicapi/create-a-new-library-playlist
- https://developer.apple.com/documentation/AppleMusicAPI/generating-developer-tokens

### Token boundary

- Store the Apple Media Services private key only in Cloudflare Secrets.
- A Cloudflare Worker issues a short-lived, origin-restricted developer token.
- The Music User Token stays in the browser and is sent directly to Apple.
- SIDE U must not store or log the Music User Token.
- Cache/reuse the developer token until shortly before expiry to reduce signing work.

Apple Developer Program membership is required and currently costs USD 99/year or the local equivalent:

- https://developer.apple.com/jp/help/account/membership/program-enrollment

## 11. Recommended deployment architecture

The frontend framework is intentionally not fixed in this concept. Use a small TypeScript web application that can produce static assets and hydrate the share page. Favor low bundle size and straightforward Cloudflare deployment over framework novelty.

```text
Standalone TypeScript web app
  ├─ Static UI and normalized song catalog
  ├─ Browser-only selection state and display name
  ├─ Browser-generated PNG
  └─ Apple Music client integration

Cloudflare
  ├─ Static hosting
  ├─ /u/* metadata Worker
  ├─ /og/* image Worker + Images binding
  └─ /api/apple-token Worker + secret key
```

No D1, KV, R2, database, queue, or user account system is needed in v1.

Route static assets around Functions/Workers so normal application traffic stays on free static delivery.

## 12. Cost ceiling

Keep the project on Cloudflare Free at launch.

As of 2026-09-23:

- Static asset requests are free.
- Workers Free allows 100,000 requests/day.
- Cloudflare Images Free allows 5,000 unique transformations/month.
- Exceeding Images Free limits rejects new transformations and does not charge overage.
- The generic OGP fallback should keep sharing functional after exhaustion.

References:

- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/images/pricing/

Do not enable Workers Paid or Images Paid for the MVP. Paid-plan budget alerts are informational and do not stop spending, so they are not a substitute for remaining on Free:

- https://developers.cloudflare.com/billing/manage/budget-alerts/

Expected fixed costs:

- Apple Developer Program: USD 99/year or local equivalent.
- Domain registration, unless an existing domain/subdomain is reused.

Apple Music API requests are rate-limited rather than treated here as a usage-billed hosting service.

## 13. Privacy and non-social design

Do not implement:

- SIDE U accounts or authentication.
- Profiles or avatars.
- Comments, likes, follows, direct messages, or notifications.
- A public feed, public gallery, rankings, or search over user creations.
- Arbitrary user-written descriptions.
- User image uploads.
- Server-side storage of selections or names.
- Advertising or third-party behavioral analytics.

The optional name stays in the fragment. The server-visible payload is limited to whitelisted song IDs and preset IDs. Share pages are stateless and unindexed.

Publish short pages for:

- Privacy and external transmissions.
- Terms/disclaimer.
- Data sources and correction contact.

Disclose, in plain Japanese, when the browser connects to Cloudflare and Apple, what is sent, and why. Use Cloudflare's aggregate operational metrics rather than adding Google Analytics at launch.

This design reduces moderation and platform-law exposure, but it is not a legal opinion. Obtain a focused pre-launch review if legal certainty is required.

## 14. Accessibility and resilience

- Support keyboard selection and reorder controls; drag-and-drop cannot be the only reorder mechanism.
- Maintain readable contrast and visible focus states.
- Avoid relying on color alone for selection state.
- Handle long Japanese and Latin song titles without truncating essential information.
- Keep the core experience usable when JavaScript APIs such as Web Share are unavailable.
- Preserve an in-progress Side U in local storage on the device.
- Provide a reset action with confirmation.
- Do not lose the selection across Apple Music authorization redirects.

## 15. Explicitly out of scope for v1

- Spotify and LINE MUSIC integrations.
- In-browser music playback or previews.
- Lyrics.
- Official artwork or artist photography.
- Three-disc A/K/N prediction mode.
- User-to-user discovery features.
- Server-backed short URLs.
- Signed/timestamped prediction receipts.
- Public statistics or aggregate song rankings.
- Native mobile apps.

## 16. Potential post-launch feature

After the official Side A/K/N track lists are published, add a local-only comparison mode:

- Overlap with Side A: `n / 13`.
- Overlap with Side K: `n / 13`.
- Overlap with Side N: `n / 13`.
- A new browser-generated result card.

No leaderboard or centralized result collection is required.

## 17. Suggested implementation milestones

### M0 — Feasibility and data

- Create the new repository and minimal deployment.
- Choose the frontend framework.
- Import and normalize the existing song catalog.
- Add all releases through 2026.
- Verify Apple Music IDs and version choices.
- Confirm Apple Developer Program/MusicKit access.
- Spike one Apple playlist creation.
- Spike one Japanese dynamic OGP image on Cloudflare Free.

### M1 — Core Side U

- Song search and browse.
- Exactly-13 selection constraint.
- Reordering.
- Local persistence.
- Name and preset-tag personalization.
- Payload encoder/decoder with round-trip tests.

### M2 — Sharing

- `/u/:payload` metadata route.
- Dynamic OGP and static fallback.
- Browser-generated name-bearing PNG.
- Web Share, copy-link, and download fallbacks.
- Invalid-payload handling and `noindex` behavior.

### M3 — Apple Music

- MusicKit authorization.
- Secure developer-token endpoint.
- Create one ordered private playlist.
- Availability and partial-failure UI.
- Redirect and token-loss resilience.

### M4 — Launch hardening

- Mobile Safari and Chrome testing.
- Keyboard/accessibility testing.
- Security headers and CSP.
- Privacy, external-transmission, disclaimer, and data-source pages.
- Cloudflare route isolation and quota-fallback verification.
- Production smoke test using a real Apple Music subscriber account.

## 18. MVP acceptance criteria

The MVP is complete when:

1. A new visitor can select and order exactly 13 valid songs on mobile.
2. The state survives a reload on the same device.
3. The generated URL reconstructs the ordered 13 songs and preset tags without a database.
4. The optional name reconstructs from the fragment and is never sent to SIDE U application endpoints.
5. A crawler-visible share URL returns valid OGP metadata.
6. The OGP image shows the 13 titles and preset tags, with a static fallback available.
7. The user can download/share a name-bearing PNG locally.
8. An authorized Apple Music subscriber can create the ordered playlist once without the SIDE U backend receiving their Music User Token.
9. Static selection/sharing remains available if OGP generation or Apple Music fails.
10. There are no accounts, public galleries, comments, arbitrary public text, or server-stored selections.

## 19. Decisions still needed

- Final public product/domain name.
- Frontend framework.
- Final preset vocabulary and visual identity.
- Whether Apple Music-unavailable songs remain selectable.
- Whether alternate mixes are shown inline or behind a `別バージョン` disclosure.
- Whether the display name should ever be moved into the server-visible payload for name-bearing OGP. The current recommendation is **no**.
- Whether to reuse a `perfumehub.app` subdomain or register a neutral new domain.

## 20. Recommended first task for the next agent

Start with M0 only. Do not build the full UI until these three risks are proven:

1. A complete, current, version-aware Apple Music mapping can be produced.
2. MusicKit can create an ordered 13-track playlist from the chosen web stack.
3. Cloudflare Free can render and cache a Japanese 1200×630 OGP image with 13 titles, and return a generic fallback when rendering fails.

Once those pass, implement M1 and M2 before polishing Apple Music authorization.
