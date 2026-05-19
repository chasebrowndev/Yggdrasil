import { useEffect, useState, useRef, DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Download, Trash2,
  File, FileText, FileImage, Archive, Code, Music, Video,
  CloudUpload,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, type SvartalfheimFile } from '@/api/client'
import { formatDate, formatSize } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/magicui/blur-fade'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'

function FileTypeIcon({ mime }: { mime: string }) {
  const cls = 'h-4 w-4 shrink-0 text-muted-foreground'
  if (mime.startsWith('image/'))  return <FileImage className={cls} />
  if (mime.startsWith('video/'))  return <Video     className={cls} />
  if (mime.startsWith('audio/'))  return <Music     className={cls} />
  if (mime === 'application/pdf' || mime.startsWith('text/')) return <FileText className={cls} />
  if (/zip|tar|gzip|7z|rar|bzip/.test(mime))  return <Archive className={cls} />
  if (/javascript|json|html|css|xml|yaml/.test(mime)) return <Code className={cls} />
  return <File className={cls} />
}

type UploadJob = {
  id: string
  name: string
  progress: number
  error?: string
}

export default function Svartalfheim() {
  const [files, setFiles]           = useState<SvartalfheimFile[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploads, setUploads]       = useState<UploadJob[]>([])
  const [dragging, setDragging]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SvartalfheimFile | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      setFiles(await api.listFiles())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startUploads(fileList: FileList | File[]) {
    Array.from(fileList).forEach(file => {
      const id = crypto.randomUUID()
      setUploads(prev => [...prev, { id, name: file.name, progress: 0 }])

      api.uploadFile(file, pct => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: pct } : u))
      }).then(() => {
        setUploads(prev => prev.filter(u => u.id !== id))
        load()
        toast.success(`Uploaded ${file.name}`)
      }).catch(() => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, error: 'Failed' } : u))
        toast.error(`Failed to upload ${file.name}`)
        setTimeout(() => setUploads(prev => prev.filter(u => u.id !== id)), 3000)
      })
    })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) startUploads(e.dataTransfer.files)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteFile(deleteTarget.name)
      toast.success('File deleted')
      setFiles(f => f.filter(x => x.name !== deleteTarget.name))
      setDeleteTarget(null)
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="pt-24 pb-20 px-4">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <BlurFade>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Svartalfheim</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">File transfers</p>
            </div>
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => e.target.files && startUploads(e.target.files)}
            />
          </div>
        </BlurFade>

        {/* Drop zone */}
        <BlurFade delay={0.04}>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed py-10 text-center cursor-pointer transition-colors duration-150 ${
              dragging
                ? 'border-[hsl(27_43%_55%)] bg-[hsl(27_43%_55%/0.05)]'
                : 'border-border hover:border-[hsl(27_43%_55%/0.5)] hover:bg-secondary/30'
            }`}
          >
            <CloudUpload className={`mx-auto h-8 w-8 mb-2 transition-colors duration-150 ${
              dragging ? 'text-gold' : 'text-muted-foreground/40'
            }`} />
            <p className="text-sm text-muted-foreground">
              {dragging ? 'Drop to upload' : 'Drop files here or click to browse'}
            </p>
          </div>
        </BlurFade>

        {/* Active uploads */}
        <AnimatePresence>
          {uploads.map(job => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm text-foreground truncate">{job.name}</span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {job.error ?? `${job.progress}%`}
                </span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    job.error ? 'bg-destructive' : 'bg-gold'
                  }`}
                  style={{ width: `${job.error ? 100 : job.progress}%` }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* File list */}
        <BlurFade delay={0.08}>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-card animate-pulse border border-border" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-sm text-muted-foreground">No files yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="mb-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </p>
              <AnimatePresence mode="popLayout">
                {files.map((file, i) => (
                  <motion.div
                    key={file.name}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 hover:bg-card transition-colors"
                  >
                    <FileTypeIcon mime={file.mime_type} />

                    <div className="min-w-0 flex-1 grid grid-cols-[1fr_auto_auto] gap-x-6 items-center">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
                        {formatSize(file.size)}
                      </span>
                      <span className="text-xs text-muted-foreground hidden md:block">
                        {formatDate(file.uploaded_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon-sm" variant="ghost" asChild>
                        <a
                          href={`/api/svartalfheim/files/${encodeURIComponent(file.name)}`}
                          download={file.name}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(file)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </BlurFade>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-4">
            <p className="text-sm text-muted-foreground">
              Delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
              {' '}This cannot be undone.
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
