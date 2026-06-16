"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Brain, 
  BookOpen, 
  Calendar, 
  Sparkles, 
  Upload, 
  MessageSquare, 
  Award,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    documents: 0,
    flashcards: 0,
    quizzes: 0,
    studyPlans: 0,
    readinessScore: 0,
    strongTopics: [] as string[],
    weakTopics: [] as string[]
  });
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // 1. Check if we are in demo mode
      const demoSessionStr = localStorage.getItem('sb-demo-session');
      if (demoSessionStr) {
        const parsed = JSON.parse(demoSessionStr);
        setUser(parsed.user);
        setIsDemo(true);
        // Set mock stats for demonstration
        setStats({
          documents: 3,
          flashcards: 45,
          quizzes: 8,
          studyPlans: 1,
          readinessScore: 82,
          strongTopics: ['Data structures', 'TCP/IP networking'],
          weakTopics: ['OS memory management', 'Regular expressions']
        });
        setLoading(false);
        return;
      }

      // 2. Otherwise load actual Supabase user & stats
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      setUser(session.user);

      try {
        const uId = session.user.id;
        
        // Fetch counts
        const [docsRes, flashRes, quizRes, planRes, analyticRes] = await Promise.all([
          supabase.from('documents').select('id', { count: 'exact' }).eq('user_id', uId),
          supabase.from('documents').select('id').eq('user_id', uId), // to get flashcards next
          supabase.from('quiz_attempts').select('id', { count: 'exact' }).eq('user_id', uId),
          supabase.from('study_plans').select('id', { count: 'exact' }).eq('user_id', uId),
          supabase.from('analytics').select('*').eq('user_id', uId).maybeSingle()
        ]);

        let totalFlashcards = 0;
        if (docsRes.data && docsRes.data.length > 0) {
          const docIds = docsRes.data.map(d => d.id);
          const { count } = await supabase
            .from('flashcards')
            .select('id', { count: 'exact' })
            .in('document_id', docIds);
          totalFlashcards = count || 0;
        }

        setStats({
          documents: docsRes.count || 0,
          flashcards: totalFlashcards,
          quizzes: quizRes.count || 0,
          studyPlans: planRes.count || 0,
          readinessScore: analyticRes.data?.readiness_score || 0,
          strongTopics: analyticRes.data?.strong_topics || [],
          weakTopics: analyticRes.data?.weak_topics || []
        });

      } catch (err) {
        console.error("Error loading stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-zinc-400">Loading your space...</span>
      </div>
    );
  }

  const welcomeName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            Welcome back, {welcomeName}! <Sparkles className="h-6 w-6 text-indigo-400" />
          </h1>
          <p className="text-zinc-400">Here is your learning summary for today. Keep the streak going!</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-zinc-400">Uploaded Docs</span>
            <FileText className="h-5 w-5 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.documents}</div>
            <p className="text-xs text-zinc-500 mt-1">Files uploaded so far</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-zinc-400">Flashcards</span>
            <Brain className="h-5 w-5 text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.flashcards}</div>
            <p className="text-xs text-zinc-500 mt-1">AI-generated flashcards</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-zinc-400">Quizzes Completed</span>
            <BookOpen className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.quizzes}</div>
            <p className="text-xs text-zinc-500 mt-1">Tests completed</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-zinc-400">Study Plans</span>
            <Calendar className="h-5 w-5 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.studyPlans}</div>
            <p className="text-xs text-zinc-500 mt-1">Schedules generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Readiness + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Readiness Card */}
        <Card className="glass-card lg:col-span-2 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Award className="h-32 w-32 text-indigo-500" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-400" /> Exam Readiness
            </CardTitle>
            <CardDescription>Estimated based on recent performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative flex items-center justify-center">
                {/* SVG circular progress */}
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle cx="56" cy="56" r="48" className="stroke-zinc-800" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="56" 
                    cy="56" 
                    r="48" 
                    className="stroke-indigo-500 transition-all duration-1000" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * stats.readinessScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-2xl font-bold">{stats.readinessScore}%</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg">You are doing great!</h3>
                <p className="text-sm text-zinc-400">Complete more quizzes and flashcards to power up your readiness.</p>
              </div>
            </div>

            {/* Strength and Weakness areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">Strong Topics</h4>
                {stats.strongTopics.length > 0 ? (
                  <ul className="space-y-1">
                    {stats.strongTopics.map((t, idx) => (
                      <li key={idx} className="text-sm flex items-center gap-1.5 text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No data yet. Take a quiz!</p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-pink-400 mb-2">Needs Improvement</h4>
                {stats.weakTopics.length > 0 ? (
                  <ul className="space-y-1">
                    {stats.weakTopics.map((t, idx) => (
                      <li key={idx} className="text-sm flex items-center gap-1.5 text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400" /> {t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No data yet. Take a quiz!</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
            <CardDescription>What would you like to study today?</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link href="/dashboard/documents" className="w-full">
              <Button className="w-full justify-start gap-3 h-12" variant="outline">
                <Upload className="h-5 w-5 text-indigo-400" />
                <span>Upload Study Materials</span>
              </Button>
            </Link>

            <Link href="/dashboard/kits" className="w-full">
              <Button className="w-full justify-start gap-3 h-12" variant="outline">
                <Layers className="h-5 w-5 text-pink-400" />
                <span>Generate Learning Kit</span>
              </Button>
            </Link>

            <Link href="/dashboard/tutor" className="w-full">
              <Button className="w-full justify-start gap-3 h-12" variant="outline">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
                <span>Ask the AI Tutor</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Activity feed or Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-violet-400" /> Active Study Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <h5 className="font-semibold text-sm text-indigo-300">Spaced Repetition works!</h5>
              <p className="text-xs text-zinc-400 mt-1">Reviewing flashcards multiple times per week strengthens retrieval, meaning you'll remember key concepts longer.</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <h5 className="font-semibold text-sm text-emerald-300">Test before you rest</h5>
              <p className="text-xs text-zinc-400 mt-1">Taking a practice quiz after reading can increase comprehension by up to 30%. Generate a custom quiz for your current module now.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-pink-400" /> Study Streak
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-500">
                5 Days
              </div>
              <p className="text-sm text-zinc-400 mt-1">Keep it up! Your daily streak multiplier increases.</p>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                  ✓
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-500">
                T
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
