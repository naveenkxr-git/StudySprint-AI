"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Plus, 
  X, 
  Sparkles, 
  Loader2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StudyPlanItem {
  date: string;
  topic: string;
  duration: number;
  type: 'study' | 'revision' | 'mock_test';
  tasks: string[];
  completed?: boolean;
}

interface StudyPlan {
  id: string;
  title: string;
  exam_date: string;
  daily_hours: number;
  priority_topics: string[];
  schedule: StudyPlanItem[];
}

export default function PlannerPage() {
  const router = useRouter();
  const [examDate, setExamDate] = useState('');
  const [dailyHours, setDailyHours] = useState('2');
  const [topicInput, setTopicInput] = useState('');
  const [priorityTopics, setPriorityTopics] = useState<string[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const demoSession = localStorage.getItem('sb-demo-session');
      if (demoSession) {
        setIsDemo(true);
        const savedPlan = localStorage.getItem('demo-study-plan');
        if (savedPlan) {
          setStudyPlan(JSON.parse(savedPlan));
        }
        setUserId(JSON.parse(demoSession).user.id);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }
        setUserId(session.user.id);
        const { data } = await supabase
          .from('study_plans')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setStudyPlan(data[0]);
        }
      }
      setLoading(false);
    };
    init();
  }, [router]);

  const addTopic = () => {
    if (topicInput.trim() && !priorityTopics.includes(topicInput.trim())) {
      setPriorityTopics([...priorityTopics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const removeTopic = (topic: string) => {
    setPriorityTopics(priorityTopics.filter(t => t !== topic));
  };

  const handleGeneratePlan = async () => {
    if (!examDate || !dailyHours || priorityTopics.length === 0 || !userId) {
      alert('Please fill out all the fields and add at least one topic.');
      return;
    }

    setGenerating(true);

    if (isDemo) {
      setTimeout(() => {
        // Generate mock schedule based on target date
        const today = new Date();
        const target = new Date(examDate);
        const diffTime = Math.abs(target.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysToSchedule = Math.min(Math.max(diffDays, 3), 14); // plan up to 2 weeks

        const schedule: StudyPlanItem[] = [];
        for (let i = 0; i < daysToSchedule; i++) {
          const date = new Date();
          date.setDate(today.getDate() + i);
          const topic = priorityTopics[i % priorityTopics.length];
          const isMock = i === daysToSchedule - 1;
          const isRevision = i > 0 && i % 3 === 0;

          schedule.push({
            date: date.toISOString().split('T')[0],
            topic: isMock ? "Practice Mock Exam" : isRevision ? `Review: ${topic}` : `Core Concepts of ${topic}`,
            duration: Number(dailyHours),
            type: isMock ? 'mock_test' : isRevision ? 'revision' : 'study',
            tasks: isMock 
              ? ["Take full-length simulated exam", "Review weak points in answers"]
              : ["Study theory & lecture slides", "Solve 10 textbook exercises"],
            completed: false
          });
        }

        const mockPlan: StudyPlan = {
          id: 'demo-plan-999',
          title: `Study Plan for ${examDate}`,
          exam_date: examDate,
          daily_hours: Number(dailyHours),
          priority_topics: priorityTopics,
          schedule
        };

        localStorage.setItem('demo-study-plan', JSON.stringify(mockPlan));
        setStudyPlan(mockPlan);
        setGenerating(false);
      }, 2000);
      return;
    }

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          examDate,
          dailyHours: Number(dailyHours),
          priorityTopics
        })
      });

      const result = await response.json();
      if (result.success) {
        setStudyPlan(result.data);
      } else {
        alert(result.error || 'Failed to generate study plan');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to planner service');
    } finally {
      setGenerating(false);
    }
  };

  const toggleTaskCompletion = async (dayIndex: number) => {
    if (!studyPlan) return;

    const updatedSchedule = [...studyPlan.schedule];
    updatedSchedule[dayIndex] = {
      ...updatedSchedule[dayIndex],
      completed: !updatedSchedule[dayIndex].completed
    };

    const updatedPlan = { ...studyPlan, schedule: updatedSchedule };
    setStudyPlan(updatedPlan);

    if (isDemo) {
      localStorage.setItem('demo-study-plan', JSON.stringify(updatedPlan));
      return;
    }

    try {
      await supabase
        .from('study_plans')
        .update({ schedule: updatedSchedule })
        .eq('id', studyPlan.id);
    } catch (err) {
      console.error('Failed to update study plan:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-white">AI Study Planner</h1>
        <p className="text-zinc-400">Structure your schedule, stay on top of topics, and track exam readiness.</p>
      </div>

      {!studyPlan ? (
        <Card className="glass-card max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-400" /> Create Your Custom Study Plan
            </CardTitle>
            <CardDescription>Enter your exam parameters to generate a targeted schedule.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Exam Date</label>
                <Input 
                  type="date" 
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Daily Study Hours</label>
                <Input 
                  type="number" 
                  min="0.5" 
                  max="12" 
                  step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Priority Topics to Study</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. TCP/IP Protocols, Neural Networks..." 
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTopic();
                    }
                  }}
                />
                <Button onClick={addTopic} variant="secondary">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2">
                {priorityTopics.map((topic) => (
                  <span 
                    key={topic} 
                    className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full"
                  >
                    {topic}
                    <button onClick={() => removeTopic(topic)} className="hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-12 text-base" 
              variant="gradient"
              onClick={handleGeneratePlan}
              disabled={generating || priorityTopics.length === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Drafting your schedule...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" /> Generate Study Plan
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Plan Summary */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Plan Summary</CardTitle>
                <CardDescription>Targeting: {studyPlan.exam_date}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-zinc-400">Daily Goal</span>
                  <span className="text-sm font-semibold">{studyPlan.daily_hours} hrs</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-zinc-400">Total days planned</span>
                  <span className="text-sm font-semibold">{studyPlan.schedule.length} days</span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-zinc-400">Covered Topics:</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {studyPlan.priority_topics.map((t) => (
                      <span key={t} className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-zinc-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full border-red-500/20 text-red-400 hover:bg-red-500/5 hover:text-red-300"
                  onClick={() => {
                    if (confirm("Are you sure you want to reset this study plan?")) {
                      if (isDemo) {
                        localStorage.removeItem('demo-study-plan');
                      } else {
                        supabase.from('study_plans').delete().eq('id', studyPlan.id).then(() => {});
                      }
                      setStudyPlan(null);
                    }
                  }}
                >
                  Reset & Create New
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Daily Schedule */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold">Your Learning Roadmap</h3>
            <div className="space-y-3">
              {studyPlan.schedule.map((day, idx) => (
                <div 
                  key={idx} 
                  className={`p-5 rounded-2xl border transition-all ${
                    day.completed 
                      ? 'bg-emerald-950/20 border-emerald-500/20 opacity-80' 
                      : 'bg-zinc-900/40 border-white/5 hover:border-indigo-500/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-400">{day.date}</span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          day.type === 'mock_test' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          day.type === 'revision' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {day.type.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className={`text-base font-semibold ${day.completed ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {day.topic}
                      </h4>
                    </div>

                    <Button 
                      size="sm"
                      variant={day.completed ? "default" : "outline"} 
                      onClick={() => toggleTaskCompletion(idx)}
                      className={day.completed ? "bg-emerald-600 hover:bg-emerald-700 shadow-none" : ""}
                    >
                      {day.completed ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-white mr-1" /> Done
                        </>
                      ) : (
                        "Mark Done"
                      )}
                    </Button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
                      <Clock className="h-3.5 w-3.5" /> Est. study duration: {day.duration} hours
                    </div>
                    <ul className="space-y-1 text-sm text-zinc-300">
                      {day.tasks.map((task, tidx) => (
                        <li key={tidx} className="flex gap-2 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className={day.completed ? 'line-through text-zinc-500' : ''}>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
