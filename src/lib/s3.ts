import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-west-2";
const s3Client = new S3Client({ region: REGION });

const ensuredBuckets = new Set<string>();

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$|\.+$/g, "");
}

async function ensureBucketExists(bucketName: string) {
  if (ensuredBuckets.has(bucketName)) return;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch (err: unknown) {
    // On platforms like Vercel, we typically do not have permission to create buckets.
    // Provide a clear error so the user can create the bucket manually.
    throw new Error(
      `S3 bucket '${bucketName}' not found or not accessible in region '${REGION}'. Please create it and grant put/get permissions to the runtime IAM user, or set env S3_BUCKET to an existing bucket.`
    );
  }

  ensuredBuckets.add(bucketName);
}

export type S3UploadResult = { url: string; key: string };

export async function uploadToS3(
  file: Buffer,
  filename: string,
  contentType: string,
  bucketName: string = process.env.S3_BUCKET || "linear-request-uploads"
): Promise<S3UploadResult> {
  const timestamp = Date.now();
  const safeName = sanitizeFilename(filename || "file");
  const key = `uploads/${timestamp}-${safeName}`;
  
  // Ensure bucket exists and is accessible
  await ensureBucketExists(bucketName);
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  // Return a signed GET URL for temporary access
  const signedGetUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucketName, Key: key }),
    { expiresIn: 3600 }
  );

  return { url: signedGetUrl, key };
}

export async function uploadMultipleToS3(
  files: Array<{ data: Buffer; filename: string; contentType: string }>,
  bucketName?: string
): Promise<S3UploadResult[]> {
  const uploads = files.map(file => 
    uploadToS3(file.data, file.filename, file.contentType, bucketName)
  );
  return Promise.all(uploads);
}
