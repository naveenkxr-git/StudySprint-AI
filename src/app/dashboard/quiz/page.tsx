"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  ArrowLeft,
  ChevronRight, 
  Clock, 
  Award, 
  CheckCircle2, 
  XCircle,
  HelpCircle
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  file_path: string;
  status: string;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  document_id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Question[];
}

interface Attempt {
  id: string;
  score: number;
  total_questions: number;
  accuracy: number;
  time_spent: number;
  created_at: string;
}

export default function QuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docIdParam = searchParams.get('docId');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(docIdParam);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  
  // Game states
  const [quizActive, setQuizActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load documents
  useEffect(() => {
    const init = async () => {
      const demoSession = localStorage.getItem('sb-demo-session');
      if (demoSession) {
        setIsDemo(true);
        const savedDocs = localStorage.getItem('demo-documents');
        if (savedDocs) {
          const list = JSON.parse(savedDocs).filter((d: any) => d.status === 'completed');
          setDocuments(list);
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
          .from('documents')
          .select('id, name, file_path, status')
          .eq('user_id', session.user.id)
          .eq('status', 'completed');
        setDocuments(data || []);
      }
      setLoading(false);
    };
    init();
  }, [router]);

  // Load quiz and attempts for selected document & difficulty
  useEffect(() => {
    if (!selectedDocId) return;

    const loadQuizAndAttempts = async () => {
      setLoading(true);
      if (isDemo) {
        setTimeout(() => {
          const storedQuiz = localStorage.getItem(`demo-quiz-${selectedDocId}-${difficulty}`);
          if (storedQuiz) {
            setQuiz(JSON.parse(storedQuiz));
          } else {
            setQuiz(null);
          }
          const storedAttempts = localStorage.getItem(`demo-attempts-${selectedDocId}`);
          setAttempts(storedAttempts ? JSON.parse(storedAttempts) : []);
          setLoading(false);
        }, 500);
        return;
      }

      try {
        const { data: quizData } = await supabase
          .from('quizzes')
          .select('*')
          .eq('document_id', selectedDocId)
          .eq('difficulty', difficulty)
          .maybeSingle();

        setQuiz(quizData);

        if (quizData) {
          const { data: attemptsData } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('quiz_id', quizData.id)
            .order('created_at', { ascending: false });
          setAttempts(attemptsData || []);
        } else {
          setAttempts([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadQuizAndAttempts();
  }, [selectedDocId, difficulty, isDemo]);

  // Start Timer when quiz starts
  useEffect(() => {
    if (quizActive && !quizFinished) {
      timerRef.current = setInterval(() => {
        setTimeSpent((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizActive, quizFinished]);

  // Generate Quiz
  const handleGenerateQuiz = async () => {
    if (!selectedDocId) return;
    setGenerating(true);

    if (isDemo) {
      setTimeout(() => {
        const demoQuiz: Quiz = {
          id: 'demo-quiz-123',
          document_id: selectedDocId,
          title: `Quiz: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} level`,
          difficulty: difficulty,
          questions: [
            {
              question: "What primary mechanism does TCP use to avoid network congestion?",
              options: ["TCP Congestion Window (cwnd) adjustments", "Routing protocol selection", "Static port blocking", "DNS query throttling"],
              correctAnswer: 0,
              explanation: "TCP dynamically adjusts the congestion window size (cwnd) in response to network congestion cues such as packet drops and RTT increases."
            },
            {
              question: "Which of the following describes the TCP 3-way handshake process?",
              options: ["SYN -> ACK -> SYN-ACK", "SYN -> SYN-ACK -> ACK", "ACK -> SYN -> SYN-ACK", "SYN -> ACK -> FIN"],
              correctAnswer: 1,
              explanation: "The correct sequence to establish a TCP connection is a SYN packet, followed by a SYN-ACK packet, and finally an ACK packet."
            },
            {
              question: "What best describes the role of a DNS Resolver?",
              options: ["It encrypts network packets for security.", "It maps human-readable domain names to IP addresses.", "It routes IP packets between networks.", "It establishes TCP handshakes."],
              correctAnswer: 1,
              explanation: "The Domain Name System (DNS) resolver translates human-friendly URLs like 'google.com' into numeric IP addresses that computer systems use to route data."
            }
          ]
        };
        localStorage.setItem(`demo-quiz-${selectedDocId}-${difficulty}`, JSON.stringify(demoQuiz));
        setQuiz(demoQuiz);
        setGenerating(false);
      }, 2000);
      return;
    }

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDocId, difficulty })
      });

      const result = await response.json();
      if (result.success) {
        setQuiz(result.data);
      } else {
        alert(result.error || 'Failed to generate quiz');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to quiz generation service');
    } finally {
      setGenerating(false);
    }
  };

  const startQuiz = () => {
    setQuizActive(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowExplanation(false);
    setTimeSpent(0);
    setQuizFinished(false);
  };

  const selectAnswer = (optionIndex: number) => {
    if (showExplanation) return; // Can't change after submitting
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: optionIndex
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizFinished(true);
    if (!quiz) return;

    let score = 0;
    quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });

    const accuracy = Math.round((score / quiz.questions.length) * 100);

    const newAttempt: Attempt = {
      id: 'attempt-' + Date.now(),
      score,
      total_questions: quiz.questions.length,
      accuracy,
      time_spent: timeSpent,
      created_at: new Date().toISOString()
    };

    if (isDemo) {
      const updatedAttempts = [newAttempt, ...attempts];
      setAttempts(updatedAttempts);
      localStorage.setItem(`demo-attempts-${selectedDocId}`, JSON.stringify(updatedAttempts));
      
      // Update global readiness
      const currentDemoSession = JSON.parse(localStorage.getItem('sb-demo-session') || '{}');
      if (currentDemoSession.user) {
        localStorage.setItem('sb-demo-session', JSON.stringify({
          ...currentDemoSession,
          stats: {
            ...currentDemoSession.stats,
            readinessScore: Math.round((82 + accuracy) / 2) // average out
          }
        }));
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          user_id: userId,
          score,
          total_questions: quiz.questions.length,
          accuracy,
          time_spent: timeSpent
        });
      if (error) throw error;
      setAttempts(prev => [newAttempt, ...prev]);

      // Trigger analytics updates (update average readiness)
      // Done server side or via DB triggers usually
    } catch (err) {
      console.error('Error saving quiz attempt:', err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Selection list if no document active
  if (!selectedDocId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Quiz Generator</h1>
          <p className="text-zinc-400">Challenge your understanding by creating custom multiple-choice quizzes.</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Select a Document</CardTitle>
            <CardDescription>Choose one of the processed documents below:</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <p className="mb-4">No completed documents available for quizzes.</p>
                <Link href="/dashboard/documents">
                  <Button variant="gradient">Upload a Document</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className="flex w-full items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-white/5 text-left transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{doc.name}</div>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400">Select</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentDoc = documents.find(d => d.id === selectedDocId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2 text-zinc-400 hover:text-white" onClick={() => { setSelectedDocId(null); setQuiz(null); setQuizActive(false); }}>
          <ArrowLeft className="h-4 w-4" /> Back to Library
        </Button>
        <span className="text-sm font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full truncate max-w-xs md:max-w-md">
          {currentDoc ? currentDoc.name : 'Selected Document'}
        </span>
      </div>

      {/* Main Content Areas */}
      {!quizActive && !quizFinished && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configure and Start / Generate Quiz */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-indigo-400" /> 
                {quiz ? "Ready to Test?" : "Configure Quiz"}
              </CardTitle>
              <CardDescription>Select difficulty and generate custom multiple-choice questions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-300">Select Difficulty Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`py-3 px-4 rounded-xl border text-sm font-semibold capitalize transition-all ${
                        difficulty === level 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {quiz ? (
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-sm text-zinc-400">
                    <span>Questions: <strong>{quiz.questions.length}</strong></span>
                    <span>Difficulty: <strong className="capitalize">{quiz.difficulty}</strong></span>
                  </div>
                  <Button className="w-full h-12 text-base" variant="gradient" onClick={startQuiz}>
                    Start Quiz
                  </Button>
                </div>
              ) : (
                <div className="pt-4 border-t border-white/5">
                  <Button 
                    className="w-full h-12 text-base" 
                    variant="default" 
                    onClick={handleGenerateQuiz}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" /> Generate Quiz Now
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Attempts */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-pink-400" /> Past Attempts
              </CardTitle>
              <CardDescription>Your performance history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {attempts.length === 0 ? (
                <p className="text-sm text-zinc-500 italic text-center py-8">No attempts yet. Complete a quiz to view stats.</p>
              ) : (
                attempts.map((attempt) => (
                  <div key={attempt.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-white">Score: {attempt.score}/{attempt.total_questions}</div>
                      <div className="text-xs text-zinc-400">{new Date(attempt.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-indigo-400">{attempt.accuracy}%</div>
                      <div className="text-xs text-zinc-500">{formatTime(attempt.time_spent)}</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quiz Game Active */}
      {quizActive && quiz && !quizFinished && (
        <Card className="glass-card max-w-2xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base text-zinc-400">Question {currentQuestionIndex + 1} of {quiz.questions.length}</CardTitle>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-amber-400 font-mono">
              <Clock className="h-4 w-4" /> {formatTime(timeSpent)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Text */}
            <h2 className="text-lg md:text-xl font-medium text-white">
              {quiz.questions[currentQuestionIndex].question}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {quiz.questions[currentQuestionIndex].options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === idx;
                const isCorrect = idx === quiz.questions[currentQuestionIndex].correctAnswer;
                let btnStyle = "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10";

                if (showExplanation) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-500/20 border-emerald-500/40 text-emerald-400";
                  } else if (isSelected) {
                    btnStyle = "bg-red-500/20 border-red-500/40 text-red-400";
                  }
                } else if (isSelected) {
                  btnStyle = "bg-indigo-600/30 border-indigo-500 text-indigo-300";
                }

                return (
                  <button
                    key={idx}
                    disabled={showExplanation}
                    onClick={() => selectAnswer(idx)}
                    className={`w-full text-left p-4 rounded-xl border text-sm md:text-base font-medium transition-all ${btnStyle}`}
                  >
                    <span className="mr-3 font-semibold text-zinc-500">{['A', 'B', 'C', 'D'][idx]}.</span>
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Explanation box */}
            {showExplanation && (
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-sm space-y-2 animate-fade-in">
                <div className="font-semibold text-indigo-400">Explanation:</div>
                <div className="text-zinc-300">{quiz.questions[currentQuestionIndex].explanation}</div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between border-t border-white/5 pt-4">
            {!showExplanation ? (
              <Button 
                variant="gradient" 
                onClick={() => setShowExplanation(true)}
                disabled={selectedAnswers[currentQuestionIndex] === undefined}
              >
                Submit Answer
              </Button>
            ) : (
              <Button 
                variant="default"
                className="gap-1.5"
                onClick={handleNextQuestion}
              >
                {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish' : 'Next Question'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* Quiz Finished Screen */}
      {quizFinished && quiz && (
        <Card className="glass-card max-w-md mx-auto text-center py-12">
          <CardHeader className="items-center">
            <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
              <Award className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Quiz Completed!</CardTitle>
            <CardDescription>Awesome work completing the assessment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="text-xs text-zinc-400 font-semibold uppercase">Score</div>
                <div className="text-2xl font-extrabold text-white">
                  {Object.keys(selectedAnswers).reduce((acc, currentIdx) => {
                    const idx = Number(currentIdx);
                    return acc + (selectedAnswers[idx] === quiz.questions[idx].correctAnswer ? 1 : 0);
                  }, 0)} / {quiz.questions.length}
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="text-xs text-zinc-400 font-semibold uppercase">Time Spent</div>
                <div className="text-2xl font-extrabold text-white">{formatTime(timeSpent)}</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button variant="gradient" className="w-full" onClick={startQuiz}>
              Retry Quiz
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setQuizFinished(false)}>
              Back to Overview
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
