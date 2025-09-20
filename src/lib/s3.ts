import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: "us-west-2" });

export type S3UploadResult = {
  url: string;
  key: string;
};

export async function uploadToS3(
  file: Buffer,
  filename: string,
  contentType: string,
  bucketName: string = "linear-request-uploads"
): Promise<S3UploadResult> {
  const timestamp = Date.now();
  const key = `uploads/${timestamp}-${filename}`;
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  const url = `https://${bucketName}.s3.us-west-2.amazonaws.com/${key}`;
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
