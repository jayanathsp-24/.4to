# .4to — Security & Production-Readiness Checklist

> How to turn the `.4to` photo-sharing app from "it works on my laptop" into something you can responsibly give to real users.

Companion to `4to-app-spec.md` (what to build) and `4to-azure-deployment-guide.md` (where to run it).

**Honest disclaimer:** no app is ever "fully secure," and this document is not legal advice. Security is an ongoing process, not a checkbox. The goal is to remove the common, likely failures first and to be able to detect, contain, and recover from the rest.

---

## 0. How to use this document

Every item has a priority:

| Tag | Meaning | When |
|---|---|---|
| **P0** | Must have | Before **any** real user (even friends) uploads real photos |
| **P1** | Should have | Before a **public launch** (app stores) |
| **P2** | Nice to have | After launch, as the app grows |

Tick the boxes as you go. For each item, understand the **why**, because that's what lets you make good decisions when something isn't covered here.

---

## 1. Know what you're protecting (threat model)

Write this down first; every later decision traces back to it.

### 1.1 Assets (what has value)
| Asset | Why it matters |
|---|---|
| Original photos (private tree) | Highly personal; faces, homes, children, travel patterns |
| Photo metadata (EXIF, GPS, timestamps) | Reveals where someone lives and when they're away |
| Accounts and sessions | Account takeover exposes everything above |
| Chat messages | Private conversations |
| Friend graph and Space membership | Social relationships are sensitive |
| Email, username, profile data | Personal data under privacy laws |
| Secrets (DB passwords, signing keys, cloud credentials) | Gives an attacker everything at once |
| Your reputation and uptime | A breach or outage can end a young app |

### 1.2 Who might attack, and how
| Actor | Likely goals | Typical methods |
|---|---|---|
| **Another legitimate user** (most likely!) | See photos they shouldn't, stalk someone | Changing IDs in requests, guessing links, joining Spaces, abusing invites |
| **Outside attacker / bot** | Take over accounts, steal data, abuse storage | Credential stuffing, brute force, vulnerable dependencies, exposed secrets |
| **Malicious uploader** | Crash your server, host illegal content | Malformed/huge images, zip bombs, malware, abusive content |
| **Ex-friend / abuser** | Keep access after a falling-out | Still being a Space member, old links, stalking via location data |
| **Insider mistake (you)** | — | Leaked key in git, public storage container, misconfigured firewall, deleting the wrong thing |
| **Curious cloud/staff access** | — | Over-broad admin access, unaudited debugging |

### 1.3 Trust boundaries
Anything crossing these lines is untrusted input and needs validation:

```
Phone app  ──►  API  ──►  Database
   │              │
   └──► Blob storage (direct upload via temporary link)
API ◄──► Workers (process uploaded files — the riskiest code: it parses untrusted files)
```

### 1.4 Rule of thumb
> **Never trust the client.** The app is only a convenience; every rule must be enforced on the server.

- [ ] **P0** Write a one-page threat model (assets, actors, top 10 risks) in `docs/threat-model.md`.
- [ ] **P1** Review and update it every time you add a feature (feed, tagging, web viewer, etc.).

---

## 2. Authentication (proving who you are)

### 2.1 Passwords
- [ ] **P0** Hash with **Argon2id** (never MD5/SHA/plain bcrypt-without-tuning). Never log or return passwords.
- [ ] **P0** Minimum length 10–12; check against common/breached passwords (e.g., the HIBP k-anonymity API or a local list). Don't force silly complexity rules; encourage passphrases.
- [ ] **P0** Same error message for "wrong email" and "wrong password" (no account enumeration). Same for password reset ("If that email exists, we sent a link").
- [ ] **P0** Rate limit and slow down login attempts per account **and** per IP; temporary lockout or CAPTCHA after repeated failures.

```python
# pip install argon2-cffi
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()   # sensible defaults; tune memory/time cost on your server

def hash_password(pw: str) -> str:
    return ph.hash(pw)

def verify_password(stored_hash: str, pw: str) -> bool:
    try:
        ok = ph.verify(stored_hash, pw)
    except VerifyMismatchError:
        return False
    # re-hash if parameters were upgraded
    return ok
```

### 2.2 Email verification and account recovery
- [ ] **P0** Verify email ownership before allowing sharing features (prevents fake-account abuse).
- [ ] **P0** Password reset tokens: random, **single-use**, expire in ≤ 30 minutes, stored hashed, and invalidate all sessions after reset.
- [ ] **P1** Notify the user by email on password change, new-device login, and email change.

