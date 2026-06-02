import fs from "fs";
import path from "path";
import htmlToDocx from "html-to-docx";

export const generateDOC = async (html, fileName) => {
  const outputDir = "./uploads/contracts";

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.resolve(`${outputDir}/${fileName}`);

  const docxBuffer = await htmlToDocx(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });

  fs.writeFileSync(filePath, docxBuffer);

  return filePath;
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


