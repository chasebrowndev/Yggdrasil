import { useEffect, useState, useRef, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, Reorder, useDragControls, type DragControls } from 'framer-motion'
import {
  Pencil, Trash2, LogOut, Key, GripVertical,
  Globe, AlignLeft, ArrowUpDown, ImageIcon, Plus, Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, type Realm } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { BlurFade } from '@/components/magicui/blur-fade'

type RealmForm = {
  name: string
  description: string
  route: string
  sort_order: string
  image: File | null
}

const emptyForm: RealmForm = { name: '', description: '', route: '', sort_order: '0', image: null }

function RealmRow({
  realm,
  dragControls,
  onEdit,
  onDelete,
  onToggle,
}: {
  realm: Realm
  dragControls: DragControls
  onEdit: (r: Realm) => void
  onDelete: (r: Realm) => void
  onToggle: (r: Realm) => void
}) {
  const hidden = realm.visible === 0
  return (
    <div className={`group flex items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors ${hidden ? 'bg-card/20 opacity-60' : 'bg-card/50 hover:bg-card'}`}>
      <GripVertical
        className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={(e) => dragControls.start(e)}
      />

      <div className="min-w-0 flex-1 grid grid-cols-[1fr_1fr_auto] gap-x-4 items-center">
        <div className="min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{realm.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{realm.description}</p>
        </div>
        <div className="min-w-0 hidden sm:block">
          <code className="text-xs text-gold/80 bg-secondary/60 px-2 py-0.5 rounded font-mono truncate block w-fit max-w-full">
            {realm.route}
          </code>
        </div>
        <div className="text-xs text-muted-foreground text-right shrink-0">
          #{realm.sort_order}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon-sm" variant="ghost" onClick={() => onToggle(realm)}
          title={hidden ? 'Show on homepage' : 'Hide from homepage'}>
          {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => onEdit(realm)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => onDelete(realm)}
          className="hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function RealmItem({
  realm,
  onEdit,
  onDelete,
  onToggle,
  onDragEnd,
}: {
  realm: Realm
  onEdit: (r: Realm) => void
  onDelete: (r: Realm) => void
  onToggle: (r: Realm) => void
  onDragEnd: () => void
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      as="div"
      value={realm}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
    >
      <RealmRow
        realm={realm}
        dragControls={controls}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggle={onToggle}
      />
    </Reorder.Item>
  )
}

function RealmDialog({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean
  onClose: () => void
  initial: Realm | null
  onSave: () => void
}) {
  const [form, setForm] = useState<RealmForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? { name: initial.name, description: initial.description, route: initial.route, sort_order: String(initial.sort_order), image: null }
          : emptyForm
      )
    }
  }, [open, initial])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('description', form.description)
      fd.append('route', form.route)
      fd.append('sort_order', form.sort_order)
      if (form.image) fd.append('image', form.image)

      if (initial) {
        await api.updateRealm(initial.id, fd)
        toast.success('Realm updated')
      } else {
        await api.createRealm(fd)
        toast.success('Realm created')
      }
      onSave()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Realm' : 'New Realm'}</DialogTitle>
        </DialogHeader>
        <form id="realm-form" onSubmit={handleSave}>
          <div className="px-6 pb-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="r-name"><AlignLeft className="inline h-3 w-3 mr-1" />Name</Label>
              <Input id="r-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-desc">Description</Label>
              <Textarea id="r-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} required />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-route"><Globe className="inline h-3 w-3 mr-1" />Route</Label>
                <Input id="r-route" value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))} placeholder="/myservice" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-order"><ArrowUpDown className="inline h-3 w-3 mr-1" />Order</Label>
                <Input id="r-order" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="w-20" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-img"><ImageIcon className="inline h-3 w-3 mr-1" />Image</Label>
              <Input id="r-img" type="file" accept="image/*"
                className="cursor-pointer file:mr-3 file:text-xs file:font-medium file:text-muted-foreground file:bg-secondary file:border-0 file:rounded file:px-2 file:py-1 file:cursor-pointer"
                onChange={e => setForm(f => ({ ...f, image: e.target.files?.[0] ?? null }))} />
            </div>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button form="realm-form" type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Create Realm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  realm,
  onClose,
  onDeleted,
}: {
  realm: Realm | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!realm) return
    setDeleting(true)
    try {
      await api.deleteRealm(realm.id)
      toast.success('Realm deleted')
      onDeleted()
      onClose()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!realm} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Realm</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{realm?.name}</span>? This cannot be undone.
          </p>
        </div>
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

