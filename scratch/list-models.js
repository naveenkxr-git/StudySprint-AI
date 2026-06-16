const fs = require('fs');
const path = require('path');

// Manually parse .env.local
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

if (!apiKey) {
  console.error("GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

async function listModels() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("API error:", res.status, res.statusText);
      const text = await res.text();
      console.error(text);
      return;
    }
    const data = await res.json();
    console.log("Available models:");
    data.models.forEach(m => {
      if (m.supportedGenerationMethods.includes('embedContent')) {
        console.log(`- ${m.name} (${m.displayName}) [embedContent]`);
      } else {
        console.log(`- ${m.name} (${m.displayName})`);
      }
    });
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

listModels();