### 2.3 Multi-factor authentication
- [ ] **P1** Optional 2FA with an authenticator app (TOTP) + one-time backup codes (stored hashed).
- [ ] **P2** Passkeys (WebAuthn): phishing-resistant and passwordless.
- [ ] **P1** Require recent re-authentication for sensitive actions: change email/password, delete account, disable 2FA.

### 2.4 Third-party sign-in and managed identity
- [ ] **P1** Consider **Sign in with Google/Apple** (Apple requires it if you offer other social logins on iOS) or a managed provider (Microsoft Entra External ID, Auth0, Clerk, Supabase Auth). Mature providers handle breached-password checks, MFA, and attack detection better than a first custom implementation.
- [ ] Decide deliberately: **build** (more learning, more risk) vs **buy** (faster, safer). Both are valid; just don't build crypto yourself.

---

## 3. Sessions and tokens

- [ ] **P0** **Short-lived access tokens** (about 15 minutes) + **rotating refresh tokens** (e.g., 30 days).
- [ ] **P0** Store refresh tokens **hashed** in the database, linked to a device/session row.
- [ ] **P0** **Reuse detection:** if an already-used refresh token is presented again, assume theft and revoke the whole token family/session.
- [ ] **P0** JWT validation: pin the allowed algorithm, verify `exp`, `iss`, `aud`; never accept `alg: none`; keep signing keys in Key Vault; support key rotation (`kid`).
- [ ] **P0** On the phone, keep tokens in **Keychain/Keystore** (`expo-secure-store`), never AsyncStorage/plain files.
- [ ] **P1** "Devices & sessions" screen: list devices (name, last used, rough location), allow "log out this device" and "log out everywhere".
- [ ] **P1** Invalidate sessions on password change, 2FA change, or account suspicion.

```python
# Sketch of refresh rotation with reuse detection
# table refresh_tokens(id, user_id, family_id, token_hash, used_at, revoked_at, expires_at, device_id)
def rotate_refresh(presented: str):
    row = db.get_by_hash(sha256(presented))
    if not row or row.expires_at < now() or row.revoked_at:
        raise Unauthorized()
    if row.used_at:                        # token reuse => likely stolen
        db.revoke_family(row.family_id)    # kill the whole chain
        raise Unauthorized()
    db.mark_used(row.id)
    new = issue_refresh(row.user_id, family_id=row.family_id, device_id=row.device_id)
    return issue_access(row.user_id), new
```

---

## 4. Authorization (the #1 risk for a photo app)

> **Authentication** = who are you. **Authorization** = what are you allowed to touch. The most common real-world breach in apps like this is **Broken Object Level Authorization (BOLA/IDOR)**: user A changes `photo_id=123` to `124` and sees user B's photo.

### 4.1 Rules for `.4to`
| Resource | Who can access |
|---|---|
| Private tree photo | **Only the owner**. No exceptions. |
| Photo in a Space | Only **joined** members of that Space (and only while the photo is still shared) |
| Space | Members only; Owner/Admin manage; Owner deletes |
| Chat message | Members of that Space only |
| Profile | Visible to friends / people sharing a Space (decide and document) |
| Another user's tree overview | **Never** |

### 4.2 Implementation checklist
- [ ] **P0** Every query that fetches by ID **also filters by the caller's identity or membership** in the same SQL statement (not "fetch, then check later").
- [ ] **P0** Centralize permission logic in **one module** (`permissions.py`), used by every router. No ad-hoc checks scattered in endpoints.
- [ ] **P0** Default deny: if a rule is missing, access is refused.
- [ ] **P0** Use unguessable IDs (UUIDv4 / random), but remember: **IDs are not security**. Permission checks are.
- [ ] **P0** Return **404** (not 403) for resources the caller can't know exist, to avoid leaking existence.
- [ ] **P0** Re-check permissions when generating **every** signed download link. Links are bearer tokens; keep them short-lived.
- [ ] **P0** When a member leaves/is removed, their access to Space photos and chat **ends immediately**, and their shared photo references are handled per your rule (documented).
- [ ] **P1** Role checks (Owner/Admin/Member) for invites, removals, deleting others' photos, closing a Space.

