const { createClient } = require('@supabase/supabase-js');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (parts) {
        const key = parts[1];
        let val = parts[2] || '';
        // Remove quotes if present
        if (val.length > 0 && val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
          val = val.substring(1, val.length - 1);
        }
        if (val.length > 0 && val.charAt(0) === "'" && val.charAt(val.length - 1) === "'") {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.error("Failed to parse .env.local:", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  try {
    console.log("Connecting to Supabase at:", supabaseUrl);
    
    // Fetch latest document
    const { data: docs, error: fetchErr } = await supabaseAdmin
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.error("Failed to fetch documents from DB:", fetchErr);
      return;
    }

    if (!docs || docs.length === 0) {
      console.log("No documents found in 'documents' table. Please upload one first.");
      return;
    }

    const doc = docs[0];
    console.log("Found document:", doc.name, "(ID:", doc.id, "Path:", doc.file_path, "Type:", doc.file_type, ")");

    console.log("Downloading file from storage bucket 'documents'...");
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError) {
      console.error("Download failed:", downloadError);
      return;
    }

    console.log("Download succeeded. File size:", fileData.size, "bytes");

    const buffer = Buffer.from(await fileData.arrayBuffer());
    let text = '';
    
    if (doc.file_type === 'pdf') {
      console.log("Parsing PDF using PDFParse...");
      try {
        const parser = new PDFParse({ data: buffer });
        const info = await parser.getInfo({ parsePageInfo: true });
        console.log("PDF Pages:", info.total);
        const result = await parser.getText();
        text = result.text;
        await parser.destroy();
        console.log("PDF parsed successfully. Length:", text.length);
      } catch (err) {
        console.error("PDF Parse error:", err);
      }
    } else if (doc.file_type === 'docx') {
      console.log("Parsing DOCX using mammoth...");
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        console.log("DOCX parsed successfully. Length:", text.length);
      } catch (err) {
        console.error("DOCX Parse error:", err);
      }
    } else {
      text = new TextDecoder('utf-8').decode(buffer);
      console.log("TXT parsed successfully. Length:", text.length);
    }

    if (!text || text.trim().length === 0) {
      console.error("No text could be extracted!");
      return;
    }

    console.log("Initializing Gemini API with key:", apiKey ? "Configured" : "MISSING");
    if (!apiKey) return;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    console.log("Testing embedding generation for first 100 chars...");
    const result = await model.embedContent(text.substring(0, 100));
    console.log("Embedding generated successfully! Vector size:", result.embedding.values.length);

  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

main();
