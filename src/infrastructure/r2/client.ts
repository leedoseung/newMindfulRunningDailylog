import { S3Client } from '@aws-sdk/client-s3'

let cached: S3Client | null = null

export function getR2Client(): S3Client {
  if (cached) return cached
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 env vars missing: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY')
  }
  cached = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return cached
}

export function getR2Bucket(): string {
  return process.env.R2_BUCKET_NAME ?? 'mindful-running-photos'
}

export function getR2PublicUrl(): string {
  const u = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  if (!u) throw new Error('NEXT_PUBLIC_R2_PUBLIC_URL missing')
  return u
}
