import fs from "fs";
import path from "path";
import htmlToDocx from "html-to-docx";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, s3BucketName } from "./s3Config.js";

export const generateDOC = async (html, fileName) => {
  const docxBuffer = await htmlToDocx(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });

  const s3Key = `contracts/${fileName}`;
  
  await s3.send(new PutObjectCommand({
    Bucket: s3BucketName,
    Key: s3Key,
    Body: docxBuffer,
    ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }));

  // Return the S3 URL
  return `https://${s3BucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
};



// import puppeteer from "puppeteer";
// import path from "path";
// import fs from "fs";

// export const generatePDF = async (html, fileName) => {
//   const outputDir = "./uploads/contracts";

//   if (!fs.existsSync(outputDir)) {
//     fs.mkdirSync(outputDir, { recursive: true });
//   }

//   const browser = await puppeteer.launch({
//     headless: true,
//     args: [
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--disable-dev-shm-usage",
//       "--disable-gpu",
//       "--disable-software-rasterizer"
//     ]
//   });

//   const page = await browser.newPage();
//   page.setDefaultNavigationTimeout(0);

//   await page.setContent(html, { waitUntil: "networkidle0" });

//   const filePath = path.resolve(`${outputDir}/${fileName}`);

//   await page.pdf({
//     path: filePath,
//     format: "A4",
//     printBackground: true
//   });

//   await browser.close();

//   return filePath;
// };


