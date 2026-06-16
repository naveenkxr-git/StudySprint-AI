const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const index = content.indexOf('setWorker');
  if (index !== -1) {
    console.log("Found 'setWorker' at index:", index);
    console.log("Snippet:", content.substring(index - 50, index + 350));
  } else {
    console.log("'setWorker' not found.");
  }
}
