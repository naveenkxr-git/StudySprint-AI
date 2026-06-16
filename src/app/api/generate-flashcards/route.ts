import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateFlashcards } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { documentId, count = 30 } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if flashcards already exist
    const { data: existingFlashcards } = await supabaseAdmin
      .from('flashcards')
      .select('*')
      .eq('document_id', documentId);

    if (existingFlashcards && existingFlashcards.length > 0) {
      return NextResponse.json({ success: true, data: existingFlashcards });
    }

    // Fetch chunks to extract text from
    const { data: chunks, error: fetchError } = await supabaseAdmin
      .from('document_chunks')
      .select('content')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    if (fetchError || !chunks || chunks.length === 0) {
      return NextResponse.json({ error: 'Failed to retrieve document content' }, { status: 404 });
    }

    let fullText = '';
    for (const chunk of chunks) {
      if (fullText.length + chunk.content.length > 25000) break;
      fullText += chunk.content + '\n';
    }

    // Generate from Gemini
    const flashcardsData = await generateFlashcards(fullText, count);

    // Prepare inserts
    const insertData = flashcardsData.map((card: any) => ({
      document_id: documentId,
      front: card.front || card.question || '',
      back: card.back || card.answer || '',
      completed: false
    })).filter((card: any) => card.front && card.back);

    if (insertData.length === 0) {
      throw new Error('Failed to generate valid flashcard data.');
    }

    // Save to DB
    const { data: newFlashcards, error: insertError } = await supabaseAdmin
      .from('flashcards')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('Error inserting flashcards:', insertError);
      return NextResponse.json({ error: 'Failed to save flashcards' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newFlashcards });
  } catch (error: any) {
    console.error('Error in generate-flashcards:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
