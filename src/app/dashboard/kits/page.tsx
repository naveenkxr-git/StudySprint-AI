"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  CheckCircle, 
  BookOpen, 
  Bookmark, 
  Layers, 
  Flame, 
  ArrowLeft 
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  file_path: string;
  status: string;
}

interface KitData {
  summary: {
    executiveSummary: string;
    chapterSummaries: { title: string; content: string }[];
    keyTakeaways: string[];
  };
  keyConcepts: {
    concept: string;
    definition: string;
    formula?: string | null;
    type: 'concept' | 'definition' | 'formula' | 'terminology';
  }[];
}

function getDemoKit(id: string): KitData {
  return {
    summary: {
      executiveSummary: "This document explores the fundamental architectures and layers of Modern Computer Networks, focusing specifically on the transport and application layer, congestion control, and routing mechanisms that support the global internet scale.",
      chapterSummaries: [
        {
          title: "Chapter 1: The Transport Layer & TCP",
          content: "We deep-dive into Transmission Control Protocol (TCP) and User Datagram Protocol (UDP). TCP provides reliable, ordered, and error-checked delivery of a stream of octets between applications running on hosts communicating via an IP network. It manages congestion control, sequence numbers, and packet acknowledgments."
        },
        {
          title: "Chapter 2: Congestion Control Mechanisms",
          content: "Explores the algorithms used by TCP to avoid congestion collapse. This includes Slow Start, Congestion Avoidance, Fast Retransmit, and Fast Recovery, analyzing how sender window size scales dynamically with network feedback."
        },
        {
          title: "Chapter 3: Domain Name System (DNS)",
          content: "Examines how application layer naming resolution operates. DNS maps domain names to IP addresses through a distributed database and hierarchical servers (root, TLD, authoritative, and caching resolvers)."
        }
      ],
      keyTakeaways: [
        "TCP is connection-oriented and reliable, while UDP is connectionless and lightweight.",
        "TCP congestion control relies on packet loss and RTT fluctuations as signals of network bottleneck saturation.",
        "Hierarchical caching in DNS significantly reduces global domain resolution latency."
      ]
    },
    keyConcepts: [
      {
        concept: "Three-way Handshake",
        definition: "The process used by TCP to establish a connection between a client and server, involving SYN, SYN-ACK, and ACK packets.",
        type: "definition"
      },
      {
        concept: "TCP Congestion Window (cwnd)",
        definition: "A state variable managed by the sender that limits the total number of unacknowledged packets that may be in transit in the network.",
        type: "concept"
      },
      {
        concept: "RTT (Round Trip Time) Equation",
        definition: "Calculation of estimated round trip time to adjust timeout values.",
        formula: "EstimatedRTT = (1 - a) * EstimatedRTT + a * SampleRTT",
        type: "formula"
      },
      {
        concept: "DNS Resolver",
        definition: "A server that initiates and sequences queries to translate human-readable hostnames (e.g., example.com) into machine-readable IP addresses.",
        type: "terminology"
      }
    ]
  };
}

export default function StudyKitPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docIdParam = searchParams.get('docId');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(docIdParam);
  const [kit, setKit] = useState<KitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'concepts'>('summary');
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const init = async () => {
      const demoSession = localStorage.getItem('sb-demo-session');
      if (demoSession) {
        setIsDemo(true);
        // Load demo documents
        const savedDocs = localStorage.getItem('demo-documents');
        if (savedDocs) {
          const list = JSON.parse(savedDocs).filter((d: any) => d.status === 'completed');
          setDocuments(list);
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }
        // Fetch user's completed documents
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

  // Load Kit data when document is selected
  useEffect(() => {
    if (!selectedDocId) return;

    const loadKit = async () => {
      setLoading(true);
      if (isDemo) {
        // Load static demo kit or generate a new mock one
        setTimeout(() => {
          setKit(getDemoKit(selectedDocId));
          setLoading(false);
        }, 800);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('learning_kits')
          .select('*')
          .eq('document_id', selectedDocId)
          .maybeSingle();

        if (data) {
          setKit({
            summary: data.summary,
            keyConcepts: data.key_concepts
          } as any);
        } else {
          setKit(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadKit();
  }, [selectedDocId, isDemo]);

  // Generate Kit
  const handleGenerateKit = async () => {
    if (!selectedDocId) return;
    setGenerating(true);

    if (isDemo) {
      setTimeout(() => {
        setKit(getDemoKit(selectedDocId));
        setGenerating(false);
      }, 2000);
      return;
    }

    try {
      const response = await fetch('/api/generate-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDocId })
      });

      const result = await response.json();
      if (result.success) {
        setKit({
          summary: result.data.summary,
          keyConcepts: result.data.key_concepts
        });
      } else {
        alert(result.error || 'Failed to generate Study Kit');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to generation service');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // If no document selected yet, show choice UI
  if (!selectedDocId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-white">AI Study Kits</h1>
          <p className="text-zinc-400">Select a document from your library to generate summaries and key concepts.</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Select a Document</CardTitle>
            <CardDescription>Choose one of the processed documents below:</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <p className="mb-4">No completed documents available to study.</p>
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
                    <ChevronRight className="h-5 w-5 text-zinc-500" />
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
        <span className="text-sm font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
          {currentDoc ? currentDoc.name : 'Selected Document'}
        </span>
      </div>

      {!kit ? (
        <Card className="glass-card text-center py-16">
          <CardHeader className="items-center">
            <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
              <Layers className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Generate Your Study Kit</CardTitle>
            <CardDescription className="max-w-md">
              Let our AI analyze your document to generate a high-yield summary, chapter outlines, key takeaways, and key terminology cards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="lg" 
              variant="gradient" 
              className="gap-2" 
              onClick={handleGenerateKit}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Analyzing Document...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" /> Generate Learning Kit
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Custom Tabs Navigation */}
          <div className="flex bg-zinc-900/60 border border-white/5 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'summary' 
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Study Summary
            </button>
            <button
              onClick={() => setActiveTab('concepts')}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'concepts' 
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Key Concepts & Formulas
            </button>
          </div>

          {activeTab === 'summary' ? (
            <div className="space-y-6">
              {/* Executive Summary */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-indigo-400">
                    <BookOpen className="h-5 w-5" /> Executive Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-zinc-300 leading-relaxed text-base">
                  {kit.summary.executiveSummary}
                </CardContent>
              </Card>

              {/* Key Takeaways */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-pink-400">
                    <Flame className="h-5 w-5" /> Key Takeaways
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {kit.summary.keyTakeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex gap-3 text-zinc-300 text-sm md:text-base">
                        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Chapter / Section Summaries */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white px-1">Detailed Sections</h3>
                {kit.summary.chapterSummaries.map((chapter, idx) => (
                  <Card key={idx} className="glass-card bg-zinc-900/40">
                    <CardHeader className="py-4">
                      <CardTitle className="text-base font-semibold text-zinc-200">{chapter.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-zinc-400 leading-relaxed pt-0 pb-4">
                      {chapter.content}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* Key Concepts View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {kit.keyConcepts.map((item, idx) => (
                <Card key={idx} className="glass-card border-l-4 border-l-indigo-500 hover:border-l-pink-500 transition-all">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-white">{item.concept}</CardTitle>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                      {item.type}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-zinc-300 leading-relaxed">{item.definition}</p>
                    {item.formula && (
                      <div className="p-3 bg-black/30 rounded-lg border border-white/5 font-mono text-xs text-pink-400 overflow-x-auto">
                        {item.formula}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
