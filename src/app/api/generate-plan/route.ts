import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateStudyPlan } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId, examDate, dailyHours, priorityTopics, documentId } = await req.json();

    if (!userId || !examDate || !dailyHours || !priorityTopics) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    let contentContext = '';
    if (documentId) {
      // Fetch some text context of the document to align the study plan
      const { data: chunks } = await supabaseAdmin
        .from('document_chunks')
        .select('content')
        .eq('document_id', documentId)
        .order('chunk_index', { ascending: true })
        .limit(5);

      if (chunks && chunks.length > 0) {
        contentContext = chunks.map(c => c.content).join('\n');
      }
    }

    // Generate study plan from Gemini
    const schedule = await generateStudyPlan({
      examDate,
      dailyHours: parseFloat(dailyHours),
      priorityTopics,
      contentContext: contentContext || undefined
    });

    // Save to DB
    const { data: newPlan, error: insertError } = await supabaseAdmin
      .from('study_plans')
      .insert({
        user_id: userId,
        title: `Study Plan for ${examDate}`,
        exam_date: examDate,
        daily_hours: parseFloat(dailyHours),
        priority_topics: priorityTopics,
        schedule: schedule
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting study plan:', insertError);
      return NextResponse.json({ error: 'Failed to save study plan' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newPlan });
  } catch (error: any) {
    console.error('Error in generate-plan:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
