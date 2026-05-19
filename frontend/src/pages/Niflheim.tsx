import { useEffect, useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  KeyRound, Eye, EyeOff, Copy, Check, Plus, Pencil, Trash2,
  Link as LinkIcon, User, Lock, StickyNote, Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, type Credential } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { BlurFade } from '@/components/magicui/blur-fade'

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(`${label} copied`)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button
      onClick={copy}
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
      title={`Copy ${label.toLowerCase()}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ── Credential card ────────────────────────────────────────────────────────────

function CredentialCard({
  cred, index, onEdit, onDelete,
}: {
  cred: Credential
  index: number
  onEdit: (c: Credential) => void
  onDelete: (c: Credential) => void
}) {
  const [showPw, setShowPw] = useState(false)

  return (
    <BlurFade delay={index * 0.04} inView>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary border border-border">
              <KeyRound className="h-3.5 w-3.5 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">{cred.title}</p>
              {cred.url && (
                <a
                  href={cred.url.startsWith('http') ? cred.url : `https://${cred.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors truncate"
                >
                  <Globe className="h-3 w-3 shrink-0" />
                  <span className="truncate">{cred.url}</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(cred)}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(cred)}
              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Fields */}
        <div className="space-y-2">
          {cred.username && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{cred.username}</span>
              </div>
              <CopyButton value={cred.username} label="Username" />
            </div>
          )}
          {cred.password && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                <Lock className="h-3 w-3 shrink-0" />
                <span className="font-mono truncate">
                  {showPw ? cred.password : '••••••••'}
                </span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => setShowPw(v => !v)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title={showPw ? 'Hide' : 'Show'}
                >
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <CopyButton value={cred.password} label="Password" />
              </div>
            </div>
          )}
          {cred.notes && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <StickyNote className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-relaxed">{cred.notes}</span>
            </div>
          )}
        </div>
      </div>
    </BlurFade>
  )
}

// ── Credential form dialog ─────────────────────────────────────────────────────

type CredForm = {
  title: string
  username: string
  password: string
  url: string
  notes: string
}

const emptyForm: CredForm = { title: '', username: '', password: '', url: '', notes: '' }

function CredentialDialog({
  open, onClose, onSaved, editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: Credential | null
}) {
  const [form, setForm] = useState<CredForm>(emptyForm)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setShowPw(false)
      setForm(editing
        ? {
            title:    editing.title,
            username: editing.username ?? '',
            password: editing.password ?? '',
            url:      editing.url ?? '',
            notes:    editing.notes ?? '',
          }
        : emptyForm
      )
    }
  }, [open, editing])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.updateCredential(editing.id, form)
        toast.success('Credential updated')
      } else {
        await api.createCredential(form)
        toast.success('Credential saved')
      }
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to save credential')
    } finally {
      setSaving(false)
    }
  }

  const title = editing ? 'Edit Credential' : 'New Credential'

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form id="cred-form" onSubmit={handleSave}>
          <div className="px-6 pb-2 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-title">Title</Label>
              <Input
                id="c-title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. GitHub"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-user">
                <User className="inline h-3 w-3 mr-1" />Username
              </Label>
              <Input
                id="c-user"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="username or email"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-pw">
                <Lock className="inline h-3 w-3 mr-1" />Password
              </Label>
              <div className="relative">
                <Input
                  id="c-pw"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="password"
                  className="pr-9 font-mono"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-url">
                <LinkIcon className="inline h-3 w-3 mr-1" />URL (optional)
              </Label>
              <Input
                id="c-url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-notes">
                <StickyNote className="inline h-3 w-3 mr-1" />Notes (optional)
              </Label>
              <Textarea
                id="c-notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any extra info"
                className="min-h-[70px] resize-none text-xs"
              />
            </div>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button form="cred-form" type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Credential'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirm dialog ──────────────────────────────────────────────────────

function DeleteDialog({
  cred, onClose, onDeleted,
}: {
  cred: Credential | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!cred) return
    setDeleting(true)
    try {
      await api.deleteCredential(cred.id)
      toast.success('Deleted')
      onDeleted()
      onClose()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!cred} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Delete credential?</DialogTitle>
        </DialogHeader>
        <p className="px-6 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{cred?.title}</span> will be permanently deleted.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Login gate ─────────────────────────────────────────────────────────────────

function NiflheimLogin({ onAuthed }: { onAuthed: () => void }) {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await api.niflheimLogin(password)
      if (result.ok) {
        onAuthed()
      } else {
        toast.error(result.error ?? 'Incorrect password')
      }
    } catch {
      toast.error('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="relative w-full max-w-sm"
      >
        <div className="relative rounded-2xl border border-border bg-card px-8 py-10 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary border border-border">
              <KeyRound className="h-5 w-5 text-gold" />
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-wide">Niflheim</h1>
            <p className="mt-1 text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Password Vault
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Master Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter master password"
                  className="pr-9"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Unlocking…' : 'Unlock'}
            </Button>
          </form>
        </div>
      </motion.div>
    </main>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Niflheim() {
  const [authed, setAuthed]   = useState<boolean | null>(null)
  const [creds, setCreds]     = useState<Credential[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [editing, setEditing] = useState<Credential | null>(null)
  const [deleting, setDeleting] = useState<Credential | null>(null)

  useEffect(() => {
    api.niflheimStatus()
      .then(s => setAuthed(s.authed))
      .catch(() => setAuthed(false))
  }, [])

  async function load() {
    setLoading(true)
    try {
      setCreds(await api.listCredentials())
    } catch {
      setAuthed(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authed) load()
  }, [authed])

  async function handleLogout() {
    await api.niflheimLogout()
    setAuthed(false)
    setCreds([])
  }

  if (authed === null) return null

  if (!authed) {
    return <NiflheimLogin onAuthed={() => setAuthed(true)} />
  }

  const filtered = search.trim()
    ? creds.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.username ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.url ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : creds

  return (
    <main className="pt-24 pb-20 px-4">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <BlurFade>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Niflheim</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Password vault</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Lock
              </Button>
              <Button onClick={() => setNewOpen(true)}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>
          </div>
        </BlurFade>

        {/* Search */}
        <BlurFade delay={0.05}>
          <Input
            placeholder="Search credentials…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </BlurFade>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <KeyRound className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-3">
              {search ? 'No matching credentials.' : 'No credentials yet.'}
            </p>
            {!search && (
              <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
                <Plus className="h-4 w-4" />
                Add one
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={search}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {filtered.map((c, i) => (
                <CredentialCard
                  key={c.id}
                  cred={c}
                  index={i}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <CredentialDialog
        open={newOpen || !!editing}
        onClose={() => { setNewOpen(false); setEditing(null) }}
        onSaved={load}
        editing={editing}
      />
      <DeleteDialog
        cred={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={load}
      />
    </main>
  )
}