```python
# Example: access a photo only if you own it, or you share a joined Space that contains it
SQL_PHOTO_FOR_USER = """
SELECT p.*
FROM photos p
WHERE p.id = :photo_id
  AND p.deleted_at IS NULL
  AND (
        p.owner_id = :user_id
     OR EXISTS (
          SELECT 1
          FROM space_photos sp
          JOIN space_members sm ON sm.space_id = sp.space_id
          WHERE sp.photo_id = p.id
            AND sp.removed_at IS NULL
            AND sm.user_id = :user_id
            AND sm.status = 'joined'
     )
  )
"""
```

### 4.3 The authorization test matrix (write these as automated tests)
Create at least two test users (Alice, Bob) and one stranger (Eve), then assert:

| Test | Expected |
|---|---|
| Bob GETs Alice's **private** photo id | 404 |
| Bob GETs Alice's photo that is **shared into a Space Bob has not joined** | 404 |
| Bob (invited but **not accepted**) lists Space photos | 404/403 |
| Bob (joined) lists Space photos | 200 |
| Bob removed from Space, tries again | 404 |
| Bob tries to share **Alice's** photo into a Space | 403/404 |
| Bob deletes Alice's photo from tree | 404 |
| Eve fetches a signed URL after it expired | 403 |
| Eve guesses another user's tree overview | 404 |
| Non-admin tries to invite/remove members | 403 |
| Chat: non-member opens WebSocket for the Space | rejected |
| Tampered JWT / wrong signature / expired token | 401 |

```python
def test_bob_cannot_read_alice_private_photo(client, alice, bob, alice_photo):
    r = client.get(f"/v1/tree/photos/{alice_photo.id}", headers=auth(bob))
    assert r.status_code == 404
```
- [ ] **P0** All rows above implemented as tests and run in CI on every change.

---

## 5. Photo storage and uploads

### 5.1 Storage configuration
- [ ] **P0** Storage account/bucket is **private**; public blob access disabled; TLS 1.2+ only.
- [ ] **P0** Upload and download via **short-lived signed URLs** (≤ 15 min, scoped to one blob and one operation).
- [ ] **P0** Random object keys (`users/<uuid>/<uuid>`); never use user-provided filenames as paths.
- [ ] **P0** Per-user **storage quota** and per-request limits (max files, max size). Enforce server-side.
- [ ] **P0** Soft delete + versioning on blobs so accidental deletion is recoverable.
- [ ] **P1** Lifecycle rules (expire abandoned/incomplete uploads, tier old data).
- [ ] **P1** Separate storage accounts (or containers with separate permissions) for originals vs thumbnails.
- [ ] **P1** Diagnostic logs on the storage account sent to Log Analytics.

### 5.2 Validating uploads (never trust the file)
Uploaded files are **untrusted input**. The processing worker, which parses them, is your riskiest code.

- [ ] **P0** Check the **real content type** (magic bytes), not the filename or `Content-Type` header. Allow-list: JPEG, PNG, HEIC/HEIF, WebP (add video later, deliberately).
- [ ] **P0** Enforce **max file size** and **max pixel dimensions** (defends against "decompression bombs": tiny files that expand to gigabytes of pixels).
- [ ] **P0** Process in the **background worker** with CPU/memory/time limits and a non-root user; one bad file must not crash the API.
- [ ] **P0** Keep image libraries (Pillow, libvips, libheif) **patched**; image parsers have a history of serious vulnerabilities.
- [ ] **P0** Confirm uploaded content hash matches what the client declared; reject mismatches.
- [ ] **P1** Malware scanning for uploads (e.g., Microsoft Defender for Storage malware scanning or ClamAV) and quarantine suspicious files.
- [ ] **P1** Re-encode **only derived** thumbnails/previews (never the original) and strip metadata from derivatives.
- [ ] **P1** Reject or quarantine files that fail to decode, and alert on spikes of failures.

```python
from PIL import Image
Image.MAX_IMAGE_PIXELS = 100_000_000          # ~100 MP hard ceiling; Pillow raises on larger

ALLOWED = {"JPEG", "PNG", "WEBP", "HEIF"}

def validate_image(path: str, max_bytes: int = 60 * 1024 * 1024):
    if os.path.getsize(path) > max_bytes:
        raise ValueError("file too large")
    with Image.open(path) as im:
        im.verify()                           # structural check, no full decode
    with Image.open(path) as im:              # reopen after verify()
        if im.format not in ALLOWED:
            raise ValueError("unsupported format")
        w, h = im.size
        if w * h > 100_000_000:
            raise ValueError("image too large")
```

