const { PDFParse } = require('pdf-parse');
const path = require('path');
const { pathToFileURL } = require('url');

async function test() {
  try {
    const workerPath = path.resolve(__dirname, '../node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs');
    const workerUrl = pathToFileURL(workerPath).href;
    console.log("Setting worker to file URL:", workerUrl);
    PDFParse.setWorker(workerUrl);

    const buffer = Buffer.from('%PDF-1.5 ...'); // Mock PDF header
    console.log("Instantiating PDFParse...");
    const parser = new PDFParse({ data: buffer });
    console.log("Instantiated. Loading...");
    await parser.load();
    console.log("Loaded. Getting info...");
    const info = await parser.getInfo({ parsePageInfo: true });
    console.log("Info:", info);
  } catch (err) {
    console.error("Caught error:", err);
  }
}
test();
