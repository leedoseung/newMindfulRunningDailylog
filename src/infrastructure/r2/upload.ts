import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, getR2Bucket, getR2PublicUrl } from './client'

export type UploadInput = {
  key: string
  body: Buffer | Uint8Array
  contentType: string
  cacheControl?: string
}

export async function uploadToR2(input: UploadInput): Promise<string> {
  await getR2Client().send(new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    CacheControl: input.cacheControl ?? 'public, max-age=31536000, immutable',
  }))
  return `${getR2PublicUrl()}/${input.key}`
}
