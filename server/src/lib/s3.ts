import { S3Client } from '@aws-sdk/client-s3';

// Credentials are resolved by the AWS SDK's default provider chain: explicit env vars when set
// (local dev), otherwise the EC2 instance role in production. Only the region and bucket have to
// be configured explicitly, so no long-lived keys need to live on the server.
export function isS3Configured(): boolean {
  return Boolean(process.env.AWS_REGION && process.env.S3_BUCKET_NAME);
}

export function getS3Client(): S3Client {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (AWS_REGION and S3_BUCKET_NAME are required)');
  }
  return new S3Client({ region: process.env.AWS_REGION });
}

export function getS3BucketName(): string {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error('S3_BUCKET_NAME is not set');
  }
  return bucket;
}

export function buildPublicUrl(key: string): string {
  if (process.env.S3_PUBLIC_BASE_URL) {
    return `${process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }
  return `https://${getS3BucketName()}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