### 5.3 Metadata and location privacy
- [ ] **P0** Never expose original EXIF/GPS to other users by default **in thumbnails and previews**.
- [ ] **P1** "Remove location when sharing to a Space" toggle (default **on** for people who haven't chosen).
- [ ] **P1** Show clearly what's shared (e.g., "Location data included") before pushing photos.
- [ ] **P1** Be careful with map/location features: precise location + "who was there when" can enable stalking; allow per-Space opt-in.

### 5.4 Deduplication caution
- [ ] **P0** De-duplicate only **within one user's own storage**. Cross-user dedup can reveal whether someone else has the same file ("confirmation of file" attacks).

### 5.5 Delete means delete
- [ ] **P0** Deleting a photo removes the blob, thumbnails, DB row, and Space references (after the soft-delete window you document).
- [ ] **P0** Account deletion removes the tree and all files within a stated period (e.g., 30 days) and backups age out naturally. Document this.

---

## 6. API hardening

- [ ] **P0** **HTTPS only** everywhere; HSTS enabled; HTTP redirected or disabled.
- [ ] **P0** Validate every input with Pydantic models: types, lengths, enums, regex for usernames. Reject unknown fields where possible.
- [ ] **P0** Use parameterized queries / ORM (no string-built SQL).
- [ ] **P0** **Rate limiting** per user and per IP (Redis-backed), with stricter limits on sensitive routes.
- [ ] **P0** Max request body size; timeouts; pagination limits (`limit ≤ 100`) so nobody can pull "everything" in one request.
- [ ] **P0** Generic error responses to clients (no stack traces, SQL errors, or internal paths); detailed errors only in logs.
- [ ] **P0** Disable `/docs`, `/openapi.json`, and debug mode in production (or protect them).
- [ ] **P1** Strict **CORS** (only your real web origins; native apps don't need CORS).
- [ ] **P1** Security headers on any web surface: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] **P1** Idempotency keys on create/upload-complete endpoints so retries on bad networks don't duplicate data.
- [ ] **P1** Version your API (`/v1`) and keep old versions working while old app versions exist; add a **minimum supported app version** check to force critical upgrades.

Suggested starting rate limits (tune with real data):

| Route | Limit |
|---|---|
| `POST /auth/login` | 5 / min / IP and 10 / hour / account |
| `POST /auth/register` | 3 / hour / IP |
| Password reset request | 3 / hour / account |
| Friend requests | 30 / day / user |
| Space invites | 50 / day / user |
| Reminder "poke" | 1 / 48 h per target |
| Upload init | per-user daily quota + burst limit |
| Chat messages | e.g. 20 / 10 s / user |
| Username search | 30 / min / user (prevents scraping all users) |

---

## 7. Chat and real-time (WebSocket)

- [ ] **P0** Authenticate the WebSocket connection (short-lived ticket or token, not a token in a logged URL).
- [ ] **P0** Authorize **per Space room**: only joined members can subscribe or send.
- [ ] **P0** Rate limit messages; cap message length; validate payloads.
- [ ] **P0** Escape/sanitize message text when rendering (especially on a future web client) to prevent XSS.
- [ ] **P1** Re-check membership on a timer / when membership changes, to disconnect removed members at once.
- [ ] **P1** Message delete respects "delete for everyone" rules; log moderation actions.
- [ ] **P2** Link previews fetched server-side must defend against SSRF (block private IP ranges, redirects, large responses).

---

## 8. Mobile app security

- [ ] **P0** No secrets in the app bundle. Anything shipped to a phone can be extracted: API keys that matter must stay on the server.
- [ ] **P0** Tokens in Keychain/Keystore only. Clear them on logout.
- [ ] **P0** All traffic HTTPS; no cleartext traffic allowed in release builds.
- [ ] **P0** Don't log tokens, URLs with signatures, or personal data in release builds; disable verbose logging.
- [ ] **P1** Validate deep links and push-notification payloads (never trust IDs inside them; the server still authorizes).
- [ ] **P1** Keep dependencies updated; review permissions requested (only photo library + notifications, with clear explanations).
- [ ] **P1** Obfuscation/minification in release; sign builds with protected keys (Play App Signing / EAS-managed credentials).
- [ ] **P1** Hide sensitive screens in the app switcher where appropriate (optional privacy blur).
- [ ] **P2** Optional biometric lock for the Photo Tree (Face ID/fingerprint).
- [ ] **P2** Certificate pinning: it adds protection against some network attacks, but it also breaks the app when certificates rotate. Add only if you can maintain it safely (pin to a backup key; plan updates).
- [ ] **P2** Root/jailbreak detection and app attestation (Play Integrity, App Attest): useful against automated abuse, not a substitute for server-side checks.

---

## 9. Secrets, cloud, and infrastructure security

- [ ] **P0** No secrets in git (use `gitleaks`/GitHub secret scanning). If one leaks, **rotate it immediately**; deleting the commit is not enough.
- [ ] **P0** Secrets only in Key Vault / platform secrets; injected at runtime as environment variables.
- [ ] **P0** Separate secrets and credentials per environment (dev ≠ staging ≠ prod).
- [ ] **P0** Least-privilege identities: API gets only what it needs; **managed identity** instead of passwords/keys where possible.
- [ ] **P0** Database not exposed to the whole internet; app uses a **non-admin** database user; TLS required.
- [ ] **P0** Enable cloud **MFA** on your own Azure/GitHub accounts; no shared admin accounts.
- [ ] **P0** Billing alerts + budget caps (a credential leak often shows up first as a cloud bill).
- [ ] **P1** Private networking: VNet integration, private endpoints for DB/Storage/Key Vault, firewall rules, no public DB endpoint.
- [ ] **P1** **WAF / edge protection** (Azure Front Door + WAF) with rate limiting and bot rules.
- [ ] **P1** Container hardening: minimal base image, non-root user, read-only filesystem where possible, pinned versions, image scanning.
- [ ] **P1** Regular patching schedule for base images and dependencies.
- [ ] **P1** Azure Policy / guardrails (deny public storage, require tags/TLS).
- [ ] **P2** Customer-managed encryption keys, advanced threat detection (Defender for Cloud), SIEM alerts.

---

## 10. Privacy, legal, and trust

> Not legal advice: check the laws that apply to **your users' locations** and consider a short consultation with a lawyer before a public launch.

- [ ] **P0** **Privacy Policy** and **Terms of Service** written in plain language: what you collect (photos, metadata, contacts?), why, who sees it, how long you keep it, where it's stored, who your processors are (Azure, Firebase, Sentry).
- [ ] **P0** **Data minimization:** collect only what the product needs. Don't request contacts or precise location unless a feature requires it.
- [ ] **P0** Explicit, honest statement: *"Your private tree is visible only to you. We don't use your photos for advertising or AI training."* Only say it if it is true and enforced.
- [ ] **P1** **Account deletion in the app** (Google Play and Apple both require this for apps with accounts) and a web page with deletion instructions for Play's data-safety requirements.
- [ ] **P1** **Data export** ("download all my data") and correction/access rights.
- [ ] **P1** Fill in store disclosures accurately: Google Play **Data safety** form; Apple **App Privacy** labels.
- [ ] **P1** Check applicable laws: Sri Lanka's **Personal Data Protection Act** (verify its current implementation status), the **GDPR** if you have EU users, and others depending on where users live. Consider where data is stored and which processors you use.
- [ ] **P1** **Minimum age** policy (commonly 13+, 16+ in some EU countries). Photos of children are especially sensitive; decide and document your rules.
- [ ] **P1** **Block, mute, and report** features for users, Spaces, photos and chat messages.
- [ ] **P1** Illegal content process: removal and reporting duties exist for illegal material (especially child sexual abuse material) in many jurisdictions. Have a reporting channel, a moderation/removal procedure, and consult local legal guidance. Consider hash-matching or detection services as you scale.
- [ ] **P1** A contact for security reports (`security@yourdomain`) and a `/.well-known/security.txt`.
- [ ] **P2** Optional **end-to-end encrypted "vault"**: it would mean the server cannot read the photos, which strongly improves privacy, but it also breaks server-side thumbnails, search, recaps and easy recovery. Treat it as a major design decision, not a patch.

---

## 11. Abuse prevention and platform safety

- [ ] **P0** Block disposable abuse: verified email, rate limits, per-user storage quota (free storage is an attractive target for abuse as a file host).
- [ ] **P1** Detect and limit suspicious patterns: many signups from one IP, mass invites, scraping usernames, huge download volumes.
- [ ] **P1** Invites require acceptance; users can control who can invite them to Spaces (everyone / friends only / nobody).
- [ ] **P1** Anti-stalking safeguards: leaving a Space is always possible; removing yourself from tagged photos; location sharing is opt-in; blocking hides you from search.
- [ ] **P1** Admin/moderation tools are behind strong authentication and **audit-logged**; admins cannot browse private trees.
- [ ] **P2** CAPTCHA on high-risk flows; device reputation; automated moderation signals.

---

## 12. Production engineering

### 12.1 Environments
- [ ] **P0** Separate **dev**, **staging**, and **prod**, each with its own database, storage, and secrets.
- [ ] **P0** **Never copy real user data** into dev/staging. Use the seed script with fake data.
- [ ] **P1** Staging mirrors production settings so you can rehearse releases and migrations.

### 12.2 CI/CD
- [ ] **P0** Every PR runs: lint, type checks, unit tests, authorization tests.
- [ ] **P0** Branch protection on `main`: required review, required passing checks, no force-push.
- [ ] **P1** Deploy via pipeline only (no manual hotfixes on servers); production needs manual approval.
- [ ] **P1** Immutable image tags (git SHA) and a **tested rollback** procedure.
- [ ] **P1** Mobile: OTA updates (EAS Update) for JS-only fixes + store releases with **staged rollout** (e.g., 5% → 20% → 100%) and a crash-free-rate gate.

### 12.3 Database changes
- [ ] **P0** All changes through **migrations** (Alembic), reviewed like code.
- [ ] **P1** **Backward-compatible** migrations ("expand, then contract"): add columns/tables first, deploy code that uses them, remove old ones in a later release. Old app versions and old server replicas are alive during a rollout.
- [ ] **P1** Take a backup/snapshot before risky migrations; avoid long table locks (add indexes concurrently).

### 12.4 Reliability
- [ ] **P0** Resumable, **idempotent** uploads (safe to retry), with an "upload complete" step that verifies size/hash.
- [ ] **P1** Background jobs with retries, backoff, a **dead-letter queue** for permanent failures, and alerts on queue growth.
- [ ] **P1** Health/readiness probes; autoscaling limits; graceful shutdown.
- [ ] **P1** Timeouts and circuit breakers when calling external services (FCM, Blob).
- [ ] **P1** Handle the "thundering herd": many friends uploading right after a trip ends can spike load; test it.

### 12.5 Backups and disaster recovery
- [ ] **P0** Automated database backups with point-in-time restore enabled.
- [ ] **P0** **Actually test a restore** into a new server. An untested backup is a hope.
- [ ] **P1** Define **RPO/RTO** (how much data you can lose; how long you can be down) and design to them.
- [ ] **P1** Photo durability: ZRS/GRS redundancy, soft delete + versioning, protection against accidental mass deletion (resource locks, restricted delete permissions).
- [ ] **P2** Cross-region recovery plan.

### 12.6 Observability
- [ ] **P0** Structured JSON logs to stdout; **no** passwords, tokens, signed URLs, or photo content in logs.
- [ ] **P0** Error tracking (Sentry) for API and app; alerts on error-rate spikes.
- [ ] **P1** Metrics and tracing (Application Insights/OpenTelemetry): latency (p95), error rate, queue depth, upload success rate, DB connections.
- [ ] **P1** **Audit log** of security events: logins, failed logins, password/email changes, 2FA changes, token reuse detections, membership changes, deletions, admin actions. Retain according to your policy.
- [ ] **P1** Alerts: auth failure spikes, unusual download volume, 5xx rate, storage egress, cost anomalies.
- [ ] **P1** Uptime checks on `/healthz` from outside.

### 12.7 Performance and cost control
- [ ] **P1** Thumbnails via CDN; originals only on explicit download.
- [ ] **P1** Database indexes from the spec; connection pooling; avoid N+1 queries.
- [ ] **P1** Load test realistic scenarios: 500-photo batch uploads, a 10-person Space opening at once.
- [ ] **P1** Per-user quotas, egress monitoring and cost alerts.

---

## 13. DevSecOps: automate the checks

Add a security job to CI so mistakes are caught before they ship.

```yaml
# .github/workflows/security.yml
name: security
on:
  pull_request:
  push: { branches: [main] }
  schedule: [{ cron: "0 3 * * 1" }]   # weekly

permissions:
  contents: read
  security-events: write

jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pipx install semgrep && semgrep --config auto --error services apps

  python-deps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pipx install pip-audit && pip-audit -r services/api/requirements.txt

  js-deps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd apps/mobile && npm ci && npm audit --audit-level=high

  container:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t 4to-api:scan services/api
      - uses: aquasecurity/trivy-action@0.28.0
        with: { image-ref: 4to-api:scan, severity: "HIGH,CRITICAL", exit-code: "1" }
```
(Pin action versions you actually use; check each tool's current docs.)

- [ ] **P0** Secret scanning (gitleaks) + GitHub secret scanning/push protection enabled.
- [ ] **P1** SAST (Semgrep/CodeQL), dependency audits, container scanning, IaC scanning (Checkov/Trivy config).
- [ ] **P1** **Dependabot/Renovate** for automatic update PRs. Merge security updates quickly.
- [ ] **P1** Keep an SBOM (software bill of materials) for releases (optional but a good habit).

---

## 14. Security test plan

### 14.1 Automated
- Authorization matrix tests (Section 4.3), run on every PR.
- Input validation tests: oversize, wrong types, unicode edge cases, SQL-ish strings.
- Rate limit tests: repeated logins eventually blocked.
- Token tests: expired, tampered, wrong audience, reused refresh token.

### 14.2 Upload abuse tests
- [ ] A file renamed `.jpg` that is actually something else → rejected
- [ ] 0-byte file, truncated JPEG, corrupt HEIC → handled without crashing the worker
- [ ] Extremely large pixel dimensions → rejected
- [ ] 10,000 tiny files in one session → quota/rate limit hits
- [ ] Re-using an expired or another user's upload URL → fails
- [ ] Uploading to another user's object key → fails

### 14.3 Manual two-account test
With two real accounts (Alice, Bob) and a stranger (Eve):
1. Try every endpoint with the **other user's IDs** (use Postman/Burp and replace IDs).
2. Remove Bob from a Space and confirm he can no longer see photos or chat, including cached links.
3. Try old tokens after "log out everywhere" and after password change.
4. Try reading/writing storage URLs after expiry.

### 14.4 Dynamic scanning and review
- [ ] **P1** Run **OWASP ZAP** against **staging** (never production first) using an authenticated session.
- [ ] **P1** Review against the **OWASP API Security Top 10** and **OWASP ASVS** (Level 1 is a good first target) and **OWASP MASVS** for the mobile app.
- [ ] **P2** External penetration test or a small bug bounty before a large launch.

---

## 15. Incident response (decide now, not during the crisis)

Keep this in `docs/runbook.md`.

### 15.1 Roles and contacts
- Who is "incident lead" (you, for now)? How can users reach you (`security@`)? Who can you ask for help?

### 15.2 If a secret leaks (API key, DB password, JWT key)
1. **Revoke/rotate** the secret immediately (Key Vault → new version → redeploy).
2. Review logs for use of the old secret.
3. If it was a **JWT signing key**: rotate and invalidate all sessions.
4. Remove it from git history *and* assume it was seen; document what happened.

### 15.3 If an account is compromised
Lock the account, revoke all sessions/refresh tokens, force a password reset, notify the user, review the audit log for what was accessed or shared.

### 15.4 If there may have been a data breach
1. **Contain:** stop the leak (disable the feature, rotate secrets, block the path).
2. **Assess:** what data, which users, what time window (use audit logs and storage logs).
3. **Preserve** evidence (logs, snapshots).
4. **Notify:** affected users and any regulators as required by the laws that apply to you, **within the legal time limits** (get legal advice).
5. **Fix and learn:** root cause, tests that would have caught it, update this checklist.

### 15.5 If the database is lost or corrupted
Restore to a new server from point-in-time backup → verify → repoint the app → post-incident review. (Practice this before you need it.)

### 15.6 If you need to take the service down safely
Maintenance mode flag, status message in-app, and a communication plan for users.

---

## 16. Launch readiness checklist

**Security**
- [ ] Authorization matrix tests pass; manual two-account test done
- [ ] Argon2, token rotation + reuse detection, rate limits live
- [ ] Storage private; signed URLs ≤ 15 min; upload validation + quotas working
- [ ] No secrets in git/images/logs; secrets rotated from any dev values
- [ ] DB private or tightly firewalled; app uses a non-admin DB user
- [ ] HTTPS/HSTS; `/docs` disabled in prod; debug off
- [ ] Dependency, secret, and container scans clean (or exceptions documented)
- [ ] ZAP scan on staging reviewed

**Privacy and trust**
- [ ] Privacy Policy, Terms, in-app account deletion, data export
- [ ] Store data-safety/privacy forms accurate
- [ ] Block/report features; moderation process; security contact

**Operations**
- [ ] Staging + prod separated; CI/CD with manual prod approval; rollback tested
- [ ] Backups configured and **restore tested**
- [ ] Logs, errors, metrics, alerts working (trigger one on purpose)
- [ ] Budget alerts and quotas set
- [ ] Runbook written (Section 15)
- [ ] Staged rollout plan and a way to force-upgrade old app versions

**Product quality**
- [ ] Upload tested on weak networks and airplane-mode interruptions
- [ ] Originals verified byte-identical after download (`sha256sum`)
- [ ] Load test of a 500-photo batch and a busy Space

---

## 17. Suggested roadmap

| Phase | Focus | Key items |
|---|---|---|
| **A. Foundations (before any real photos)** | P0 only | Authorization + tests, Argon2, token rotation, private storage + signed URLs, upload validation, rate limits, HTTPS, secrets management, backups, privacy policy |
| **B. Beta with friends** | P0 + early P1 | Email verification, 2FA, audit logs, Sentry, staging, CI security scans, account deletion/export, block/report |
| **C. Public launch** | All P1 | Malware scanning, WAF, private networking, staged rollouts, store disclosures, ZAP + OWASP review, runbook rehearsed |
| **D. Growth** | P2 | Passkeys, bug bounty, advanced abuse detection, optional E2EE vault, cross-region DR |

---

## 18. Prompt to have your AI coding assistant audit and fix the code

```
You are a senior application security engineer and backend/mobile reviewer.
Read docs/4to-app-spec.md and docs/4to-security-and-production-checklist.md.

TASK: Audit this repository against the checklist (P0 first, then P1) and fix what you find.

1. Produce a gap report: for each checklist item mark PASS / FAIL / PARTIAL / N/A with file paths and line references as evidence. Do not guess; if you cannot verify an item from the code, say so.
2. Prioritize findings by risk: authorization flaws (any endpoint that reads/writes by ID without scoping to the caller or Space membership), secrets in code or history, upload validation, token handling, rate limiting, and logging of sensitive data.
3. For every FAIL in P0: propose a fix, implement it in a small commit, and add an automated test that fails before the fix and passes after. Implement the authorization test matrix from Section 4.3 completely.
4. Centralize permission checks in one module and refactor routers to use it.
5. Add the CI security workflow from Section 13 (adapt paths) and make it pass.
6. Do not weaken existing behavior, do not add dependencies without explaining why, and never print or commit secrets.
7. End with: a summary of what changed, remaining risks, and a prioritized list of P1 items still open.

Work in steps, report after each step, and wait for my confirmation before large refactors.
```

---

## 19. Learning resources (search these names)

- **OWASP API Security Top 10** and **OWASP ASVS / MASVS**
- **OWASP Cheat Sheet Series** (Authentication, Session Management, File Upload, JWT, Password Storage)
- **Microsoft Learn: Azure security best practices**, **Azure Well-Architected Framework (Security pillar)**
- **PortSwigger Web Security Academy** (free, hands-on labs; excellent for IDOR/BOLA and auth bugs)
- **Have I Been Pwned (Pwned Passwords API)**
- **NIST SP 800-63B** (digital identity/password guidelines)
- Certifications for later: **Security+**, **AZ-500**, **AZ-400**

---

## Appendix — quick "never do this" list

1. Never trust IDs, roles, or prices sent by the app.
2. Never store passwords in plain text or with fast hashes.
3. Never commit secrets or put them in the mobile app.
4. Never make storage public "just for testing."
5. Never log tokens, signed URLs, or personal data.
6. Never run production with debug mode or open `/docs`.
7. Never copy real user data to dev or staging.
8. Never skip backups, or trust one you haven't restored.
9. Never claim privacy features in your policy that the code doesn't actually enforce.
10. Never ship a security-sensitive change without a test that proves it works.
