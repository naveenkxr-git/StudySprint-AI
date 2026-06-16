import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateEmbedding, answerTutorQuestion } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { documentId, userId, message, history = [] } = await req.json();

    if (!documentId || !userId || !message) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Generate embedding for the user's question
    const queryEmbedding = await generateEmbedding(message);

    // 2. Query Supabase pgvector using the match_document_chunks function
    const { data: matchedChunks, error: matchError } = await supabaseAdmin.rpc(
      'match_document_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.3, // Match minimum threshold
        match_count: 5,        // Top 5 most relevant chunks
        filter_document_id: documentId
      }
    );

    if (matchError) {
      console.error('Error during vector search:', matchError);
      return NextResponse.json({ error: 'Vector search failed' }, { status: 500 });
    }

    // 3. Extract text from matched chunks
    const contextChunks = (matchedChunks || []).map((chunk: any) => chunk.content);

    // If no context is found, notify
    const sources = (matchedChunks || []).map((chunk: any) => ({
      id: chunk.id,
      content: chunk.content,
      similarity: chunk.similarity
    }));

    // 4. Format chat history for Gemini's API structure: { role: 'user' | 'model', parts: [{ text: string }] }
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // 5. Ask Gemini
    const answer = await answerTutorQuestion(contextChunks, formattedHistory, message);

    // 6. Save or update chat history in the DB
    const newHistoryEntry = [
      ...history,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: answer, references: contextChunks, timestamp: new Date().toISOString() }
    ];

    // Check if chat session already exists for this user/doc
    const { data: existingChat } = await supabaseAdmin
      .from('tutor_chats')
      .select('id')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingChat) {
      // Update existing chat history
      await supabaseAdmin
        .from('tutor_chats')
        .update({ messages: newHistoryEntry })
        .eq('id', existingChat.id);
    } else {
      // Create new chat session
      await supabaseAdmin
        .from('tutor_chats')
        .insert({
          document_id: documentId,
          user_id: userId,
          messages: newHistoryEntry
        });
    }

    // Also update user analytics for active learning
    // Fetch user analytics and update or insert
    const { data: userAnalytics } = await supabaseAdmin
      .from('analytics')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (userAnalytics) {
      // Increment time spent or update activity
      const timeSpentIncrement = 120; // assumed 2 minutes per chat interaction
      await supabaseAdmin
        .from('analytics')
        .update({
          total_time_spent: userAnalytics.total_time_spent + timeSpentIncrement,
          last_active: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', userId);
    }

    return NextResponse.json({ success: true, answer, sources });
  } catch (error: any) {
    console.error('Error in tutor endpoint:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
