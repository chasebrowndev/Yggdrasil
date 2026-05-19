export type Realm = {
  id: number
  name: string
  description: string
  route: string
  image_path: string | null
  sort_order: number
  visible: 0 | 1
}

export type Entry = {
  id: number
  title: string
  category: 'recipe' | 'guide'
  description: string | null
  image_path: string | null
  body: string | null
  created_at: string
}

export type EntryDetail = Entry & { body_html: string }

export type TailscalePeer = {
  ID: string
  HostName: string
  DNSName: string
  OS: string
  TailscaleIPs: string[]
  RxBytes: number
  TxBytes: number
  Online: boolean
  Active: boolean
  LastSeen: string
  LastHandshake: string
  Relay: string
  CurAddr: string
  ExitNode: boolean
  ExitNodeOption: boolean
}

export type TailscaleStatus = {
  Version: string
  BackendState: string
  Self: TailscalePeer
  Peer: Record<string, TailscalePeer> | null
  CurrentTailnet?: {
    Name: string
    MagicDNSSuffix: string
    MagicDNSEnabled: boolean
  }
}

export type Credential = {
  id: number
  title: string
  username: string | null
  password: string | null
  url: string | null
  notes: string | null
  created_at: string
}

export type SvartalfheimFile = {
  name: string
  size: number
  uploaded_at: string
  mime_type: string
}

export const api = {
  async getRealms(): Promise<Realm[]> {
    const r = await fetch('/api/realms')
    if (!r.ok) throw new Error('Failed to fetch realms')
    return r.json()
  },

  async login(password: string): Promise<{ ok: boolean; error?: string }> {
    const r = await fetch('/api/asgard/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    return r.json()
  },

  async logout(): Promise<void> {
    await fetch('/api/asgard/logout', { method: 'POST' })
  },

  async authStatus(): Promise<{ authed: boolean }> {
    const r = await fetch('/api/asgard/status')
    return r.json()
  },

  async adminRealms(): Promise<Realm[]> {
    const r = await fetch('/api/asgard/realms')
    if (!r.ok) throw new Error('Unauthorized')
    return r.json()
  },

  async createRealm(data: FormData): Promise<Realm> {
    const r = await fetch('/api/asgard/realms', { method: 'POST', body: data })
    if (!r.ok) throw new Error('Failed to create realm')
    return r.json()
  },

  async updateRealm(id: number, data: FormData): Promise<Realm> {
    const r = await fetch(`/api/asgard/realms/${id}`, { method: 'PUT', body: data })
    if (!r.ok) throw new Error('Failed to update realm')
    return r.json()
  },

  async deleteRealm(id: number): Promise<void> {
    const r = await fetch(`/api/asgard/realms/${id}`, { method: 'DELETE' })
    if (!r.ok) throw new Error('Failed to delete realm')
  },

  async reorderRealms(ids: number[]): Promise<void> {
    const r = await fetch('/api/asgard/realms/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: ids }),
    })
    if (!r.ok) throw new Error('Failed to reorder realms')
  },

  async toggleRealm(id: number): Promise<Realm> {
    const r = await fetch(`/api/asgard/realms/${id}/toggle`, { method: 'POST' })
    if (!r.ok) throw new Error('Failed to toggle realm')
    return r.json()
  },

  async changePassword(current: string, newPw: string, confirm: string) {
    const r = await fetch('/api/asgard/settings/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: current, new_password: newPw, confirm_password: confirm }),
    })
    return r.json() as Promise<{ ok: boolean; error?: string }>
  },

  async getEntries(): Promise<Entry[]> {
    const r = await fetch('/api/vanaheim/entries')
    if (!r.ok) throw new Error('Failed to fetch entries')
    return r.json()
  },

  async getEntry(id: number): Promise<EntryDetail> {
    const r = await fetch(`/api/vanaheim/entries/${id}`)
    if (!r.ok) throw new Error('Entry not found')
    return r.json()
  },

  async createEntry(data: FormData): Promise<Entry> {
    const r = await fetch('/api/vanaheim/entries', { method: 'POST', body: data })
    if (!r.ok) throw new Error('Failed to create entry')
    return r.json()
  },

  async updateEntry(id: number, data: FormData): Promise<Entry> {
    const r = await fetch(`/api/vanaheim/entries/${id}`, { method: 'PUT', body: data })
    if (!r.ok) throw new Error('Failed to update entry')
    return r.json()
  },

  async deleteEntry(id: number): Promise<void> {
    const r = await fetch(`/api/vanaheim/entries/${id}`, { method: 'DELETE' })
    if (!r.ok) throw new Error('Failed to delete entry')
  },

  async getTailscaleStatus(): Promise<TailscaleStatus> {
    const r = await fetch('/api/bifrost/status')
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      throw new Error(body.error ?? 'Failed to fetch status')
    }
    return r.json()
  },

  async pingPeer(ip: string): Promise<{ output: string; ok: boolean }> {
    const r = await fetch(`/api/bifrost/ping/${encodeURIComponent(ip)}`)
    return r.json()
  },

  async listFiles(): Promise<SvartalfheimFile[]> {
    const r = await fetch('/api/svartalfheim/files')
    if (!r.ok) throw new Error('Failed to fetch files')
    return r.json()
  },

  uploadFile(file: File, onProgress?: (pct: number) => void): Promise<SvartalfheimFile> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const fd = new FormData()
      fd.append('file', file)
      xhr.upload.onprogress = e => {
        if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
        else reject(new Error('Upload failed'))
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.open('POST', '/api/svartalfheim/upload')
      xhr.send(fd)
    })
  },

  async deleteFile(name: string): Promise<void> {
    const r = await fetch(`/api/svartalfheim/files/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (!r.ok) throw new Error('Delete failed')
  },

  async niflheimLogin(password: string): Promise<{ ok: boolean; error?: string }> {
    const r = await fetch('/api/niflheim/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    return r.json()
  },

  async niflheimLogout(): Promise<void> {
    await fetch('/api/niflheim/logout', { method: 'POST' })
  },

  async niflheimStatus(): Promise<{ authed: boolean }> {
    const r = await fetch('/api/niflheim/status')
    return r.json()
  },

  async listCredentials(): Promise<Credential[]> {
    const r = await fetch('/api/niflheim/credentials')
    if (!r.ok) throw new Error('Unauthorized')
    return r.json()
  },

  async createCredential(data: Omit<Credential, 'id' | 'created_at'>): Promise<Credential> {
    const r = await fetch('/api/niflheim/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error('Failed to create credential')
    return r.json()
  },

  async updateCredential(id: number, data: Partial<Omit<Credential, 'id' | 'created_at'>>): Promise<Credential> {
    const r = await fetch(`/api/niflheim/credentials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error('Failed to update credential')
    return r.json()
  },

  async deleteCredential(id: number): Promise<void> {
    const r = await fetch(`/api/niflheim/credentials/${id}`, { method: 'DELETE' })
    if (!r.ok) throw new Error('Failed to delete credential')
  },
}
