import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { v4 as uuid } from "uuid";

let s3: S3Client | null = null;

function getS3(): S3Client | null {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_S3_BUCKET) {
    return null;
  }
  if (!s3) {
    s3 = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3;
}

export async function uploadToS3(
  buffer: Buffer,
  mimeType: string,
  folder: string,
): Promise<string> {
  const client = getS3();
  const key = `${folder}/${uuid()}`;

  if (!client || !env.AWS_S3_BUCKET) {
    return `local://${key}`;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export function assertUploadConfigured(): void {
  if (!getS3()) {
    throw new AppError(503, "File upload service not configured");
  }
}
