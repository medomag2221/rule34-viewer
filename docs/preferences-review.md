# Preferences: r34-react → Zerochan Viewer

Reviewed `.research/r34-react/src/components/preferences/PrefBackends.tsx`,
`redux/reducers/preferences.ts`, `components/tag/ChipWrapper.tsx`.

- Backend selection in r34-react switches Rule34 JSON proxies (Render/Adaptable), not databases. These are not compatible Zerochan backends; they were not enabled.
- Adopted chip borders and clearly differentiated selected/excluded states, retaining the Random Gallery palette.
- Page size and saved tag/supertag settings already persist locally.
- Useful future preferences: preview quality, suggestion count, hide viewed posts. Original-quality preloading should remain opt-in to avoid unnecessary traffic. Video autoplay/preloading and comments are not relevant to the current image-only adapter.
- Arbitrary backend URL input should not be exposed: server-side allowlisting is required to avoid SSRF.

## Current sorting and filtering

Official API: https://www.zerochan.net/api . `s=id` orders newest first; `s=fav` requests popularity. `t=1/2` scopes popularity to the latest 7000/15000 entries; `t=0` requests all time. Do not call these exact calendar windows.

Live checks: the untagged all-time popularity endpoint returned malformed JSON. Tagged popularity and the recent scope worked. Errors are surfaced; there is no silent substitution of a different scope.

Both listing and entry JSON omitted favorite counts during testing. At the user's request there is no HTML scraping fallback: scores remain null and display an em dash. The adapter declares capabilities.scores/minLikes=false and popularity=true. The threshold remains editable and saved, but the API/UI explicitly state it is not applied for Zerochan.

For future score-capable adapters, `minLikes=N` means strictly greater than N. `src/ratings.js` supplies a tested numeric predicate; unknown scores are never treated as zero. Adapters should filter upstream or before pagination in a local index. No additional source has been connected yet.

