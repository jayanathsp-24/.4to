# Architecture decisions

## Web app

- The web MVP lives in `apps/web` as a separate Vite + React + TypeScript app; `apps/mobile` remains unchanged.
- It uses state-based in-app navigation and demo data, with no additional router dependency.
- The API contract mirrors `services/api`'s `/v1` REST paths in `src/api.ts`; failures fall back to local demo data for MVP resilience.
- The interface is dark-first and uses the Section 9 CSS custom properties exclusively. Component files do not define design-token hex values.
- Copy is collected in `src/i18n.ts` so English strings can be replaced with locale catalogs later.
- Primary navigation is a fixed bottom footer on desktop and mobile, with no left sidebar.
- Photo Tree is visualized as a trunk with branch lines. Photos sit at the tips of branches and each branch terminates in a linked Space.

- **Sharing model:** references (`space_photos`) point to private-tree originals. Removing a photo from the tree removes its original and references; no independent copy is stored.
- **Launch sign-in:** email/password only. Google/Apple sign-in is documented as future work.
- **Free storage:** 5 GB per user.
- **Independent members:** a username can be invited to one Space without becoming a friend.
- **Chat:** MVP REST history plus WebSocket subscriptions. Photos in chat are represented by `photo_ref`; text/photo replies beyond references are Phase 2.
- **Storage:** S3-compatible storage, with local MinIO in development.
- **Location privacy:** originals retain EXIF by default. Sharing a photo does not strip metadata in this MVP; a remove-location-on-share toggle will be added before production.
- **Languages:** English first. Copy is centralized enough for later i18n, but Sri Lankan language packs are not in MVP.
- **Feed:** explicitly out of MVP implementation; the mobile tab is an empty Phase 2 state.
- **Export/reminders:** REST stubs and Celery tasks are present for integration; production scheduling and zip delivery require worker deployment configuration.
- **Mobile networking:** the app uses demo data when it cannot reach a backend; the API client is ready for live calls.
- **Personal Space placement:** `tree_space_links` stores each user's own placement of a joined Space. Joining creates a `New Growth` branch/link; leaving or removal deletes that link.
- **Tree rendering:** mobile uses a deterministic layout module plus `react-native-svg` and gesture-handler; web uses a responsive CSS/SVG-inspired fallback with a list view. The same private branch/Space concepts are preserved on both surfaces.
