const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (parts && parts[1] === 'GEMINI_API_KEY') {
      apiKey = (parts[2] || '').trim().replace(/^["']|["']$/g, '');
    }
  }
}

async function testConfig(modelName, config) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text: "Hello world" }] },
      ...config
    });
    console.log(`Model: ${modelName} with config ${JSON.stringify(config)} -> Vector length: ${result.embedding.values.length}`);
  } catch (err) {
    console.error(`Model: ${modelName} with config ${JSON.stringify(config)} -> Error: ${err.message}`);
  }
}

async function main() {
  await testConfig("gemini-embedding-001", { outputDimensionality: 768 });
}

main();
