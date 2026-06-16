import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateLearningKit } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if learning kit already exists
    const { data: existingKit } = await supabaseAdmin
      .from('learning_kits')
      .select('*')
      .eq('document_id', documentId)
      .maybeSingle();

    if (existingKit) {
      return NextResponse.json({ success: true, data: existingKit });
    }

    // Fetch all chunks for this document
    const { data: chunks, error: fetchError } = await supabaseAdmin
      .from('document_chunks')
      .select('content')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    if (fetchError || !chunks || chunks.length === 0) {
      return NextResponse.json({ error: 'Failed to retrieve document content or no content found' }, { status: 404 });
    }

    // Combine chunks up to ~15,000 characters to prevent token overflow and keep response fast
    let fullText = '';
    for (const chunk of chunks) {
      if (fullText.length + chunk.content.length > 25000) break;
      fullText += chunk.content + '\n';
    }

    // Generate learning kit (summary and key concepts) using Gemini
    const kitData = await generateLearningKit(fullText);

    // Save to DB
    const { data: newKit, error: insertError } = await supabaseAdmin
      .from('learning_kits')
      .insert({
        document_id: documentId,
        summary: kitData.summary,
        key_concepts: kitData.keyConcepts
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting learning kit:', insertError);
      return NextResponse.json({ error: 'Failed to save learning kit' }, { status: 500 });
    }

    // Update readiness score / analytics for the user
    // A new learning kit adds to user progress!
    return NextResponse.json({ success: true, data: newKit });
  } catch (error: any) {
    console.error('Error in generate-kit:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
