import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { presignUploadSchema } from '../schemas/upload.schema';
import { sendValidationError } from '../lib/httpError';
import { getS3Client, getS3BucketName, buildPublicUrl, isS3Configured } from '../lib/s3';

export async function presignUpload(req: Request, res: Response): Promise<void> {
  if (!isS3Configured()) {
    res.status(501).json({
      error: 'Image upload is not configured on this server (missing AWS/S3 environment variables)',
    });
    return;
  }

  const parsed = presignUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const { filename, contentType } = parsed.data;

  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const key = `products/${randomUUID()}-${safeName}`;

  try {
    const uploadUrl = await getSignedUrl(
      getS3Client(),
      new PutObjectCommand({ Bucket: getS3BucketName(), Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    );
    res.json({ uploadUrl, publicUrl: buildPublicUrl(key) });
  } catch (err) {
    // Most likely the SDK could not resolve credentials (no instance role, no env keys).
    console.error('Presign failed:', err);
    res.status(500).json({ error: 'Could not generate an upload URL — check the server AWS credentials' });
  }
}
