"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Shuffle, 
  Check, 
  X, 
  Loader2, 
  Brain,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  file_path: string;
  status: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  completed: boolean;
}

export default function FlashcardsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docIdParam = searchParams.get('docId');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(docIdParam);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load documents list
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

  // Load flashcards for selected document
  useEffect(() => {
    if (!selectedDocId) return;

    const loadFlashcards = async () => {
      setLoading(true);
      if (isDemo) {
        setTimeout(() => {
          const stored = localStorage.getItem(`demo-flashcards-${selectedDocId}`);
          if (stored) {
            setFlashcards(JSON.parse(stored));
          } else {
            setFlashcards([]);
          }
          setCurrentIndex(0);
          setIsFlipped(false);
          setLoading(false);
        }, 600);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('flashcards')
          .select('*')
          .eq('document_id', selectedDocId);

        if (data) {
          setFlashcards(data);
        } else {
          setFlashcards([]);
        }
        setCurrentIndex(0);
        setIsFlipped(false);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadFlashcards();
  }, [selectedDocId, isDemo]);

  // Generate Flashcards via API
  const handleGenerate = async () => {
    if (!selectedDocId) return;
    setGenerating(true);

    if (isDemo) {
      setTimeout(() => {
        const demoData: Flashcard[] = [
          { id: '1', front: "What does TCP stand for?", back: "Transmission Control Protocol", completed: false },
          { id: '2', front: "What is the primary function of the Transport Layer?", back: "Ensures end-to-end communication, reliability, flow control, and multiplexing.", completed: false },
          { id: '3', front: "Explain the three-way handshake in TCP.", back: "It is the connection establishment protocol. Steps: 1. Active open (SYN) 2. Passive open & ACK (SYN-ACK) 3. Acknowledgment (ACK).", completed: false },
          { id: '4', front: "What is Congestion Window (cwnd)?", back: "A state variable maintained by the sender that limits the total volume of unacknowledged data in transit.", completed: false },
          { id: '5', front: "What is DNS?", back: "Domain Name System. It resolves human-readable domain names (e.g., google.com) to machine-readable IP addresses.", completed: false }
        ];
        localStorage.setItem(`demo-flashcards-${selectedDocId}`, JSON.stringify(demoData));
        setFlashcards(demoData);
        setGenerating(false);
      }, 2000);
      return;
    }

    try {
      const response = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDocId })
      });

      const result = await response.json();
      if (result.success) {
        setFlashcards(result.data);
      } else {
        alert(result.error || 'Failed to generate flashcards');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to flashcard generation service');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle flashcard flip
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Next card
  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  // Previous card
  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  // Shuffle deck
  const handleShuffle = () => {
    setIsFlipped(false);
    setTimeout(() => {
      const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
      setFlashcards(shuffled);
      setCurrentIndex(0);
    }, 150);
  };

  // Mark card as completed/mastered
  const toggleCompleted = async (index: number) => {
    const targetCard = flashcards[index];
    const newStatus = !targetCard.completed;

    // Update state first (optimistic)
    const updated = [...flashcards];
    updated[index] = { ...targetCard, completed: newStatus };
    setFlashcards(updated);

    if (isDemo) {
      localStorage.setItem(`demo-flashcards-${selectedDocId}`, JSON.stringify(updated));
      return;
    }

    try {
      await supabase
        .from('flashcards')
        .update({ completed: newStatus })
        .eq('id', targetCard.id);
    } catch (err) {
      console.error('Failed to update flashcard status:', err);
    }
  };

  const currentCard = flashcards[currentIndex];
  const masteredCount = flashcards.filter(c => c.completed).length;
  const progressPercent = flashcards.length > 0 ? Math.round((masteredCount / flashcards.length) * 100) : 0;

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
          <h1 className="text-3xl font-extrabold text-white">Smart Flashcards</h1>
          <p className="text-zinc-400">Select a document to view or generate interactive study flashcards.</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Select a Document</CardTitle>
            <CardDescription>Choose one of the processed documents below:</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <p className="mb-4">No completed documents available for flashcards.</p>
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
        <Button variant="ghost" className="gap-2 text-zinc-400 hover:text-white" onClick={() => setSelectedDocId(null)}>
          <ArrowLeft className="h-4 w-4" /> Back to Library
        </Button>
        <span className="text-sm font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full truncate max-w-xs md:max-w-md">
          {currentDoc ? currentDoc.name : 'Selected Document'}
        </span>
      </div>

      {flashcards.length === 0 ? (
        <Card className="glass-card text-center py-16">
          <CardHeader className="items-center">
            <div className="h-16 w-16 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 mb-4">
              <Brain className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Generate Flashcards</CardTitle>
            <CardDescription className="max-w-md">
              Create a deck of 20 to 50 targeted active recall cards instantly powered by AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="lg" 
              variant="gradient" 
              className="gap-2" 
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Creating Flashcards...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" /> Generate Deck
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-zinc-400 font-medium">
              <span>Card {currentIndex + 1} of {flashcards.length}</span>
              <span>{masteredCount} of {flashcards.length} Mastered ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentIndex + 1) / flashcards.length * 100}%` }}
              />
            </div>
          </div>

          {/* 3D Flashcard Container */}
          <div 
            onClick={handleFlip} 
            className="perspective-1000 w-full h-80 cursor-pointer"
          >
            <div 
              className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}
            >
              {/* Front Side */}
              <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-white/10 bg-zinc-900 flex flex-col justify-between p-8 shadow-2xl">
                <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Question</div>
                <div className="text-xl md:text-2xl text-center text-white font-medium my-auto overflow-y-auto max-h-48 pr-2">
                  {currentCard.front}
                </div>
                <div className="text-xs text-zinc-500 text-center select-none">Click/Tap to Flip</div>
              </div>

              {/* Back Side */}
              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border border-white/10 bg-zinc-950 flex flex-col justify-between p-8 shadow-2xl">
                <div className="text-xs text-pink-400 font-semibold uppercase tracking-wider">Answer</div>
                <div className="text-lg md:text-xl text-center text-zinc-200 font-normal my-auto overflow-y-auto max-h-48 pr-2">
                  {currentCard.back}
                </div>
                <div className="text-xs text-zinc-500 text-center select-none">Click/Tap to Flip back</div>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePrev}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <Button 
              variant={currentCard.completed ? "default" : "outline"}
              onClick={() => toggleCompleted(currentIndex)}
              className="flex items-center gap-2"
            >
              {currentCard.completed ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" /> Mastered
                </>
              ) : (
                <>
                  Mark Mastered
                </>
              )}
            </Button>

            <Button variant="outline" size="icon" onClick={handleShuffle} title="Shuffle Deck">
              <Shuffle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
