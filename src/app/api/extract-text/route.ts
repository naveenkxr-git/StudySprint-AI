import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/gemini';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

function chunkText(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    currentChunk.push(word);
    currentLength += word.length + 1; // +1 for space
    if (currentLength >= maxChunkSize) {
      chunks.push(currentChunk.join(' '));
      // keep some overlap by taking the last N words (approx 6 chars per word)
      const overlapCount = Math.max(2, Math.floor(overlap / 6));
      const overlapWords = currentChunk.slice(-overlapCount);
      currentChunk = [...overlapWords];
      currentLength = currentChunk.join(' ').length;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  return chunks.filter(c => c.trim().length > 10);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentId, filePath, fileType } = body;

    if (!documentId || !filePath || !fileType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('documents')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      await supabaseAdmin
        .from('documents')
        .update({ status: 'error' })
        .eq('id', documentId);
      return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 });
    }

    // Update status to processing
    await supabaseAdmin
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // 2. Extract text and page count
    let text = '';
    let numPages = 1;
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (fileType === 'pdf') {
      try {
        const parser = new PDFParse({ data: buffer });
        const info = await parser.getInfo({ parsePageInfo: true });
        numPages = info.total || 1;
        const result = await parser.getText();
        text = result.text;
        await parser.destroy();
      } catch (err) {
        console.error('Error parsing PDF:', err);
        throw new Error('Failed to parse PDF file');
      }
    } else if (fileType === 'docx') {
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        // Estimate pages from word count (roughly 300 words per page)
        const wordCount = text.split(/\s+/).length;
        numPages = Math.max(1, Math.ceil(wordCount / 300));
      } catch (err) {
        console.error('Error parsing DOCX:', err);
        throw new Error('Failed to parse DOCX file');
      }
    } else if (fileType === 'txt') {
      text = new TextDecoder('utf-8').decode(buffer);
      // Estimate pages from word count
      const wordCount = text.split(/\s+/).length;
      numPages = Math.max(1, Math.ceil(wordCount / 300));
    } else {
      throw new Error('Unsupported file type: ' + fileType);
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in the document.');
    }

    // Update document page count and state in DB
    await supabaseAdmin
      .from('documents')
      .update({ num_pages: numPages })
      .eq('id', documentId);

    // 3. Chunk text
    const chunks = chunkText(text);

    // 4. Generate embeddings and save chunks in batches
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const insertData = [];

      for (let j = 0; j < batch.length; j++) {
        const chunkContent = batch[j];
        const embedding = await generateEmbedding(chunkContent);
        
        insertData.push({
          document_id: documentId,
          chunk_index: i + j,
          content: chunkContent,
          embedding: embedding
        });
      }

      const { error: insertError } = await supabaseAdmin
        .from('document_chunks')
        .insert(insertData);

      if (insertError) {
        console.error('Error inserting document chunks:', insertError);
        throw new Error('Failed to store document embeddings');
      }
    }

    // 5. Update status to completed
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document status:', updateError);
      throw new Error('Failed to mark document as completed');
    }

    return NextResponse.json({ success: true, pages: numPages, chunks: chunks.length });
  } catch (error: any) {
    console.error('Text extraction pipeline error:', error);
    const supabaseAdmin = getSupabaseAdmin();
    // try to mark as error if we have a documentId
    try {
      const body = await req.json().catch(() => ({}));
      if (body.documentId) {
        await supabaseAdmin
          .from('documents')
          .update({ status: 'error' })
          .eq('id', body.documentId);
      }
    } catch (_) {}

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
