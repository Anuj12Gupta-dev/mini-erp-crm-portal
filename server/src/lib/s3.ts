import { S3Client } from '@aws-sdk/client-s3';

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      process.env.S3_BUCKET_NAME &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

export function getS3Client(): S3Client {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (AWS_REGION, S3_BUCKET_NAME, AWS credentials required)');
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
