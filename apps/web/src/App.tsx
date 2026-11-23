import { useEffect, useState, useMemo } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'
import { copy as t } from './i18n'
import { notices, people, photos, spaces, type Person, type Space } from './data'
import { api } from './api'

type View = 'spaces' | 'tree' | 'feed' | 'friends' | 'profile' | 'notifications' | 'space'

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? 'logo compact' : 'logo'} aria-label={t.brand}><span>.</span><b>4</b><span>to</span></div>
}

function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  return <img className="avatar" style={{ width: size, height: size }} src={person.avatar} alt="" />
}

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [token, setToken] = useState('')
  const [view, setView] = useState<View>('spaces')
  const [selectedSpace, setSelectedSpace] = useState<Space>(spaces[0])
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [spaceItems, setSpaceItems] = useState<Space[]>(() => {
    try {
      const saved = window.localStorage.getItem('4to-spaces')
      return saved ? JSON.parse(saved) as Space[] : spaces
    } catch {
      return spaces
    }
  })
  const [userProfile, setUserProfile] = useState<{
    name: string
    username: string
    email: string
    bio: string
  }>(() => {
    try {
      const saved = window.localStorage.getItem('4to-user-profile')
      return saved ? JSON.parse(saved) : {
        name: 'Alex Morgan',
        username: 'alex',
        email: 'alex@example.com',
        bio: 'Explorer, photographer & archivist of uncompressed memories.',
      }
    } catch {
      return {
        name: 'Alex Morgan',
        username: 'alex',
        email: 'alex@example.com',
        bio: 'Explorer, photographer & archivist of uncompressed memories.',
      }
    }
  })

  useEffect(() => {
    window.localStorage.setItem('4to-user-profile', JSON.stringify(userProfile))
  }, [userProfile])

  useEffect(() => {
    const savedToken = window.localStorage.getItem('4to-access-token')
    if (savedToken) setToken(savedToken)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('4to-spaces', JSON.stringify(spaceItems))
  }, [spaceItems])

  useEffect(() => {
    setLoading(true)
    const timer = window.setTimeout(() => setLoading(false), 280)
    return () => window.clearTimeout(timer)
  }, [view, authenticated])

  const [returnView, setReturnView] = useState<View>('spaces')

  function navigate(next: View) {
    setView(next)
  }

  function openSpace(space: Space, from: View = 'spaces') {
    setSelectedSpace(space)
    setReturnView(from)
    setView('space')
  }

  function handleSignOut() {
    window.localStorage.removeItem('4to-access-token')
    setToken('')
    setAuthenticated(false)
    setView('spaces')
  }

  if (!authenticated) return <AuthScreen onLogin={(nextToken) => { setToken(nextToken ?? ''); setAuthenticated(true) }} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-button" onClick={() => navigate('spaces')} aria-label={t.spaces}><Logo /></button>
        <nav className="nav-list" aria-label="Primary">
          <NavButton icon="▦" label={t.spaces} active={view === 'spaces' || (view === 'space' && returnView === 'spaces')} onClick={() => navigate('spaces')} />
          <NavButton icon="⌁" label={t.tree} active={view === 'tree' || (view === 'space' && returnView === 'tree')} onClick={() => navigate('tree')} />
          <NavButton icon="◇" label={t.feed} active={view === 'feed'} onClick={() => navigate('feed')} />
          <NavButton icon="◎" label={t.friends} active={view === 'friends'} onClick={() => navigate('friends')} />
          <NavButton icon="○" label={t.profile} active={view === 'profile'} onClick={() => navigate('profile')} />
        </nav>
        <button className="notification-button" onClick={() => navigate('notifications')} aria-label={t.notifications}>♧<span>2</span></button>
        <Avatar person={{ ...people[0], name: userProfile.name, username: userProfile.username, avatar: 'https://i.pravatar.cc/160?img=5' }} />
      </aside>

      <main className="main">
        <header className="topbar">
          <Logo compact />
          <div className="top-actions">
            <button className="icon-button" onClick={() => navigate('notifications')} aria-label={t.notifications}>♧<i /></button>
            <button className="avatar-button" onClick={() => navigate('profile')} aria-label={t.profile}><Avatar person={{ ...people[0], name: userProfile.name, username: userProfile.username, avatar: 'https://i.pravatar.cc/160?img=5' }} size={36} /></button>
          </div>
        </header>
        {loading ? <Loading /> : (
          <>
            {view === 'spaces' && <SpacesScreen spaces={spaceItems} onOpen={(s) => openSpace(s, 'spaces')} onCreate={() => setCreateOpen(true)} />}
            {view === 'space' && <SpaceScreen space={selectedSpace} onBack={() => navigate(returnView)} onUpdate={setSelectedSpace} />}
            {view === 'tree' && <TreeScreen spaces={spaceItems} onOpenSpace={(s) => openSpace(s, 'tree')} />}
            {view === 'feed' && <FeedScreen />}
            {view === 'friends' && <FriendsScreen />}
            {view === 'profile' && (
              <ProfileScreen
                user={userProfile}
                onUpdateUser={setUserProfile}
                onNavigate={navigate}
                onSignOut={handleSignOut}
              />
            )}
            {view === 'notifications' && <NotificationsScreen />}
          </>
        )}
      </main>
      {createOpen && <CreateSpaceModal token={token} onClose={() => setCreateOpen(false)} onCreate={(space) => { setSpaceItems(current => [...current, space]); setSelectedSpace(space); setReturnView('spaces'); setCreateOpen(false); setView('space') }} />}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavButton icon="▦" label={t.spaces} active={view === 'spaces' || (view === 'space' && returnView === 'spaces')} onClick={() => navigate('spaces')} />
        <NavButton icon="⌁" label={t.tree} active={view === 'tree' || (view === 'space' && returnView === 'tree')} onClick={() => navigate('tree')} />
        <NavButton icon="◇" label={t.feed} active={view === 'feed'} onClick={() => navigate('feed')} />
        <NavButton icon="◎" label={t.friends} active={view === 'friends'} onClick={() => navigate('friends')} />
        <NavButton icon="○" label={t.profile} active={view === 'profile'} onClick={() => navigate('profile')} />
      </nav>
    </div>
  )
}

function NavButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? 'nav-button active' : 'nav-button'} onClick={onClick}><span>{icon}</span><b>{label}</b></button>
}

function Loading() {
  return <div className="loading-state"><div className="spinner" /><span>{t.loading}</span></div>
}

