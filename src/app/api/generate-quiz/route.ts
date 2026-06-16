import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateQuiz } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { documentId, difficulty = 'medium' } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if a quiz with the same difficulty already exists for this document
    const { data: existingQuizzes } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('document_id', documentId)
      .eq('difficulty', difficulty);

    if (existingQuizzes && existingQuizzes.length > 0) {
      // Return the first one found
      return NextResponse.json({ success: true, data: existingQuizzes[0] });
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
    const quizQuestions = await generateQuiz(fullText, difficulty);

    // Save to DB
    const { data: newQuiz, error: insertError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        document_id: documentId,
        title: `Quiz on ${difficulty} level`,
        difficulty: difficulty,
        questions: quizQuestions
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting quiz:', insertError);
      return NextResponse.json({ error: 'Failed to save quiz' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newQuiz });
  } catch (error: any) {
    console.error('Error in generate-quiz:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
