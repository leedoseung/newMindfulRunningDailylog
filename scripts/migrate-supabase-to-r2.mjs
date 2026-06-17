// Migrate every object from Supabase Storage buckets to Cloudflare R2,
// then print SQL to update DB photo_url / avatar_url references.
//
// Run:
//   node --env-file=.env.local scripts/migrate-supabase-to-r2.mjs --dry
//   node --env-file=.env.local scripts/migrate-supabase-to-r2.mjs
//
// Idempotent: skips objects that already exist in R2 (HEAD check).

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const DRY = process.argv.includes('--dry')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET_NAME
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

for (const [k, v] of Object.entries({
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL,
})) {
  if (!v) {
    console.error(`Missing env var: ${k}`)
    process.exit(1)
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

// Supabase bucket -> R2 key prefix
const BUCKETS = [
  { name: 'run-photos', prefix: 'run-photos' },
  { name: 'avatars',    prefix: 'avatars'    },
]

async function listAll(bucket, path = '') {
  const out = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(path, {
      limit: 1000, offset, sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`list ${bucket}/${path}: ${error.message}`)
    for (const item of data) {
      if (item.id) out.push(`${path ? path + '/' : ''}${item.name}`)
      else {
        const nested = await listAll(bucket, `${path ? path + '/' : ''}${item.name}`)
        out.push(...nested)
      }
    }
    if (data.length < 1000) break
    offset += 1000
  }
  return out
}

async function r2Exists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return true
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false
    throw err
  }
}

function contentTypeFor(path) {
  const ext = path.toLowerCase().split('.').pop()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

async function migrateBucket(bucket, prefix) {
  console.log(`\n=== ${bucket} (-> ${prefix}/) ===`)
  const paths = await listAll(bucket)
  console.log(`found ${paths.length} objects`)

  let copied = 0, skipped = 0, failed = 0
  for (const path of paths) {
    const key = `${prefix}/${path}`
    try {
      if (await r2Exists(key)) {
        skipped++
        continue
      }
      if (DRY) {
        console.log(`[dry] would copy ${bucket}/${path} -> r2:${key}`)
        copied++
        continue
      }
      const { data, error } = await supabase.storage.from(bucket).download(path)
      if (error) throw new Error(`download: ${error.message}`)
      const buf = Buffer.from(await data.arrayBuffer())
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buf,
        ContentType: contentTypeFor(path),
        CacheControl: 'public, max-age=31536000, immutable',
      }))
      copied++
      if (copied % 25 === 0) console.log(`  ${copied} copied...`)
    } catch (err) {
      failed++
      console.error(`  FAIL ${path}: ${err.message}`)
    }
  }
  console.log(`done: copied=${copied} skipped=${skipped} failed=${failed}`)
}

async function main() {
  for (const b of BUCKETS) await migrateBucket(b.name, b.prefix)

  console.log('\n=== DB URL update SQL ===')
  console.log(`-- Run in Supabase SQL editor after verifying R2 objects:

UPDATE run_logs
SET photo_url = REPLACE(
  photo_url,
  '${SUPABASE_URL}/storage/v1/object/public/run-photos/',
  '${R2_PUBLIC_URL}/run-photos/'
)
WHERE photo_url LIKE '${SUPABASE_URL}/storage/v1/object/public/run-photos/%';

UPDATE members
SET avatar_url = REPLACE(
  avatar_url,
  '${SUPABASE_URL}/storage/v1/object/public/avatars/',
  '${R2_PUBLIC_URL}/avatars/'
)
WHERE avatar_url LIKE '${SUPABASE_URL}/storage/v1/object/public/avatars/%';

-- Also covers /render/image/ URLs (legacy transform paths)
UPDATE run_logs
SET photo_url = REPLACE(
  REGEXP_REPLACE(photo_url, '\\?.*$', ''),
  '${SUPABASE_URL}/storage/v1/render/image/public/run-photos/',
  '${R2_PUBLIC_URL}/run-photos/'
)
WHERE photo_url LIKE '${SUPABASE_URL}/storage/v1/render/image/public/run-photos/%';

UPDATE members
SET avatar_url = REPLACE(
  REGEXP_REPLACE(avatar_url, '\\?.*$', ''),
  '${SUPABASE_URL}/storage/v1/render/image/public/avatars/',
  '${R2_PUBLIC_URL}/avatars/'
)
WHERE avatar_url LIKE '${SUPABASE_URL}/storage/v1/render/image/public/avatars/%';
`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
