"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Send, 
  Bot, 
  User as UserIcon,
  Loader2, 
  BookOpen, 
  ArrowLeft,
  ChevronRight,
  Info
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  file_path: string;
  status: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  references?: string[];
  timestamp: string;
}

interface ChatSession {
  id: string;
  document_id: string;
  messages: ChatMessage[];
}

export default function TutorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docIdParam = searchParams.get('docId');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(docIdParam);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Track currently selected message for showing references in detail
  const [selectedMsgIndex, setSelectedMsgIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Load chat session when document selected
  useEffect(() => {
    if (!selectedDocId) return;

    const loadChat = async () => {
      setLoading(true);
      if (isDemo) {
        setTimeout(() => {
          const storedChat = localStorage.getItem(`demo-chat-${selectedDocId}`);
          if (storedChat) {
            setMessages(JSON.parse(storedChat));
          } else {
            const initialMsgs: ChatMessage[] = [
              {
                role: 'assistant',
                content: `Hi there! I am your AI Study Tutor. Ask me any question related to the document, and I'll answer using the text and provide source citations!`,
                timestamp: new Date().toISOString()
              }
            ];
            setMessages(initialMsgs);
            localStorage.setItem(`demo-chat-${selectedDocId}`, JSON.stringify(initialMsgs));
          }
          setLoading(false);
        }, 500);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tutor_chats')
          .select('*')
          .eq('document_id', selectedDocId)
          .eq('user_id', userId)
          .maybeSingle();

        if (data && data.messages) {
          setMessages(data.messages);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: `Hi there! I am your AI Study Tutor. Ask me any question related to the document, and I'll answer using the text and provide source citations!`,
              timestamp: new Date().toISOString()
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [selectedDocId, userId, isDemo]);

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedDocId || !userId || sending) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: inputText,
      timestamp: new Date().toISOString()
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInputText('');
    setSending(true);

    if (isDemo) {
      setTimeout(() => {
        let answer = "I couldn't find details matching that specifically in the document.";
        let references: string[] = [];

        // Simple mock Q&A responses for common questions
        const lowered = userMsg.content.toLowerCase();
        if (lowered.includes('tcp') || lowered.includes('transmission')) {
          answer = "According to the document, TCP stands for Transmission Control Protocol. It is a core protocol of the Internet Protocol Suite. It operates at the Transport Layer and provides reliable, ordered, and error-checked delivery of a stream of octets between applications.";
          references = [
            "Section 5.1: The Transport Layer - TCP provides connection-oriented, reliable transmission. It uses sequence numbers and ACKs for ordering and reliability.",
            "Section 5.2: TCP Header - The header contains Source Port, Destination Port, Sequence Number, Acknowledgment Number, and flags (SYN, ACK, FIN)."
          ];
        } else if (lowered.includes('handshake')) {
          answer = "The 3-way handshake is how TCP establishes a connection. First, the client sends a SYN (synchronize) packet. Next, the server replies with a SYN-ACK packet. Finally, the client sends an ACK (acknowledge) packet, establishing the connection.";
          references = [
            "Section 5.3: Connection Establishment - A three-way handshake (SYN, SYN-ACK, ACK) is performed. This synchronizes sequence numbers for both sides before data transfer begins."
          ];
        } else if (lowered.includes('dns')) {
          answer = "DNS (Domain Name System) translates human-readable hostnames like 'example.com' into IP addresses. It runs on the application layer and utilizes a hierarchical naming tree.";
          references = [
            "Section 6.1: Application Protocols - The Domain Name System (DNS) resolves human-friendly names to IP addresses via distributed name servers."
          ];
        } else {
          answer = "Based on the document context, I found relevant concepts regarding internet protocols, including transport mechanisms, but I need a more specific question in order to find the exact paragraph. Try asking about 'TCP', 'three-way handshake', or 'DNS'.";
          references = [
            "Section 1.1: Introduction - This document covers computer networking fundamentals, focusing on layers, protocols, and data delivery formats."
          ];
        }

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: answer,
          references,
          timestamp: new Date().toISOString()
        };

        const finalMsgs = [...newMsgs, assistantMsg];
        setMessages(finalMsgs);
        localStorage.setItem(`demo-chat-${selectedDocId}`, JSON.stringify(finalMsgs));
        setSending(false);
      }, 1500);
      return;
    }

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocId,
          userId,
          message: userMsg.content,
          history: messages
        })
      });

      const result = await response.json();
      if (result.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: result.answer,
            references: result.sources.map((s: any) => s.content),
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        alert(result.error || 'Failed to get a response');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to tutor service');
    } finally {
      setSending(false);
    }
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
          <h1 className="text-3xl font-extrabold text-white">AI Study Tutor</h1>
          <p className="text-zinc-400">Ask questions and get answers directly sourced from your files.</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Select a Document to Chat With</CardTitle>
            <CardDescription>Select one of the processed documents below:</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <p className="mb-4">No completed documents available for AI Tutor.</p>
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
                    <span className="text-xs text-zinc-400">Chat</span>
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
    <div className="space-y-6 h-[85vh] flex flex-col justify-between animate-fade-in">
      <div className="flex items-center justify-between shrink-0">
        <Button variant="ghost" className="gap-2 text-zinc-400 hover:text-white" onClick={() => { setSelectedDocId(null); setMessages([]); }}>
          <ArrowLeft className="h-4 w-4" /> Back to Library
        </Button>
        <span className="text-sm font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full truncate max-w-xs md:max-w-md">
          Tutor Session: {currentDoc ? currentDoc.name : 'Document'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden min-h-0">
        {/* Chat window */}
        <Card className="glass-card lg:col-span-3 flex flex-col overflow-hidden h-full">
          <CardHeader className="border-b border-white/5 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-base font-semibold">Tutor AI</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-indigo-400'
                }`}>
                  {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600/90 text-white rounded-tr-none' 
                    : 'bg-zinc-900/80 text-zinc-200 border border-white/5 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.references && msg.references.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs text-indigo-300 font-medium">Sourced from your document</span>
                      <button 
                        onClick={() => setSelectedMsgIndex(index)}
                        className="text-xs text-white underline hover:text-indigo-200"
                      >
                        View Sources
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                <div className="h-8 w-8 rounded-full bg-white/10 text-indigo-400 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-3.5 rounded-2xl text-sm bg-zinc-900/80 border border-white/5 text-zinc-400 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  <span>Searching document and writing answer...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input Area */}
          <div className="p-4 border-t border-white/5 bg-black/10 shrink-0">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Ask about your document (e.g. 'What is TCP?')"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" size="icon" variant="gradient" disabled={sending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Source References (Sidebar) */}
        <Card className="glass-card hidden lg:flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b border-white/5 py-4 shrink-0">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <Info className="h-4 w-4 text-pink-400" /> Grounded Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {selectedMsgIndex !== null && messages[selectedMsgIndex]?.references ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">Showing sources for selected message:</p>
                {messages[selectedMsgIndex].references?.map((source, idx) => (
                  <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs text-zinc-300 leading-relaxed">
                    <div className="font-semibold text-indigo-400 mb-1">Source [{idx + 1}]</div>
                    {source}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 flex flex-col items-center">
                <BookOpen className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm">Click "View Sources" on any tutor response to see the original document extracts.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
