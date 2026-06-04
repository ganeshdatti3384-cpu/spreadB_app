import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// Ensure required environment variables are present
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  console.warn("⚠️ AWS S3 credentials are not set. File uploads will fail unless they are configured.");
}

export const s3 = new S3Client({
  region: region,
  credentials: {
    accessKeyId: accessKeyId || "placeholder",
    secretAccessKey: secretAccessKey || "placeholder",
  },
});

export const s3BucketName = process.env.S3_BUCKET_NAME || "spreadb-uploads";
