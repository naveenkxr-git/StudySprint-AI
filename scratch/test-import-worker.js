async function test() {
  try {
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    console.log("Dynamically imported pdf.worker.mjs successfully!", Object.keys(worker));
  } catch (err) {
    console.error("Failed to dynamically import pdf.worker.mjs:", err);
  }

  try {
    const pdfjs = await import('pdfjs-dist');
    console.log("Dynamically imported pdfjs-dist successfully!", Object.keys(pdfjs));
  } catch (err) {
    console.error("Failed to dynamically import pdfjs-dist:", err);
  }
}

test();
