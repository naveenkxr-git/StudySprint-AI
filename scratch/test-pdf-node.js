const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log("Trying to import PDFParse from 'pdf-parse/node'...");
    const { PDFParse } = require('pdf-parse/node');
    console.log("Success! PDFParse imported:", PDFParse);

    // Create a dummy PDF buffer or just read the first file in scratch if any
    const buffer = Buffer.from('%PDF-1.5 ...'); 
    console.log("Instantiating PDFParse...");
    const parser = new PDFParse({ data: buffer });
    console.log("Loading...");
    await parser.load();
    console.log("Success! Loaded successfully.");
  } catch (err) {
    console.error("Error with 'pdf-parse/node':", err);
  }

  try {
    console.log("\nTrying to import PDFParse from 'pdf-parse'...");
    const { PDFParse } = require('pdf-parse');
    console.log("Success! PDFParse imported:", PDFParse);

    const buffer = Buffer.from('%PDF-1.5 ...'); 
    console.log("Instantiating PDFParse...");
    const parser = new PDFParse({ data: buffer });
    console.log("Loading...");
    await parser.load();
    console.log("Success! Loaded successfully.");
  } catch (err) {
    console.error("Error with 'pdf-parse':", err);
  }
}

main();
