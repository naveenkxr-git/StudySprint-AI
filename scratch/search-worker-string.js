const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const index = content.indexOf('pdf.worker');
  if (index !== -1) {
    console.log("Found 'pdf.worker' at index:", index);
    console.log("Snippet:", content.substring(index - 100, index + 200));
  } else {
    console.log("'pdf.worker' not found.");
  }
}
