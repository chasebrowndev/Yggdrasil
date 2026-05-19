import { useEffect, useState, FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Calendar, AlignLeft, ImageIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { api, type EntryDetail } from '@/api/client'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { BlurFade } from '@/components/magicui/blur-fade'

type EditForm = {
  title: string
  category: 'recipe' | 'guide'
  description: string
  body: string
  image: File | null
}

function EditDialog({
  entry,
  open,
  onClose,
  onSaved,
}: {
  entry: EntryDetail
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<EditForm>({
    title: entry.title,
    category: entry.category,
    description: entry.description ?? '',
    body: entry.body ?? '',
    image: null,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        title: entry.title,
        category: entry.category,
        description: entry.description ?? '',
        body: entry.body ?? '',
        image: null,
      })
    }
  }, [open, entry])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('category', form.category)
      fd.append('description', form.description)
      fd.append('body', form.body)
      if (form.image) fd.append('image', form.image)
      await api.updateEntry(entry.id, fd)
      toast.success('Entry updated')
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to update entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogHeader>
        <form id="edit-entry-form" onSubmit={handleSave}>
          <div className="px-6 pb-2 space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label><AlignLeft className="inline h-3 w-3 mr-1" />Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as 'recipe' | 'guide' }))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recipe">Recipe</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Body (Markdown)</Label>
              <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="font-mono text-xs min-h-[200px] resize-y" />
            </div>
            <div className="space-y-1.5">
              <Label><ImageIcon className="inline h-3 w-3 mr-1" />Replace Image</Label>
              <Input type="file" accept="image/*"
                className="cursor-pointer file:mr-3 file:text-xs file:font-medium file:text-muted-foreground file:bg-secondary file:border-0 file:rounded file:px-2 file:py-1"
                onChange={e => setForm(f => ({ ...f, image: e.target.files?.[0] ?? null }))} />
            </div>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
          <Button form="edit-entry-form" type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function VanaheimEntry() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<EntryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const data = await api.getEntry(Number(id))
      setEntry(data)
    } catch {
      navigate('/vanaheim')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleDelete() {
    if (!entry) return
    setDeleting(true)
    try {
      await api.deleteEntry(entry.id)
      toast.success('Entry deleted')
      navigate('/vanaheim')
    } catch {
      toast.error('Delete failed')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="pt-24 pb-20 px-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-8 w-32 bg-card animate-pulse rounded" />
          <div className="h-64 bg-card animate-pulse rounded-xl" />
          <div className="h-6 w-48 bg-card animate-pulse rounded" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-card animate-pulse rounded" />)}
          </div>
        </div>
      </main>
    )
  }

  if (!entry) return null

  return (
    <main className="pt-24 pb-20 px-4">
      <div className="mx-auto max-w-2xl">

        {/* Top bar */}
        <BlurFade>
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/vanaheim"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Library
            </Link>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </BlurFade>

        {/* Hero image */}
        {entry.image_path && (
          <BlurFade delay={0.05}>
            <div className="mb-6 rounded-xl overflow-hidden h-64">
              <img src={entry.image_path} alt={entry.title} className="w-full h-full object-cover" />
            </div>
          </BlurFade>
        )}

        {/* Meta */}
        <BlurFade delay={0.08}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant={entry.category}>{entry.category}</Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
              <Calendar className="h-3 w-3" />
              {formatDate(entry.created_at)}
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-foreground leading-tight">{entry.title}</h1>
          {entry.description && (
            <p className="mt-2 text-base text-muted-foreground italic">{entry.description}</p>
          )}
        </BlurFade>

        <BlurFade delay={0.12}>
          <div className="my-6 h-px w-16 bg-gradient-to-r from-gold/40 to-transparent" />
        </BlurFade>

        {/* Body */}
        <BlurFade delay={0.15}>
          <div className="prose-warm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {entry.body ?? ''}
            </ReactMarkdown>
          </div>
        </BlurFade>
      </div>

      {/* Edit dialog */}
      {entry && (
        <EditDialog
          entry={entry}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={load}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={v => !v && setDeleteOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-4">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{entry.title}</span>? This cannot be undone.
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
    </main>
  )
}
