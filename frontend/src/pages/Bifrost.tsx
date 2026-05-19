import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Wifi, WifiOff, ArrowDown, ArrowUp,
  Signal, SignalZero, Loader2,
} from 'lucide-react'
import { api, type TailscaleStatus, type TailscalePeer } from '@/api/client'
import { formatSize, timeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/magicui/blur-fade'
import { Separator } from '@/components/ui/separator'

const OS_LABEL: Record<string, string> = {
  linux:   'Linux',
  windows: 'Windows',
  darwin:  'macOS',
  ios:     'iOS',
  android: 'Android',
}

function OnlineDot({ online, active }: { online: boolean; active: boolean }) {
  if (!online) return (
    <span className="h-2 w-2 rounded-full bg-muted-foreground/25 shrink-0" />
  )
  if (active) return (
    <span className="relative h-2 w-2 shrink-0 flex items-center justify-center">
      <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400/60" />
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  )
  return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
}

function lastSeenLabel(peer: TailscalePeer): string {
  if (peer.Active) return 'active'
  if (peer.Online) {
    if (!peer.LastHandshake || peer.LastHandshake.startsWith('0001')) return 'online'
    return timeAgo(peer.LastHandshake)
  }
  if (!peer.LastSeen || peer.LastSeen.startsWith('0001')) return 'never'
  return timeAgo(peer.LastSeen)
}

function connectionLabel(peer: TailscalePeer): string {
  if (peer.CurAddr) return 'direct'
  if (peer.Relay)   return `relay:${peer.Relay}`
  return '—'
}

function PingResult({ result }: { result: string }) {
  const ms = result.match(/in (\d+(?:\.\d+)?ms)/)
  return (
    <span className={`text-xs tabular-nums ${ms ? 'text-emerald-600' : 'text-destructive'}`}>
      {ms ? ms[1] : 'timeout'}
    </span>
  )
}

function PeerRow({ peer }: { peer: TailscalePeer }) {
  const [pinging, setPinging] = useState(false)
  const [pingResult, setPingResult] = useState<string | null>(null)
  const ip = peer.TailscaleIPs?.[0] ?? '—'

  async function doPing() {
    setPinging(true)
    setPingResult(null)
    try {
      const r = await api.pingPeer(ip)
      setPingResult(r.output)
    } catch {
      setPingResult('error')
    } finally {
      setPinging(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 hover:bg-card transition-colors"
    >
      <OnlineDot online={peer.Online} active={peer.Active} />

      <div className="min-w-0 flex-1 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-5 items-center">
        {/* Name + IP */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{peer.HostName}</p>
          <p className="text-xs text-muted-foreground font-mono">{ip}</p>
        </div>

        {/* OS */}
        <span className="text-xs text-muted-foreground hidden sm:block">
          {OS_LABEL[peer.OS] ?? peer.OS}
        </span>

        {/* Traffic */}
        <div className="text-xs text-muted-foreground hidden md:flex flex-col gap-0.5 items-end tabular-nums">
          <span className="flex items-center gap-1">
            <ArrowDown className="h-3 w-3" />{formatSize(peer.RxBytes)}
          </span>
          <span className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3" />{formatSize(peer.TxBytes)}
          </span>
        </div>

        {/* Last seen + connection type */}
        <div className="text-xs text-muted-foreground hidden sm:flex flex-col items-end gap-0.5">
          <span className={peer.Active ? 'text-emerald-600 font-medium' : ''}>
            {lastSeenLabel(peer)}
          </span>
          <span className="text-muted-foreground/50">{connectionLabel(peer)}</span>
        </div>
      </div>

      {/* Ping */}
      <div className="flex items-center gap-2 min-w-[4rem] justify-end">
        {pingResult && <PingResult result={pingResult} />}
        <button
          onClick={doPing}
          disabled={pinging}
          title="Ping"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          {pinging
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Signal className="h-3.5 w-3.5" />}
        </button>
      </div>
    </motion.div>
  )
}

export default function Bifrost() {
  const [status, setStatus]         = useState<TailscaleStatus | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getTailscaleStatus()
      setStatus(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 10_000)
    return () => clearInterval(id)
  }, [load])

  const peers = Object.values(status?.Peer ?? {})
  const onlineCount = peers.filter(p => p.Online).length
  const totalRx = peers.reduce((s, p) => s + p.RxBytes, 0)
  const totalTx = peers.reduce((s, p) => s + p.TxBytes, 0)
  const sortedPeers = [...peers].sort((a, b) => {
    if (a.Online !== b.Online) return a.Online ? -1 : 1
    if (a.Active !== b.Active) return a.Active ? -1 : 1
    return a.HostName.localeCompare(b.HostName)
  })

  const connected = status?.BackendState === 'Running'

  return (
    <main className="pt-24 pb-20 px-4">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <BlurFade>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Bifrost</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Tailscale network</p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {timeAgo(lastUpdated.toISOString())}
                </span>
              )}
              <Button size="sm" variant="outline" onClick={load}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>
        </BlurFade>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection status */}
        {status && (
          <BlurFade delay={0.04}>
            <div className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${
              connected
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-border bg-card'
            }`}>
              <div className="flex items-center gap-3">
                {connected
                  ? <Wifi className="h-5 w-5 text-emerald-600 shrink-0" />
                  : <WifiOff className="h-5 w-5 text-muted-foreground shrink-0" />}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {connected ? 'Connected' : status.BackendState}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {status.CurrentTailnet?.Name ?? 'Unknown tailnet'}
                    {status.CurrentTailnet?.MagicDNSSuffix && (
                      <span className="ml-1.5 font-mono opacity-70">
                        · {status.CurrentTailnet.MagicDNSSuffix}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono text-foreground">{status.Self.TailscaleIPs?.[0] ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {status.Self.HostName}
                  {status.Self.Relay && <span className="ml-1.5 opacity-60">· relay:{status.Self.Relay}</span>}
                </p>
              </div>
            </div>
          </BlurFade>
        )}

        {/* Stats */}
        {status && (
          <BlurFade delay={0.07}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Peers</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums">{peers.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Online</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums">{onlineCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" /> Received
                </p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{formatSize(totalRx)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" /> Sent
                </p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{formatSize(totalTx)}</p>
              </div>
            </div>
          </BlurFade>
        )}

        <Separator />

        {/* Peer list */}
        <BlurFade delay={0.1}>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-card animate-pulse border border-border" />
              ))}
            </div>
          ) : !status || peers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <SignalZero className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No peers found</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="mb-3 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Peers &middot; {onlineCount} of {peers.length} online
              </p>
              <AnimatePresence mode="popLayout">
                {sortedPeers.map(peer => (
                  <PeerRow key={peer.ID} peer={peer} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </BlurFade>
      </div>
    </main>
  )
}