function AuthScreen({ onLogin }: { onLogin: (token?: string) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')
  const [error, setError] = useState('')
  const [pendingToken, setPendingToken] = useState<string | undefined>(undefined)

  const is2FAEnabled = () => {
    return window.localStorage.getItem('4to-2fa-enabled') === 'true'
  }

  async function demoLogin() {
    setError('')
    try {
      const result = await api<{ access_token: string }>('/v1/auth/login', { method: 'POST', body: { email: 'demo@4to.app', password: 'DemoPassword123' } })
      if (is2FAEnabled()) {
        setPendingToken(result.access_token)
        setStep('2fa')
        return
      }
      window.localStorage.setItem('4to-access-token', result.access_token)
      onLogin(result.access_token)
    } catch {
      if (is2FAEnabled()) {
        setPendingToken(undefined)
        setStep('2fa')
        return
      }
      onLogin()
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const result = mode === 'signup'
        ? await api<{ access_token: string }>('/v1/auth/register', { method: 'POST', body: { email, password, username: displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_'), display_name: displayName } })
        : await api<{ access_token: string }>('/v1/auth/login', { method: 'POST', body: { email, password } })
      
      if (mode === 'login' && is2FAEnabled()) {
        setPendingToken(result.access_token)
        setStep('2fa')
        return
      }

      window.localStorage.setItem('4to-access-token', result.access_token)
      onLogin(result.access_token)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Login failed')
    }
  }

  function verify2FA(event: FormEvent) {
    event.preventDefault()
    setError('')
    const code = useBackupCode ? backupCode.trim() : totpCode.trim()

    if (!code) {
      setError('Please enter a verification code')
      return
    }

    if (!useBackupCode && code.length !== 6) {
      setError('Authenticator code must be 6 digits')
      return
    }

    // Verified successfully
    if (pendingToken) {
      window.localStorage.setItem('4to-access-token', pendingToken)
      onLogin(pendingToken)
    } else {
      onLogin()
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-mark"><Logo /><p>{t.tagline}</p></div>
      {step === 'credentials' ? (
        <main className="auth-card">
          <div className="auth-switch">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>{t.login}</button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>{t.signup}</button>
          </div>
          <form onSubmit={submit}>
            {mode === 'signup' && <label><span>Display name</span><input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Alex Morgan" required /></label>}
            <label><span>{t.email}</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="alex@example.com" required /></label>
            <label><span>{t.password}</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" required /></label>
            {mode === 'login' && <button type="button" className="text-button">{t.forgot}</button>}
            <button className="primary-button" type="submit">{mode === 'login' ? t.login : t.signup}</button>
            {error && <p className="auth-error">{error}</p>}
          </form>
          <div className="divider"><span>or</span></div>
          <button className="secondary-button" type="button" onClick={demoLogin}>{t.continueDemo}</button>
        </main>
      ) : (
        <main className="auth-card">
          <div className="pt-auth-2fa-shield">🔐</div>
          <h2 style={{ textAlign: 'center', margin: '0 0 6px', fontSize: 22 }}>Two-Factor Verification</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, margin: '0 0 18px', lineHeight: 1.4 }}>
            {useBackupCode
              ? 'Enter one of your 8-character emergency backup recovery codes.'
              : 'Enter the 6-digit verification code from your authenticator app.'}
          </p>

          <form onSubmit={verify2FA}>
            {useBackupCode ? (
              <label>
                <span>Backup Recovery Code</span>
                <input
                  value={backupCode}
                  onChange={e => setBackupCode(e.target.value)}
                  placeholder="e.g. 8f2a-9c01"
                  required
                  autoFocus
                />
              </label>
            ) : (
              <label>
                <span>6-Digit Security Code</span>
                <input
                  className="pt-2fa-input"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  autoFocus
                />
              </label>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px' }}>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode)
                  setError('')
                }}
              >
                {useBackupCode ? 'Use Authenticator Code' : 'Use a backup code'}
              </button>
              <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Demo: any 6 digits</small>
            </div>

            <button className="primary-button" type="submit">Verify & Sign In</button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setStep('credentials')
                setError('')
              }}
            >
              Back to Password
            </button>
            {error && <p className="auth-error">{error}</p>}
          </form>
        </main>
      )}
    </div>
  )
}

function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="page-header"><h1>{title}</h1>{action}</div>
}

function SpacesScreen({ spaces: spaceItems, onOpen, onCreate }: { spaces: Space[]; onOpen: (space: Space) => void; onCreate: () => void }) {
  return (
    <section className="page">
      <PageHeader title={t.spaces} action={<button className="primary-button small" onClick={onCreate}>＋ <span>{t.newSpace}</span></button>} />
      <div className="space-grid">
        {spaceItems.map(space => (
          <button className="space-card" key={space.id} onClick={() => onOpen(space)}>
            <div className="cover" style={{ backgroundImage: `url("${space.cover}")` }}>
              {space.unread && <span className="unread">{space.unread}</span>}
              <div className="cover-fade" />
            </div>
            <div className="space-card-body">
              <div><h2>{space.name}</h2><p>{space.dates}</p></div>
              <div className="avatars">
                {people.slice(0, 4).map(person => <Avatar key={person.id} person={person} size={28} />)}
              </div>
              <p className="progress-copy">{space.progress} of {space.total} members have added photos</p>
              <div className="progress"><span style={{ width: `${space.progress / space.total * 100}%` }} /></div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function CreateSpaceModal({ token, onClose, onCreate }: { token: string; onClose: () => void; onCreate: (space: Space) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const start = new Date().toISOString().slice(0, 10)
      const created = token
        ? await api<{ id: string; name: string; description: string | null; start_date: string; end_date: string; invite_code: string; handle: string }>('/v1/spaces', { method: 'POST', token, body: { name: name.trim(), description: description.trim() || null, start_date: start, end_date: start } })
        : null
      onCreate({
        id: created?.id ?? `space-${Date.now()}`,
        name: created?.name ?? name.trim(),
        handle: created?.handle,
        inviteCode: created?.invite_code,
        branchName: created?.name ?? name.trim(),
        description: created?.description ?? (description.trim() || 'A new shared photo album.'),
        dates: 'Dates to be confirmed',
        cover: spaces[0].cover,
        progress: 0,
        total: 1,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create Photo Space')
    }
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
        <div className="modal-header"><div><p>New album</p><h2>{t.createSpace}</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
        <form onSubmit={submit}>
          <label><span>{t.name}</span><input value={name} onChange={event => setName(event.target.value)} placeholder="Coast Weekend" required /></label>
          <label><span>{t.description}</span><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="A few words for the group" /></label>
          <div className="form-row"><label><span>{t.startDate}</span><input type="date" /></label><label><span>{t.endDate}</span><input type="date" /></label></div>
          <fieldset><legend>{t.inviteFriends}</legend><div className="member-picker">{people.map(person => <label key={person.id}><input type="checkbox" /><Avatar person={person} size={32} /><span>{person.name}</span></label>)}</div></fieldset>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>{t.cancel}</button><button type="submit" className="primary-button">{t.createSpace}</button></div>
          {error && <p className="auth-error">{error}</p>}
        </form>
      </section>
    </div>
  )
}

function SpaceScreen({ space, onBack, onUpdate }: { space: Space; onBack: () => void; onUpdate: (space: Space) => void }) {
  const [tab, setTab] = useState<'photos' | 'members' | 'chat'>('photos')
  const [viewer, setViewer] = useState<string | null>(null)
  const [chat, setChat] = useState(['Maya: This sunset was unreal.', 'Theo: Uploading mine after lunch!'])
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  async function shareSpace() {
    const text = `Join my .4to Photo Space "${space.name}" with code ${space.inviteCode ?? 'COAST26'}: ${window.location.origin}/join/${space.inviteCode ?? 'COAST26'}`
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800) } catch { setCopied(false) }
  }
  function send(event: FormEvent) { event.preventDefault(); if (message.trim()) { setChat(current => [...current, `You: ${message.trim()}`]); setMessage('') } }
  return (
    <section className="space-detail">
      <div className="detail-cover" style={{ backgroundImage: `url("${space.cover}")` }}>
        <button className="back-button" onClick={onBack}>←</button>
        <div className="detail-gradient" />
        <div className="detail-heading"><p>{space.dates}</p><h1>{space.name}</h1><p>@{space.handle ?? 'space'} · {space.description}</p></div>
        <button className="space-settings" onClick={() => setSettingsOpen(true)} aria-label="Space settings">⚙</button>
      </div>
      <div className="detail-toolbar">
        <div className="tabs">
          <button className={tab === 'photos' ? 'active' : ''} onClick={() => setTab('photos')}>{t.photos}</button>
          <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>{t.members}</button>
          <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>{t.chat}<span className="tab-badge">3</span></button>
        </div>
        {tab === 'photos' && <div className="toolbar-actions"><button className="secondary-button small" onClick={shareSpace}>{copied ? 'Copied join link' : 'Invite friends'}</button><button className="secondary-button small">{t.downloadAll}</button><button className="primary-button small">＋ {t.addPhotos}</button></div>}
      </div>
      {tab === 'photos' && <><div className="contribution"><span>{space.progress} of {space.total} members have added photos</span><div className="progress"><span style={{ width: `${space.progress / space.total * 100}%` }} /></div></div><PhotoGrid onView={setViewer} /></>}
      {tab === 'members' && <div className="people-list">{people.map(person => <div className="person-row" key={person.id}><Avatar person={person} /><div><b>{person.name}</b><p>@{person.username}</p></div><span>{person.role}</span><button className="text-button">{t.remind}</button></div>)}</div>}
      {tab === 'chat' && <div className="chat-panel"><div className="messages">{chat.map((message, index) => <div className={message.startsWith('You') ? 'message own' : 'message'} key={index}>{message}</div>)}</div><form className="chat-compose" onSubmit={send}><input value={message} onChange={event => setMessage(event.target.value)} placeholder={t.chatPlaceholder} /><button className="primary-button small" type="submit">{t.send}</button></form></div>}
      {viewer && <div className="viewer" onClick={() => setViewer(null)}><button className="viewer-close">×</button><img src={viewer} alt="" onClick={event => event.stopPropagation()} /></div>}
      {settingsOpen && <SpaceSettings space={space} onClose={() => setSettingsOpen(false)} onSave={updated => { onUpdate(updated); setSettingsOpen(false) }} />}
    </section>
  )
}

function SpaceSettings({ space, onClose, onSave }: { space: Space; onClose: () => void; onSave: (space: Space) => void }) {
  const [name, setName] = useState(space.name)
  const [handle, setHandle] = useState(space.handle ?? '')
  const [description, setDescription] = useState(space.description)
  const [coverPhotoId, setCoverPhotoId] = useState(space.coverPhotoId ?? photos[0]?.id)
  const [copied, setCopied] = useState(false)
  async function copySpaceLink() {
    const link = `${window.location.origin}/join/${space.inviteCode ?? ''}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={event => event.stopPropagation()}><div className="modal-header"><div><p>PHOTO SPACE</p><h2>Space settings</h2></div><button className="icon-button" onClick={onClose}>×</button></div><form onSubmit={event => { event.preventDefault(); const cover = photos.find(photo => photo.id === coverPhotoId); onSave({ ...space, name, handle, description, coverPhotoId, cover: cover?.src ?? space.cover }) }}><label><span>Name</span><input value={name} onChange={event => setName(event.target.value)} /></label><label><span>.4to Space handle</span><div className="handle-control"><input value={handle} onChange={event => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} /><button type="button" className="secondary-button small" onClick={copySpaceLink}>{copied ? 'Copied' : 'Copy link'}</button></div><small className="field-hint">Share as @{handle || 'your_space'}</small></label><label><span>Description</span><textarea value={description} onChange={event => setDescription(event.target.value)} /></label><fieldset><legend>Preview image from this Space</legend><div className="preview-picker">{photos.map(photo => <button type="button" key={photo.id} className={photo.id === coverPhotoId ? 'preview-option selected' : 'preview-option'} onClick={() => setCoverPhotoId(photo.id)}><img src={photo.src} alt={`Use photo by ${photo.by}`} /><span>{photo.by} · {photo.takenAt}</span></button>)}</div></fieldset><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Save settings</button></div></form></section></div>
}

function PhotoGrid({ onView }: { onView: (src: string) => void }) {
  return <div className="photo-grid">{photos.map(photo => <button key={photo.id} onClick={() => onView(photo.src)}><img src={photo.src} alt="" /><span>{photo.by} · {photo.takenAt}</span></button>)}</div>
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusLabel(progress: number, total: number, unread?: number) {
  if (unread) return 'NEW PHOTOS'
  if (progress < total) return 'ACTIVE'
  return 'ALL IN'
}

function statusClass(progress: number, total: number, unread?: number) {
  if (unread) return 'badge-unread'
  if (progress < total) return 'badge-active'
  return 'badge-done'
}

// ── Evolution TreeScreen ──────────────────────────────────────────────────────
// Architecture:
// 1. Origin point at bottom: The User's Vault / Root Seed
// 2. Main Root Branch (central spine) ascending through time
// 3. EACH Space is derived directly as its OWN branch from the central root branch
// 4. When user creates a new PhotoSpace, a brand new branch sprouts at the top
// 5. Clean, organized, readable layout inspired by biological evolution cladograms
function TreeScreen({
  spaces: spaceItems,
  onOpenSpace,
}: {
  spaces: Space[]
  onOpenSpace: (space: Space) => void
}) {
  const [mode, setMode] = useState<'tree' | 'list'>('tree')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'complete'>('all')

  const totalPhotos = useMemo(() => {
    return spaceItems.reduce((acc, s, idx) => acc + (s.progress * 14 + 18 + (idx % 3) * 7), 0)
  }, [spaceItems])

  const pendingContributions = useMemo(() => {
    return spaceItems.filter(s => s.progress < s.total).length
  }, [spaceItems])

  const filteredSpaces: Space[] = useMemo(() => {
    return spaceItems.filter(space => {
      const q = search.trim().toLowerCase()
      const matchesSearch = !q ||
        space.name.toLowerCase().includes(q) ||
        (space.handle && space.handle.toLowerCase().includes(q)) ||
        space.dates.toLowerCase().includes(q) ||
        space.description.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (filter === 'active') return space.progress < space.total
      if (filter === 'complete') return space.progress >= space.total
      return true
    })
  }, [spaceItems, search, filter])

  // Tree Dimensions
  // Central trunk along x = 480
  const cx = 480
  const branchSpacing = 160
  const n = filteredSpaces.length
  const treeH = Math.max(680, 220 + n * branchSpacing)
  const originY = treeH - 75
  const uppermostBranchY = n > 0 ? originY - 140 - (n - 1) * branchSpacing : originY - 140
  const trunkTopY = Math.max(50, uppermostBranchY - 40)

  return (
    <section className="pt-page">
      {/* ── Header ── */}
      <div className="pt-header">
        <div className="pt-header-left">
          <div className="pt-badge-kicker">EVOLUTION TREE · PHOTO VAULT</div>
          <h1 className="pt-title">Photo Tree</h1>
          <p className="pt-subtitle">
            One root trunk. Each PhotoSpace is its own branch derived from your vault.
          </p>
        </div>
        <div className="pt-header-actions">
          <div className="pt-view-toggle">
            <button
              className={mode === 'tree' ? 'active' : ''}
              onClick={() => setMode('tree')}
              title="Evolution Tree graphical view"
            >
              🌿 Tree
            </button>
            <button
              className={mode === 'list' ? 'active' : ''}
              onClick={() => setMode('list')}
              title="Organized lineage list"
            >
              ≡ List
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="pt-stats-bar">
        <div className="pt-stat">
          <span className="pt-stat-num">{spaceItems.length}</span>
          <span className="pt-stat-label">Space Branches</span>
        </div>
        <div className="pt-stat-divider" />
        <div className="pt-stat">
          <span className="pt-stat-num">{totalPhotos.toLocaleString()}</span>
          <span className="pt-stat-label">Full Quality Photos</span>
        </div>
        <div className="pt-stat-divider" />
        <div className="pt-stat">
          <span className="pt-stat-num">{spaceItems.length - pendingContributions}</span>
          <span className="pt-stat-label">All In</span>
        </div>
        {pendingContributions > 0 && (
          <>
            <div className="pt-stat-divider" />
            <div className="pt-stat pt-stat-pending">
              <span className="pt-stat-num">{pendingContributions}</span>
              <span className="pt-stat-label">Needs Photos ⚡</span>
            </div>
          </>
        )}
        <div className="pt-storage">
          <div className="pt-storage-bar">
            <div className="pt-storage-fill" style={{ width: '36%' }} />
          </div>
          <span className="pt-storage-label">1.8 / 5 GB Vault</span>
        </div>
      </div>

      {/* ── Search and Filter Controls ── */}
      <div className="pt-controls-row">
        <div className="pt-search-row">
          <span className="pt-search-icon">⌕</span>
          <input
            className="pt-search-input"
            placeholder="Search your PhotoSpaces (name, date, @handle)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="pt-search-clear" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>
        <div className="pt-filter-pills">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({spaceItems.length})
          </button>
          <button
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            Active ({pendingContributions})
          </button>
          <button
            className={filter === 'complete' ? 'active' : ''}
            onClick={() => setFilter('complete')}
          >
            Completed ({spaceItems.length - pendingContributions})
          </button>
        </div>
      </div>

      {/* ── Visual View (Tree or List) ── */}
      {mode === 'list' ? (
        /* ── Cladogram Lineage List ── */
        <div className="pt-cladogram-list">
          <div className="pt-cladogram-spine" />
          {filteredSpaces.map((space, idx) => {
            const photosCount = space.progress * 14 + 18 + (idx % 3) * 7
            return (
              <div key={space.id} className="pt-cladogram-item">
                <div className="pt-cladogram-node">
                  <span>#{idx + 1}</span>
                </div>
                <div
                  className="pt-cladogram-card"
                  onClick={() => onOpenSpace(space)}
                >
                  <div
                    className="pt-cladogram-thumb"
                    style={{ backgroundImage: `url("${space.cover}")` }}
                  >
                    {space.unread && <span className="pt-leaf-unread">{space.unread}</span>}
                  </div>
                  <div className="pt-cladogram-info">
                    <div className="pt-cladogram-top">
                      <span className="pt-branch-id">BRANCH #{idx + 1}</span>
                      <span className={`pt-badge ${statusClass(space.progress, space.total, space.unread)}`}>
                        {statusLabel(space.progress, space.total, space.unread)}
                      </span>
                    </div>
                    <h3>{space.name}</h3>
                    <p className="pt-cladogram-meta">
                      {space.dates} · @{space.handle || 'space'} · {photosCount} photos
                    </p>
                    <p className="pt-cladogram-desc">{space.description}</p>
                    <div className="pt-cladogram-progress">
                      <div className="pt-card-prog-bar">
                        <span style={{ width: `${(space.progress / space.total) * 100}%` }} />
                      </div>
                      <small>
                        {space.progress} of {space.total} members contributed
                      </small>
                    </div>
                  </div>
                  <button className="pt-open-pill">Open Space ›</button>
                </div>
              </div>
            )
          })}
          {filteredSpaces.length === 0 && (
            <div className="pt-empty-filter">
              <p>No PhotoSpace branches found matching "{search}"</p>
              <button className="secondary-button small" onClick={() => setSearch('')}>
                Clear Filter
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Evolution Tree Canvas ── */
        <div className="pt-tree-scroll">
          <div className="pt-evolution-canvas" style={{ height: treeH, width: 960 }}>
            {/* SVG Tree Backbone (Trunk & Branch Curves) */}
            <svg
              className="pt-evolution-svg"
              viewBox={`0 0 960 ${treeH}`}
              width="960"
              height={treeH}
              aria-hidden="true"
            >
              <defs>
                {/* Glowing Trunk Gradient */}
                <linearGradient id="ptTrunkGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#A6FF00" stopOpacity="1" />
                  <stop offset="60%" stopColor="#82cc00" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#4c7700" stopOpacity="0.75" />
                </linearGradient>

                {/* Branch Curve Glow */}
                <filter id="ptBranchGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* ── Root Fibers (Spreading beneath the origin) ── */}
              <g className="pt-root-fibers" stroke="#A6FF00" strokeOpacity="0.35" strokeWidth="2.5" fill="none">
                <path d={`M ${cx} ${originY} C ${cx - 40} ${originY + 25}, ${cx - 90} ${originY + 45}, ${cx - 140} ${originY + 55}`} />
                <path d={`M ${cx} ${originY} C ${cx - 20} ${originY + 30}, ${cx - 45} ${originY + 50}, ${cx - 60} ${originY + 65}`} />
                <path d={`M ${cx} ${originY} C ${cx} ${originY + 35}, ${cx} ${originY + 55}, ${cx} ${originY + 70}`} />
                <path d={`M ${cx} ${originY} C ${cx + 20} ${originY + 30}, ${cx + 45} ${originY + 50}, ${cx + 60} ${originY + 65}`} />
                <path d={`M ${cx} ${originY} C ${cx + 40} ${originY + 25}, ${cx + 90} ${originY + 45}, ${cx + 140} ${originY + 55}`} />
              </g>

              {/* ── Main Root Trunk ── */}
              <line
                x1={cx}
                y1={originY}
                x2={cx}
                y2={trunkTopY}
                stroke="url(#ptTrunkGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                filter="url(#ptBranchGlow)"
              />

              {/* Center Trunk Light Spine */}
              <line
                x1={cx}
                y1={originY}
                x2={cx}
                y2={trunkTopY}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeOpacity="0.6"
                strokeLinecap="round"
              />

              {/* ── Apical Trunk Crown ── */}
              <circle
                cx={cx}
                cy={trunkTopY}
                r="8"
                fill="#0B0B0B"
                stroke="#A6FF00"
                strokeWidth="3"
                filter="url(#ptBranchGlow)"
              />
              <circle cx={cx} cy={trunkTopY} r="3.5" fill="#A6FF00" />

              {/* ── Individual PhotoSpace Branches ── */}
              {filteredSpaces.map((space, idx) => {
                const branchY = originY - 140 - idx * branchSpacing
                const side = idx % 2 === 0 ? 'left' : 'right'
                const isLeft = side === 'left'

                // Branch line coordinates from trunk (cx) out to the card edge
                const targetX = isLeft ? cx - 80 : cx + 80
                const c1x = isLeft ? cx - 35 : cx + 35
                const c2x = isLeft ? cx - 60 : cx + 60

                return (
                  <g key={`branch-path-${space.id}`} className="pt-branch-path-group">
                    {/* Derived branch stroke */}
                    <path
                      d={`M ${cx} ${branchY} C ${c1x} ${branchY}, ${c2x} ${branchY - 4}, ${targetX} ${branchY}`}
                      stroke="#A6FF00"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                      filter="url(#ptBranchGlow)"
                    />
                    {/* Branch socket leaf / terminal connector */}
                    <circle
                      cx={targetX}
                      cy={branchY}
                      r="5.5"
                      fill="#A6FF00"
                      stroke="#0B0B0B"
                      strokeWidth="2"
                    />

                    {/* Junction Node on Trunk */}
                    <circle
                      cx={cx}
                      cy={branchY}
                      r="10"
                      fill="#0B0B0B"
                      stroke="#A6FF00"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx={cx}
                      cy={branchY}
                      r="4"
                      fill="#FFFFFF"
                    />
                  </g>
                )
              })}

              {/* ── Origin Root Node at Bottom ── */}
              <circle
                cx={cx}
                cy={originY}
                r="16"
                fill="#0B0B0B"
                stroke="#A6FF00"
                strokeWidth="5"
                filter="url(#ptBranchGlow)"
              />
              <circle cx={cx} cy={originY} r="7" fill="#A6FF00" />
            </svg>

            {/* ── HTML Nodes Layer ── */}

            {/* Origin Node Label (Base) */}
            <div
              className="pt-evolution-origin"
              style={{ left: cx - 140, top: originY + 12 }}
            >
              <div className="pt-origin-pill">
                <span className="pt-origin-dot" />
                <b>ORIGIN POINT · ROOT SEED</b>
              </div>
              <p>@alex's Private Photo Vault</p>
              <small>Original Quality · Never Compressed</small>
            </div>

            {/* PhotoSpace Branch Cards */}
            {filteredSpaces.map((space, idx) => {
              const branchY = originY - 140 - idx * branchSpacing
              const side = idx % 2 === 0 ? 'left' : 'right'
              const isLeft = side === 'left'
              const photosCount = space.progress * 14 + 18 + (idx % 3) * 7

              // Card is 340px wide; left card sits from cx - 80 - 340 to cx - 80; right sits from cx + 80 to cx + 80 + 340
              const cardLeft = isLeft ? cx - 80 - 340 : cx + 80
              const cardTop = branchY - 55 // Vertically centered on branch connector

              return (
                <div
                  key={`branch-card-${space.id}`}
                  className={`pt-tree-branch-card-container ${isLeft ? 'branch-left' : 'branch-right'}`}
                  style={{ left: cardLeft, top: cardTop }}
                >
                  {/* Sequence tag on the junction */}
                  <div
                    className={`pt-trunk-milestone ${isLeft ? 'milestone-left' : 'milestone-right'}`}
                    style={{
                      left: isLeft ? 340 + 80 - 34 : -80 + 10,
                      top: 42,
                    }}
                  >
                    <span>#{idx + 1}</span>
                  </div>

                  {/* PhotoSpace Card */}
                  <button
                    className="pt-space-branch-card"
                    onClick={() => onOpenSpace(space)}
                    aria-label={`${space.name} branch`}
                  >
                    <div
                      className="pt-card-cover"
                      style={{ backgroundImage: `url("${space.cover}")` }}
                    >
                      {space.unread && <span className="pt-leaf-unread">{space.unread}</span>}
                    </div>

                    <div className="pt-card-details">
                      <div className="pt-card-header">
                        <span className="pt-branch-id">BRANCH #{idx + 1}</span>
                        <span
                          className={`pt-badge ${statusClass(space.progress, space.total, space.unread)}`}
                        >
                          {statusLabel(space.progress, space.total, space.unread)}
                        </span>
                      </div>

                      <h3 className="pt-card-name" title={space.name}>
                        {space.name}
                      </h3>

                      <p className="pt-card-dates">
                        {space.dates} · @{space.handle || 'space'}
                      </p>

                      <div className="pt-card-progress">
                        <div className="pt-card-prog-bar">
                          <span
                            style={{
                              width: `${(space.progress / space.total) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="pt-card-meta">
                          <span>
                            {space.progress}/{space.total} contributed
                          </span>
                          <span>{photosCount} photos</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function FeedScreen() {
  return <section className="page"><PageHeader title={t.feed} /><div className="empty-state"><div className="empty-icon">◇</div><h2>{t.emptyTitle}</h2><p>Personal posts will appear here in a future update.</p></div></section>
}

function FriendsScreen() {
  const [query, setQuery] = useState('')
  const [requests, setRequests] = useState(['u2'])
  const results = people.filter(person => `${person.name} ${person.username}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <section className="page friends-page">
      <PageHeader title={t.friends} />
      <div className="search-row"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.searchFriends} /></div>
      {requests.length > 0 && <div className="request-section"><h2>{t.memberRequests}</h2>{people.filter(person => requests.includes(person.id)).map(person => <div className="person-row" key={person.id}><Avatar person={person} /><div><b>{person.name}</b><p>@{person.username}</p></div><button className="primary-button small" onClick={() => setRequests(current => current.filter(id => id !== person.id))}>{t.accept}</button><button className="secondary-button small" onClick={() => setRequests(current => current.filter(id => id !== person.id))}>{t.decline}</button></div>)}</div>}
      <div className="friends-results"><h2>{query ? t.search : 'Your friends'}</h2>{results.length ? results.map(person => <div className="person-row" key={person.id}><Avatar person={person} /><div><b>{person.name}</b><p>@{person.username}</p></div><button className="secondary-button small">{t.sendRequest}</button></div>) : <div className="empty-inline">{t.emptyFriends}</div>}</div>
    </section>
  )
}

interface UserProfile {
  name: string
  username: string
  email: string
  bio: string
}

interface NotificationPreferences {
  spaceInvites: boolean
  photoUploads: boolean
  reminders: boolean
  chatMessages: boolean
  emailDigest: boolean
}

interface PrivacyPreferences {
  stripGps: boolean
  privateTree: boolean
  discoverable: boolean
  requireApproval: boolean
}

function ProfileScreen({
  user,
  onUpdateUser,
  onNavigate,
  onSignOut,
}: {
  user: UserProfile
  onUpdateUser: (updated: UserProfile) => void
  onNavigate: (view: View) => void
  onSignOut: () => void
}) {
  const [activeModal, setActiveModal] = useState<'none' | 'settings' | 'notifications' | 'privacy' | 'signout' | '2fa-setup'>('none')

  // Settings draft state
  const [draftName, setDraftName] = useState(user.name)
  const [draftUsername, setDraftUsername] = useState(user.username)
  const [draftEmail, setDraftEmail] = useState(user.email)
  const [draftBio, setDraftBio] = useState(user.bio)
  const [settingsNotice, setSettingsNotice] = useState('')

  // Two-Factor Authentication (2FA) State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(() => {
    return window.localStorage.getItem('4to-2fa-enabled') === 'true'
  })
  const [twoFactorStep, setTwoFactorStep] = useState<'qr' | 'verify' | 'backup'>('qr')
  const [totpSetupCode, setTotpSetupCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedBackup, setCopiedBackup] = useState(false)
  const backupCodes = ['8f2a-9c01', '4d7e-11b9', 'e3a5-78c2', '99b1-0f44', '2c88-51da', '7fe3-66d0']
  const secretKey = '4TO7-K8M9-X2PW-4N1Q'

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationPreferences>(() => {
    try {
      const saved = window.localStorage.getItem('4to-notification-prefs')
      return saved
        ? JSON.parse(saved)
        : {
            spaceInvites: true,
            photoUploads: true,
            reminders: true,
            chatMessages: true,
            emailDigest: false,
          }
    } catch {
      return {
        spaceInvites: true,
        photoUploads: true,
        reminders: true,
        chatMessages: true,
        emailDigest: false,
      }
    }
  })

  // Privacy State
  const [privacy, setPrivacy] = useState<PrivacyPreferences>(() => {
    try {
      const saved = window.localStorage.getItem('4to-privacy-prefs')
      return saved
        ? JSON.parse(saved)
        : {
            stripGps: true,
            privateTree: true,
            discoverable: true,
            requireApproval: false,
          }
    } catch {
      return {
        stripGps: true,
        privateTree: true,
        discoverable: true,
        requireApproval: false,
      }
    }
  })

  // Export State
  const [exporting, setExporting] = useState(false)
  const [exportFinished, setExportFinished] = useState(false)

  // Sync to local storage
  useEffect(() => {
    window.localStorage.setItem('4to-notification-prefs', JSON.stringify(notifications))
  }, [notifications])

  useEffect(() => {
    window.localStorage.setItem('4to-privacy-prefs', JSON.stringify(privacy))
  }, [privacy])

  const openSettings = () => {
    setDraftName(user.name)
    setDraftUsername(user.username)
    setDraftEmail(user.email)
    setDraftBio(user.bio)
    setSettingsNotice('')
    setActiveModal('settings')
  }

  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault()
    onUpdateUser({
      name: draftName.trim() || user.name,
      username: draftUsername.trim().replace(/^@/, '') || user.username,
      email: draftEmail.trim() || user.email,
      bio: draftBio.trim(),
    })
    setSettingsNotice('Profile changes saved successfully!')
    window.setTimeout(() => {
      setSettingsNotice('')
      setActiveModal('none')
    }, 1200)
  }

  const handleExportArchive = () => {
    setExporting(true)
    setExportFinished(false)
    window.setTimeout(() => {
      setExporting(false)
      setExportFinished(true)
    }, 1800)
  }

  return (
    <section className="page profile-page">
      <PageHeader title={t.profile} />

      {/* Main Profile Header Card */}
      <div className="profile-card">
        <div className="profile-avatar">
          <Avatar
            person={{
              ...people[0],
              name: user.name,
              username: user.username,
              avatar: 'https://i.pravatar.cc/160?img=5',
            }}
            size={88}
          />
        </div>
        <div className="profile-info-block">
          <h2>{user.name}</h2>
          <p>@{user.username} · {user.email}</p>
          {user.bio ? <p className="profile-bio">{user.bio}</p> : null}
        </div>
        <button className="secondary-button small edit-profile-btn" onClick={openSettings}>
          Edit
        </button>
      </div>

      {/* Storage Card */}
      <div className="storage-card">
        <div className="storage-header">
          <div>
            <b>{t.storage}</b>
            <span className="storage-tier-pill">Free Tier</span>
          </div>
          <span>1.8 GB of 5 GB used</span>
        </div>
        <div className="progress">
          <span style={{ width: '36%' }} />
        </div>
        <div className="storage-caption">
          <small>Original Quality · Zero Compression · 142 photos preserved</small>
        </div>
      </div>

      {/* Settings Navigation List */}
      <div className="settings-list">
        <button onClick={openSettings} className="settings-item">
          <div className="settings-btn-content">
            <span className="settings-icon">⚙</span>
            <div>
              <b>Settings</b>
              <p>Profile information, display name & storage tier</p>
            </div>
          </div>
          <b className="settings-chevron">›</b>
        </button>

        <button onClick={() => setActiveModal('notifications')} className="settings-item">
          <div className="settings-btn-content">
            <span className="settings-icon">🔔</span>
            <div>
              <b>Notifications</b>
              <p>Invites, photo updates & reminder alerts</p>
            </div>
          </div>
          <b className="settings-chevron">›</b>
        </button>

        <button onClick={() => setActiveModal('privacy')} className="settings-item">
          <div className="settings-btn-content">
            <span className="settings-icon">🛡</span>
            <div>
              <b>Privacy & Security</b>
              <p>EXIF GPS removal, tree vault visibility & archive export</p>
            </div>
          </div>
          <b className="settings-chevron">›</b>
        </button>

        <button onClick={() => setActiveModal('signout')} className="settings-item signout-item">
          <div className="settings-btn-content">
            <span className="settings-icon">⎋</span>
            <div>
              <b>{t.signOut}</b>
              <p>Log out of your 4to session on this device</p>
            </div>
          </div>
          <b className="settings-chevron">›</b>
        </button>
      </div>

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setActiveModal('none')}>
          <section className="modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p>Profile & Preferences</p>
                <h2>Account Settings</h2>
              </div>
              <button className="icon-button" onClick={() => setActiveModal('none')}>×</button>
            </div>

            {settingsNotice && (
              <div className="pt-success-banner">
                <span>✓</span> {settingsNotice}
              </div>
            )}

            <form onSubmit={handleSaveSettings}>
              <label>
                <span>Full Name</span>
                <input
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
              </label>

              <label>
                <span>Username</span>
                <input
                  value={draftUsername}
                  onChange={e => setDraftUsername(e.target.value)}
                  placeholder="username"
                  required
                />
              </label>

              <label>
                <span>Email Address</span>
                <input
                  type="email"
                  value={draftEmail}
                  onChange={e => setDraftEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label>
                <span>Bio</span>
                <textarea
                  value={draftBio}
                  onChange={e => setDraftBio(e.target.value)}
                  placeholder="A few words about you or your photography"
                  rows={3}
                />
              </label>

              <div className="pt-info-card">
                <div className="pt-info-card-header">
                  <b>Color Theme</b>
                  <span className="pt-info-card-badge">Active</span>
                </div>
                <p>Electric Lime (#A6FF00) on Deep Carbon (#0B0B0B)</p>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setActiveModal('none')}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Notifications Modal */}
      {activeModal === 'notifications' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setActiveModal('none')}>
          <section className="modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p>Alerts & Reminders</p>
                <h2>Notification Preferences</h2>
              </div>
              <button className="icon-button" onClick={() => setActiveModal('none')}>×</button>
            </div>

            <div className="pt-pref-list">
              <div className="pt-pref-row">
                <div className="pt-pref-info">
                  <div className="pt-pref-title">Space Invitations</div>
                  <div className="pt-pref-desc">Receive alerts when friends invite you to a Photo Space</div>
                </div>
                <label className="pt-switch">
                  <input
                    type="checkbox"
                    checked={notifications.spaceInvites}
                    onChange={e => setNotifications(prev => ({ ...prev, spaceInvites: e.target.checked }))}
                  />
                  <span className="pt-slider" />
                </label>
              </div>

              <div className="pt-pref-row">
                <div className="pt-pref-info">
                  <div className="pt-pref-title">New Photo Uploads</div>
                  <div className="pt-pref-desc">Notify when members contribute photos to shared spaces</div>
                </div>
                <label className="pt-switch">
                  <input
                    type="checkbox"
                    checked={notifications.photoUploads}
                    onChange={e => setNotifications(prev => ({ ...prev, photoUploads: e.target.checked }))}
                  />
                  <span className="pt-slider" />
                </label>
              </div>

              <div className="pt-pref-row">
                <div className="pt-pref-info">
                  <div className="pt-pref-title">Contribution Reminders</div>
                  <div className="pt-pref-desc">Gentle nudges before a photo-sharing round closes</div>
                </div>
                <label className="pt-switch">
                  <input
                    type="checkbox"
                    checked={notifications.reminders}
                    onChange={e => setNotifications(prev => ({ ...prev, reminders: e.target.checked }))}
                  />
                  <span className="pt-slider" />
                </label>
              </div>

              <div className="pt-pref-row">
                <div className="pt-pref-info">
                  <div className="pt-pref-title">Chat & Comments</div>
                  <div className="pt-pref-desc">Instant messages and comments left inside spaces</div>
                </div>
                <label className="pt-switch">
                  <input
                    type="checkbox"
                    checked={notifications.chatMessages}
                    onChange={e => setNotifications(prev => ({ ...prev, chatMessages: e.target.checked }))}
                  />
                  <span className="pt-slider" />
                </label>
              </div>

              <div className="pt-pref-row">
                <div className="pt-pref-info">
                  <div className="pt-pref-title">Email Digest</div>
                  <div className="pt-pref-desc">Weekly recap of memories and highlights from your albums</div>
                </div>
                <label className="pt-switch">
                  <input
                    type="checkbox"
                    checked={notifications.emailDigest}
                    onChange={e => setNotifications(prev => ({ ...prev, emailDigest: e.target.checked }))}
                  />
                  <span className="pt-slider" />
                </label>
              </div>
            </div>

            <div className="pt-info-card" style={{ marginTop: 18 }}>
              <div className="pt-info-card-header">
                <b>Unread Notifications</b>
                <span className="pt-info-card-badge">2 new</span>
              </div>
              <p>You have pending invites to Coast Weekend and Highland Trek.</p>
              <button
                type="button"
                className="secondary-button small"
                style={{ alignSelf: 'flex-start', marginTop: 8 }}
                onClick={() => {
                  setActiveModal('none')
                  onNavigate('notifications')
                }}
              >
                Open Notifications Feed →
              </button>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="primary-button" onClick={() => setActiveModal('none')}>
                Done
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Privacy Modal */}
      {activeModal === 'privacy' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setActiveModal('none')}>
          <section className="modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p>Data & Security</p>
                <h2>Privacy Settings</h2>
              </div>
              <button className="icon-button" onClick={() => setActiveModal('none')}>×</button>
            </div>

            <div className="pt-pref-list">
              <div className="pt-pref-row">
                <div className="pt-pref-info">
                  <div className="pt-pref-title">Remove EXIF GPS Location on Share</div>
                  <div className="pt-pref-desc">
                    Automatically strip latitude/longitude metadata when sharing links or downloads to preserve location privacy
                  </div>
                </div>
                <label className="pt-switch">
                  <input
                    type="checkbox"
                    checked={privacy.stripGps}
                    onChange={e => setPrivacy(prev => ({ ...prev, stripGps: e.target.checked }))}
                  />
                  <span className="pt-slider" />
                </label>
              </div>

              <div className="pt-pref-row">
                <div className="pt-pref-info">
                  <div className="pt-pref-title">Private Photo Tree Vault</div>
                  <div className="pt-pref-desc">
                    Evolutionary branches derived from the root trunk remain visible only to invited space members
                  </div>
                </div>
                <label className="pt-switch">
                  <input
                    type="checkbox"
                    checked={privacy.privateTree}
                    onChange={e => setPrivacy(prev => ({ ...prev, privateTree: e.target.checked }))}
                  />
                  <span className="pt-slider" />
                </label>
              </div>

              <div className="pt-pref-row">
                <div className="pt-pref-info">
                  <div className="pt-pref-title">Discoverability by Handle</div>
                  <div className="pt-pref-desc">
                    Allow people to discover your profile by searching @{user.username} or your email
                  </div>
                </div>
                <label className="pt-switch">
                  <input
                    type="checkbox"
                    checked={privacy.discoverable}
                    onChange={e => setPrivacy(prev => ({ ...prev, discoverable: e.target.checked }))}
                  />
                  <span className="pt-slider" />
                </label>
              </div>

              <div className="pt-pref-row">
                <div className="pt-pref-info">
                  <div className="pt-pref-title">Require Space Invite Approval</div>
                  <div className="pt-pref-desc">
                    Ask for confirmation before adding you as a member to another user's Photo Space
                  </div>
                </div>
                <label className="pt-switch">
                  <input
                    type="checkbox"
                    checked={privacy.requireApproval}
                    onChange={e => setPrivacy(prev => ({ ...prev, requireApproval: e.target.checked }))}
                  />
                  <span className="pt-slider" />
                </label>
              </div>
            </div>

            {/* Two-Factor Authentication (2FA) */}
            <div className="pt-2fa-card">
              <div className="pt-2fa-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🔐</span>
                  <div>
                    <b style={{ color: 'var(--text)', fontSize: 15 }}>Two-Factor Authentication (2FA)</b>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      TOTP protection with Google Authenticator, 1Password, or Authy
                    </p>
                  </div>
                </div>
                <span className={`pt-2fa-status-pill ${twoFactorEnabled ? 'active' : 'inactive'}`}>
                  {twoFactorEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {twoFactorEnabled
                  ? 'Your uncompressed photo vault and evolutionary tree branches require 6-digit TOTP authentication on every login.'
                  : 'Require a 6-digit verification code from your authenticator app in addition to your password to protect your original photos.'}
              </p>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {twoFactorEnabled ? (
                  <>
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() => {
                        setTwoFactorStep('backup')
                        setActiveModal('2fa-setup')
                      }}
                    >
                      View Backup Codes
                    </button>
                    <button
                      type="button"
                      className="secondary-button small danger"
                      onClick={() => {
                        if (window.confirm('Disable Two-Factor Authentication? Your vault will only be secured by password.')) {
                          setTwoFactorEnabled(false)
                          window.localStorage.setItem('4to-2fa-enabled', 'false')
                        }
                      }}
                    >
                      Disable 2FA
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="primary-button small"
                    onClick={() => {
                      setTwoFactorStep('qr')
                      setTotpSetupCode('')
                      setTotpError('')
                      setActiveModal('2fa-setup')
                    }}
                  >
                    Enable 2FA Protection
                  </button>
                )}
              </div>
            </div>

            {/* Archive Export */}
            <div className="pt-info-card" style={{ marginTop: 18 }}>
              <div className="pt-info-card-header">
                <b>Data Portability</b>
                <span className="pt-info-card-badge">Zero Lock-in</span>
              </div>
              <p>Export all 142 photos at original byte-for-byte resolution with timestamp JSON metadata.</p>
              {exportFinished ? (
                <div className="pt-success-banner" style={{ marginTop: 8 }}>
                  <span>✓</span> Archive ready: <b>4to-vault-export-{user.username}.zip</b> (1.8 GB)
                </div>
              ) : (
                <button
                  type="button"
                  className="secondary-button small"
                  disabled={exporting}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  onClick={handleExportArchive}
                >
                  {exporting ? 'Packing original photos archive...' : 'Export All Original Photos (.zip)'}
                </button>
              )}
            </div>

            {/* Danger Zone */}
            <div className="pt-danger-box" style={{ marginTop: 18 }}>
              <b>Account Deletion</b>
              <p>Permanently remove your account, tree branches, and stored uncompressed photos.</p>
              <button
                type="button"
                className="secondary-button small danger"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your 4to account? This action is irreversible.')) {
                    onSignOut()
                  }
                }}
              >
                Delete Account
              </button>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="primary-button" onClick={() => setActiveModal('none')}>
                Done
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 2FA Setup & Recovery Codes Modal */}
      {activeModal === '2fa-setup' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setActiveModal('privacy')}>
          <section className="modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p>Two-Factor Authentication</p>
                <h2>{twoFactorStep === 'backup' ? 'Emergency Backup Codes' : 'Configure Authenticator App'}</h2>
              </div>
              <button className="icon-button" onClick={() => setActiveModal('privacy')}>×</button>
            </div>

            {/* Step Indicator */}
            <div className="pt-steps-indicator">
              <div className={`pt-step-dot ${twoFactorStep === 'qr' ? 'active' : ''}`}>
                <span className="pt-step-num">1</span>
                <span>Connect App</span>
              </div>
              <div className={`pt-step-dot ${twoFactorStep === 'verify' ? 'active' : ''}`}>
                <span className="pt-step-num">2</span>
                <span>Verify Code</span>
              </div>
              <div className={`pt-step-dot ${twoFactorStep === 'backup' ? 'active' : ''}`}>
                <span className="pt-step-num">3</span>
                <span>Backup Codes</span>
              </div>
            </div>

            {twoFactorStep === 'qr' && (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.4 }}>
                  Scan this QR code with Google Authenticator, 1Password, or Authy, or copy the manual entry key below:
                </p>

                <div className="pt-qr-container">
                  <div className="pt-qr-svg-wrapper">
                    <svg width="150" height="150" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="160" height="160" fill="white" rx="10" />
                      <rect x="16" y="16" width="36" height="36" rx="4" fill="#0B0B0B" />
                      <rect x="22" y="22" width="24" height="24" fill="white" />
                      <rect x="28" y="28" width="12" height="12" rx="2" fill="#0B0B0B" />
                      <rect x="108" y="16" width="36" height="36" rx="4" fill="#0B0B0B" />
                      <rect x="114" y="22" width="24" height="24" fill="white" />
                      <rect x="120" y="28" width="12" height="12" rx="2" fill="#0B0B0B" />
                      <rect x="16" y="108" width="36" height="36" rx="4" fill="#0B0B0B" />
                      <rect x="22" y="114" width="24" height="24" fill="white" />
                      <rect x="28" y="120" width="12" height="12" rx="2" fill="#0B0B0B" />
                      <rect x="60" y="22" width="8" height="8" fill="#0B0B0B" />
                      <rect x="76" y="22" width="8" height="8" fill="#0B0B0B" />
                      <rect x="92" y="22" width="8" height="8" fill="#0B0B0B" />
                      <rect x="22" y="60" width="8" height="8" fill="#0B0B0B" />
                      <rect x="22" y="76" width="8" height="8" fill="#0B0B0B" />
                      <rect x="22" y="92" width="8" height="8" fill="#0B0B0B" />
                      <rect x="60" y="60" width="8" height="8" fill="#0B0B0B" />
                      <rect x="76" y="60" width="8" height="8" fill="#0B0B0B" />
                      <rect x="92" y="60" width="8" height="8" fill="#0B0B0B" />
                      <rect x="60" y="76" width="8" height="8" fill="#0B0B0B" />
                      <rect x="92" y="76" width="8" height="8" fill="#0B0B0B" />
                      <rect x="60" y="92" width="8" height="8" fill="#0B0B0B" />
                      <rect x="76" y="92" width="8" height="8" fill="#0B0B0B" />
                      <rect x="92" y="92" width="8" height="8" fill="#0B0B0B" />
                      <rect x="108" y="60" width="8" height="8" fill="#0B0B0B" />
                      <rect x="124" y="76" width="8" height="8" fill="#0B0B0B" />
                      <rect x="136" y="60" width="8" height="8" fill="#0B0B0B" />
                      <rect x="108" y="92" width="8" height="8" fill="#0B0B0B" />
                      <rect x="124" y="108" width="8" height="8" fill="#0B0B0B" />
                      <rect x="136" y="124" width="8" height="8" fill="#0B0B0B" />
                      <rect x="60" y="108" width="8" height="8" fill="#0B0B0B" />
                      <rect x="76" y="124" width="8" height="8" fill="#0B0B0B" />
                      <rect x="92" y="136" width="8" height="8" fill="#0B0B0B" />
                      <rect x="68" y="68" width="24" height="24" rx="6" fill="#0B0B0B" />
                      <rect x="70" y="70" width="20" height="20" rx="4" fill="#A6FF00" />
                      <path d="M76 80L79 83L85 77" stroke="#0B0B0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Account: 4to Vault (alex@example.com)</span>
                </div>

                <label style={{ margin: '10px 0 6px' }}>
                  <span>Manual Setup Key</span>
                </label>
                <div className="pt-secret-key-box">
                  <span>{secretKey}</span>
                  <button
                    type="button"
                    className="text-button"
                    style={{ margin: 0, padding: '2px 8px', fontSize: 12 }}
                    onClick={() => {
                      navigator.clipboard?.writeText(secretKey)
                      setCopiedKey(true)
                      setTimeout(() => setCopiedKey(false), 2000)
                    }}
                  >
                    {copiedKey ? '✓ Copied' : 'Copy Key'}
                  </button>
                </div>

                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <button type="button" className="secondary-button" onClick={() => setActiveModal('privacy')}>
                    Cancel
                  </button>
                  <button type="button" className="primary-button" onClick={() => setTwoFactorStep('verify')}>
                    Next: Enter Code →
                  </button>
                </div>
              </div>
            )}

            {twoFactorStep === 'verify' && (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.4 }}>
                  Enter the 6-digit code currently shown in your authenticator app to confirm setup:
                </p>

                <label>
                  <span>6-Digit Verification Code</span>
                  <input
                    className="pt-2fa-input"
                    value={totpSetupCode}
                    onChange={e => {
                      setTotpSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      setTotpError('')
                    }}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                  />
                </label>

                {totpError && <p className="auth-error" style={{ marginTop: 8 }}>{totpError}</p>}

                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <button type="button" className="secondary-button" onClick={() => setTwoFactorStep('qr')}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      if (totpSetupCode.trim().length !== 6) {
                        setTotpError('Please enter a valid 6-digit authenticator code')
                        return
                      }
                      setTwoFactorEnabled(true)
                      window.localStorage.setItem('4to-2fa-enabled', 'true')
                      setTwoFactorStep('backup')
                    }}
                  >
                    Activate 2FA
                  </button>
                </div>
              </div>
            )}

            {twoFactorStep === 'backup' && (
              <div>
                <div className="pt-success-banner">
                  <span>✓</span> Two-Factor Authentication is now active!
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.4 }}>
                  Save these single-use emergency backup recovery codes. If you ever lose access to your authenticator app, each code can be used once to unlock your account:
                </p>

                <div className="pt-backup-grid">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="pt-backup-code">{code}</div>
                  ))}
                </div>

                <button
                  type="button"
                  className="secondary-button small"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => {
                    navigator.clipboard?.writeText(backupCodes.join('\n'))
                    setCopiedBackup(true)
                    setTimeout(() => setCopiedBackup(false), 2000)
                  }}
                >
                  {copiedBackup ? '✓ Copied All 6 Codes to Clipboard' : 'Copy All Recovery Codes'}
                </button>

                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setActiveModal('privacy')
                    }}
                  >
                    Done & Saved
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {activeModal === 'signout' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setActiveModal('none')}>
          <section className="modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p>Account Session</p>
                <h2>Sign Out of 4to?</h2>
              </div>
              <button className="icon-button" onClick={() => setActiveModal('none')}>×</button>
            </div>

            <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Are you sure you want to sign out? Your photo tree, spaces, and original vault photos will be preserved and accessible whenever you sign back in.
            </p>

            <div className="modal-actions" style={{ marginTop: 24 }}>
              <button type="button" className="secondary-button" onClick={() => setActiveModal('none')}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ background: 'var(--danger)', color: '#FFFFFF', borderColor: 'var(--danger)' }}
                onClick={() => {
                  setActiveModal('none')
                  onSignOut()
                }}
              >
                Sign Out
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function NotificationsScreen() {
  const [items, setItems] = useState(notices)
  return (
    <section className="page"><PageHeader title={t.notifications} action={<button className="text-button" onClick={() => setItems(current => current.map(item => ({ ...item, unread: false })))}>{t.markAllRead}</button>} />
      <div className="notifications-list">{items.map(item => <button className={item.unread ? 'notice unread' : 'notice'} key={item.id}><span className="notice-dot" /><div><b>{item.title}</b><p>{item.detail}</p></div><time>{item.time}</time></button>)}</div>
    </section>
  )
}

export default App
