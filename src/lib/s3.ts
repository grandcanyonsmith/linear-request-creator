import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  BucketLocationConstraint,
} from "@aws-sdk/client-s3";

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
    const e = err as { $metadata?: { httpStatusCode?: number }; name?: string; Code?: string };
    // Attempt to create if it truly doesn't exist
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === "NotFound" || e?.Code === "NotFound") {
      try {
        if (REGION === "us-east-1") {
          await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        } else {
          await s3Client.send(
            new CreateBucketCommand({
              Bucket: bucketName,
              CreateBucketConfiguration: { LocationConstraint: REGION as BucketLocationConstraint },
            })
          );
        }
      } catch (createErr: unknown) {
        const ce = createErr as { name?: string };
        // If bucket exists in another account or name is taken, surface clear guidance
        if (ce?.name !== "BucketAlreadyOwnedByYou") {
          throw new Error(
            `S3 bucket '${bucketName}' not found and could not be created. Please create it in region '${REGION}' or set an existing bucket in env S3_BUCKET.`
          );
        }
      }
    } else {
      throw err;
    }
  }
  ensuredBuckets.add(bucketName);
}

export type S3UploadResult = {
  url: string;
  key: string;
};

export async function uploadToS3(
  file: Buffer,
  filename: string,
  contentType: string,
  bucketName: string = process.env.S3_BUCKET || "linear-request-uploads"
): Promise<S3UploadResult> {
  const timestamp = Date.now();
  const safeName = sanitizeFilename(filename || "file");
  const key = `uploads/${timestamp}-${safeName}`;
  
  // Ensure bucket is present (create if missing when allowed)
  await ensureBucketExists(bucketName);
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  const url = `https://${bucketName}.s3.${REGION}.amazonaws.com/${key}`;
  return { url, key };
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
