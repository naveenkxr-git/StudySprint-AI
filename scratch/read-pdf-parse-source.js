const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log("File size:", content.length);
  // Find all require calls
  const requires = content.match(/require\(['"][^'"]+['"]\)/g);
  console.log("Requires in cjs/index.cjs:", requires);
} else {
  console.log("File not found:", filePath);
}