function PasswordSection() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await api.changePassword(form.current, form.next, form.confirm)
      if (result.ok) {
        toast.success('Password updated')
        setForm({ current: '', next: '', confirm: '' })
      } else {
        toast.error(result.error ?? 'Failed to update password')
      }
    } catch {
      toast.error('Request failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Change Password</h2>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pw-current">Current</Label>
          <Input id="pw-current" type="password" value={form.current}
            onChange={e => setForm(f => ({ ...f, current: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-new">New</Label>
          <Input id="pw-new" type="password" value={form.next}
            onChange={e => setForm(f => ({ ...f, next: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-confirm">Confirm</Label>
          <Input id="pw-confirm" type="password" value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
        </div>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" size="sm" disabled={saving} variant="outline">
            {saving ? 'Saving…' : 'Update Password'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function Asgard() {
  const navigate = useNavigate()
  const [realms, setRealms] = useState<Realm[]>([])
  const [loading, setLoading] = useState(true)
  const [editRealm, setEditRealm] = useState<Realm | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteRealm, setDeleteRealm] = useState<Realm | null>(null)
  const pendingOrderRef = useRef<Realm[]>([])

  async function load() {
    try {
      const data = await api.adminRealms()
      setRealms(data)
    } catch {
      navigate('/asgard/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleLogout() {
    await api.logout()
    navigate('/asgard/login')
  }

  function handleReorder(newOrder: Realm[]) {
    setRealms(newOrder)
    pendingOrderRef.current = newOrder
  }

  async function persistOrder() {
    const order = pendingOrderRef.current
    if (!order.length) return
    try {
      await api.reorderRealms(order.map(r => r.id))
      setRealms(order.map((r, i) => ({ ...r, sort_order: i + 1 })))
    } catch {
      toast.error('Failed to save order')
      load()
    }
    pendingOrderRef.current = []
  }

  async function handleToggle(realm: Realm) {
    try {
      const updated = await api.toggleRealm(realm.id)
      setRealms(rs => rs.map(r => r.id === updated.id ? updated : r))
      toast.success(updated.visible ? 'Realm shown on homepage' : 'Realm hidden from homepage')
    } catch {
      toast.error('Failed to toggle visibility')
    }
  }

  return (
    <main className="pt-24 pb-20 px-4">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <BlurFade>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Asgard</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Manage realms and settings</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </BlurFade>

        <Separator />

        {/* Realms section */}
        <BlurFade delay={0.05}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Realms
                {realms.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground normal-case tracking-normal">
                    {realms.length} total
                  </span>
                )}
              </h2>
              <Button size="sm" variant="outline" onClick={() => { setEditRealm(null); setEditOpen(true) }}>
                <Plus className="h-3.5 w-3.5" />
                New Realm
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-card animate-pulse border border-border" />
                ))}
              </div>
            ) : realms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <p className="text-sm text-muted-foreground">No realms configured</p>
              </div>
            ) : (
              <Reorder.Group as="div" axis="y" values={realms} onReorder={handleReorder} className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {realms.map((realm) => (
                    <RealmItem
                      key={realm.id}
                      realm={realm}
                      onEdit={(r) => { setEditRealm(r); setEditOpen(true) }}
                      onDelete={setDeleteRealm}
                      onToggle={handleToggle}
                      onDragEnd={persistOrder}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>
        </BlurFade>

        <Separator />

        {/* Password section */}
        <BlurFade delay={0.1}>
          <PasswordSection />
        </BlurFade>
      </div>

      <RealmDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={editRealm}
        onSave={load}
      />
      <DeleteDialog
        realm={deleteRealm}
        onClose={() => setDeleteRealm(null)}
        onDeleted={load}
      />
    </main>
  )
}
