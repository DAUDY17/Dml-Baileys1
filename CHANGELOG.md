# 1.3.0 (2026-08-13)

### Fixes
- Synced with upstream Baileys 7.0.0-rc14 to resolve the 405 disconnection issue: Windows client payload now reports `WIN_HYBRID` instead of the retired `WIN32` sub-platform, and the WA Web version was bumped to `2.3000.1043857760`
- Switched the `libsignal` dependency from a git URL to the published npm package (`^6.0.0`), which should mean fewer install failures on hosts that can't clone from GitHub during install
- Implemented `getSenderKeyDistributionMessage`, `hasSenderKey`, `getSessionInfo`, and `close()` on the signal repository — these were already declared in the types but never actually implemented
- `decodeSyncdMutations` no longer aborts the entire app-state sync when it hits one corrupted or undecryptable record; it now skips just that record and keeps going, while still surfacing real missing-key errors so the retry flow can recover properly
- Fixed a hardcoded MAC validation flag in the app-state patch decoder that was ignoring the caller's `validateMacs` setting
- History-sync buffering now correctly merges and dedupes `pastParticipants` across chunks instead of dropping the field
- Added automatic recovery for 463 (account-restriction) ack errors: the client now proactively re-issues privacy tokens instead of just logging a warning, and reachout-timelock ack errors now trigger a state refresh
- Rebuilt mex/GQL notification handling (`NotificationUserReachoutTimelockUpdate`, `MessageCappingInfoNotification`, linked-profile LID mapping) and device-list notifications now update the device cache directly instead of only logging

### Notes
- Reviewed every file upstream changed in rc14, including the ones with very large raw diffs (messages-send.ts, messages-recv.ts, Message.ts). Most of that size turned out to be diff noise from this fork's own custom features (username API, WABuilder buttons, `toxicHandler`, `sendInteractive`) not existing upstream — none of that was touched
- Did not port the retry-receipt session-bundle injection upstream added, since it would need to be woven into this fork's already more advanced auto-session-recreation logic in `sendMessagesAgain`, and I'd rather leave that working code alone than risk it without being able to run a build here

# 1.2.4 (2026-08-13)

### Fixes
- Synced with upstream Baileys 7.0.0-rc14 to resolve the 405 disconnection issue: Windows client payload now reports `WIN_HYBRID` instead of the retired `WIN32` sub-platform, and the WA Web version was bumped to `2.3000.1043857760`
- This release intentionally stays scoped to the disconnect fix — upstream's broader rc14 changes (mex notification handling, LID mapping updates, and a libsignal dependency migration) touch code that overlaps with this fork's custom modules and are being reviewed separately before merging, so nothing else changed here

# 1.2.0 (2026-07-08)

### Features
- Added a proper username API — `checkUsername`, `setUsername`, `deleteUsername`, `getMyUsername`, `setUsernamePin`, `findUserByUsername`, `fetchContactUsernames`, `checkUsernameMulti`, `getUsernameRecommendations`
- Added `USyncPictureProtocol` and `USyncTextStatusProtocol` for fetching profile pictures and text statuses via USync
- Added `AIRich`, `Button`, `ButtonV2`, `Carousel`, and `Toolkit` (`WABuilder` module) — rich message builders for interactive buttons, carousels, and Meta AI-style responses with inline citations, hyperlinks, LaTeX, code blocks, and tables
- Added `sendInteractive` (also callable as `inappsignup` / `inapp_signup`) — sends interactive buttons, but automatically falls back to plain text when the bot's paired device is iOS
- Added shorter import aliases: `AIRich` as `RichMessage` / `Rich` / `RichMsg` / `RichAI`, `Button` as `Buttons` / `Btns`, `ButtonV2` as `ButtonsV2` / `BtnsV2` / `NewButtons`
- Added `host` option to `downloadContentFromMessage` for overriding the media host manually
- Added `groupOnlineCount` to presence updates when WhatsApp includes it
- Added `destroy()` on the event buffer, actually clearing timers and listeners on socket end (previously called but never implemented)

### Fixes
- Confirmed protection against the message-spoofing/app-state-corruption issue from GHSA-qvv5-jq5g-4cgg (CVE-2026-48063) — spoofed history-sync, app-state-key-share, and placeholder-resend-response payloads not sent from your own account are dropped
- `generateProfilePicture` now crops from the center instead of the top-left corner, so non-square photos no longer come out lopsided
- App state sync no longer throws and kills the whole sync on a single bad patch or a hash mismatch — it now logs a warning and continues
- LID mapping store rewritten to batch and coalesce concurrent lookups, plus a proper `close()`
- Dropped spoofed "self-only" protocol messages (history sync notifications, app state key shares, etc.) that don't actually come from `fromMe`
- `getChatId` now throws a clear error on missing `remoteJid`/`participant` instead of silently working with `undefined`
- `profilePictureUrl` querying refactored to the newer, simpler `buildProfilePictureQueryContent` approach
- Dependency versions and resolutions synced with upstream Baileys

# 1.1.0 (2026-06-04)

### Features
- Added `registerSocketEndHandler` — register async callbacks that fire when the socket closes
- Added `fetchAccountReachoutTimelock()` — query account restriction/timelock status from WA servers
- Added `fetchNewChatMessageCap()` — query new chat message quota and usage
- Added `buildPairingQRData` and `getCompanionPlatformId` from companion-reg-client-utils — QR now encodes companion platform type for proper device recognition
- Exported `XWAPaths`, `QueryIds`, `ReachoutTimelockEnforcementType`, `ReachoutTimelockState`, `NewChatMessageCapInfo`, `NewChatMessageCappingStatusType`, `NewChatMessageCappingMVStatusType`, `NewChatMessageCappingOTEStatusType` types
- Added `'message-capping.update'` event type

### Fixes
- Fixed pre-key upload: deduplication via in-flight promise, retry logic now internal to `uploadLogic`, server drives timing
- Fixed `ev.destroy()` on socket close to prevent memory leaks
- Fixed `signalRepository.close()` called on socket end
- Fixed socket end handlers run before `ev.destroy()` — guarantees all post-close cleanup runs in order
- Fixed newsletter join endpoint to `xwa2_newsletter_join_v2` and leave to `xwa2_newsletter_leave_v2`
- Fixed group metadata: `getBinaryNodeChild` error now surfaces WA server error code instead of crashing
- Fixed album messages: `contextInfo` now passed to each album item, `userJid` uses socket auth state
- Fixed `handleGroupStory`: removed stale fallback chain, now directly calls `generateWAMessageContent`
- Fixed `handleEvent`: `userJid` now from socket auth state instead of generated fake JID
- Fixed `handlePollResult`: `userJid` now from socket auth state
- Fixed `detectType` to accept `content.album` as alias for `content.albumMessage`
- Fixed `ToxicHandler` constructor: removed unused `utils` parameter
- Fixed `getCompanionPlatformId` replacing deprecated `getPlatformId` for companion platform registration

# 1.0.10 (2025-05-03)

Initial release of toxic-baileys
