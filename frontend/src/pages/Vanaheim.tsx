import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChefHat, BookOpen, Calendar, ImageIcon, AlignLeft } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Entry } from '@/api/client'
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

type Filter = 'all' | 'recipe' | 'guide'

const categoryGradients = {
  recipe: 'from-[hsl(18_35%_68%)] to-[hsl(13_30%_58%)]',   // terracotta
  guide:  'from-[hsl(88_16%_68%)] to-[hsl(82_14%_58%)]',   // sage
}

function EntryCard({ entry, index }: { entry: Entry; index: number }) {
  const gradient = categoryGradients[entry.category] ?? categoryGradients.guide

  return (
    <BlurFade delay={index * 0.06} inView>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        <Link
          to={`/vanaheim/${entry.id}`}
          className="group block rounded-xl border border-border bg-card overflow-hidden hover:border-[hsl(27_43%_55%)] transition-colors duration-200"
        >

          {/* Image */}
          <div className={`relative h-40 bg-gradient-to-br ${gradient} overflow-hidden`}>
            {entry.image_path ? (
              <img src={entry.image_path} alt={entry.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {entry.category === 'recipe'
                  ? <ChefHat className="h-10 w-10 text-black/10" />
                  : <BookOpen className="h-10 w-10 text-black/10" />}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card/70 to-transparent" />
            <div className="absolute top-3 left-3">
              <Badge variant={entry.category}>{entry.category}</Badge>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            <p className="font-semibold text-foreground text-sm leading-tight line-clamp-1 group-hover:text-gold transition-colors">
              {entry.title}
            </p>
            <div className="mt-1 h-px w-5 bg-gold/40 transition-all duration-300 group-hover:w-10 group-hover:bg-gold/70" />
            {entry.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {entry.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground/60">
              <Calendar className="h-3 w-3" />
              {formatDate(entry.created_at)}
            </div>
          </div>
        </Link>
      </motion.div>
    </BlurFade>
  )
}

type EntryFormData = {
  title: string
  category: 'recipe' | 'guide'
  description: string
  body: string
  image: File | null
}

const emptyForm: EntryFormData = {
  title: '', category: 'recipe', description: '', body: '', image: null,
}

function NewEntryDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EntryFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(emptyForm) }, [open])

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
      await api.createEntry(fd)
      toast.success('Entry created')
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to create entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Entry</DialogTitle>
        </DialogHeader>
        <form id="entry-form" onSubmit={handleSave}>
          <div className="px-6 pb-2 space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-title"><AlignLeft className="inline h-3 w-3 mr-1" />Title</Label>
                <Input id="e-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as 'recipe' | 'guide' }))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recipe">Recipe</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-desc">Description</Label>
              <Input id="e-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short summary" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-body">Body (Markdown)</Label>
              <Textarea id="e-body" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="font-mono text-xs min-h-[160px] resize-y" placeholder="# Heading&#10;&#10;Content here..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-img"><ImageIcon className="inline h-3 w-3 mr-1" />Image (optional)</Label>
              <Input id="e-img" type="file" accept="image/*"
                className="cursor-pointer file:mr-3 file:text-xs file:font-medium file:text-muted-foreground file:bg-secondary file:border-0 file:rounded file:px-2 file:py-1"
                onChange={e => setForm(f => ({ ...f, image: e.target.files?.[0] ?? null }))} />
            </div>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button form="entry-form" type="submit" size="sm" disabled={saving}>
            {saving ? 'Creating…' : 'Create Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const filterLabels: { value: Filter; label: string }[] = [
  { value: 'all',    label: 'All' },
  { value: 'recipe', label: 'Recipes' },
  { value: 'guide',  label: 'Guides' },
]

export default function Vanaheim() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [newOpen, setNewOpen] = useState(false)

  async function load() {
    try {
      const data = await api.getEntries()
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter)

  return (
    <main className="pt-24 pb-20 px-4">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* Header */}
        <BlurFade>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Vanaheim</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Recipes &amp; guides</p>
            </div>
            <Button onClick={() => setNewOpen(true)} className="shrink-0">
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          </div>
        </BlurFade>

        {/* Filter tabs */}
        <BlurFade delay={0.05}>
          <div className="flex gap-1 p-1 rounded-lg bg-secondary/40 w-fit">
            {filterLabels.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`relative px-4 py-1.5 text-sm rounded-md font-medium transition-colors duration-150 ${
                  filter === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter === value && (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 rounded-md bg-card shadow-sm border border-border"
                    transition={{ type: 'spring', duration: 0.3 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
                {value !== 'all' && (
                  <span className="relative z-10 ml-1.5 text-xs text-muted-foreground">
                    {entries.filter(e => e.category === value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </BlurFade>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-56 rounded-xl bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {filter === 'all' ? 'No entries yet.' : `No ${filter}s yet.`}
            </p>
            <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              Create one
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filtered.map((entry, i) => (
                <EntryCard key={entry.id} entry={entry} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <NewEntryDialog open={newOpen} onClose={() => setNewOpen(false)} onSaved={load} />
    </main>
  )
}
