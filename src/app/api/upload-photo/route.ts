import { createServerClient } from '@/infrastructure/supabase/client'
import { uploadToR2 } from '@/infrastructure/r2/upload'
import { NextResponse } from 'next/server'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_KINDS = new Set(['run-photo', 'avatar'])
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  const kind = String(form.get('kind') ?? '')

  if (!(file instanceof Blob)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (!ALLOWED_KINDS.has(kind)) return NextResponse.json({ error: 'invalid kind' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: `unsupported type: ${file.type}` }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file too large' }, { status: 413 })

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const prefix = kind === 'avatar' ? 'avatars' : 'run-photos'
  const key = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const url = await uploadToR2({ key, body: buffer, contentType: file.type })
    return NextResponse.json({ url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export const runtime = 'nodejs'
