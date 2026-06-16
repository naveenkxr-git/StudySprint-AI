"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText, Upload, Trash2, Loader2, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  num_pages: number;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Load documents
  const fetchDocuments = async (uid: string, demoMode: boolean) => {
    if (demoMode) {
      const savedDocs = localStorage.getItem('demo-documents');
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      } else {
        const initialDocs: Document[] = [
          {
            id: 'demo-doc-1',
            name: 'Computer Networks - Chapter 5 (Transport Layer).pdf',
            file_path: 'demo/network.pdf',
            file_type: 'pdf',
            status: 'completed',
            num_pages: 14,
            created_at: new Date(Date.now() - 86400000 * 3).toISOString()
          },
          {
            id: 'demo-doc-2',
            name: 'Introduction to Operating Systems.docx',
            file_path: 'demo/os.docx',
            file_type: 'docx',
            status: 'completed',
            num_pages: 8,
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 'demo-doc-3',
            name: 'History Lecture Notes.txt',
            file_path: 'demo/history.txt',
            file_type: 'txt',
            status: 'completed',
            num_pages: 3,
            created_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('demo-documents', JSON.stringify(initialDocs));
        setDocuments(initialDocs);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const demoSession = localStorage.getItem('sb-demo-session');
      if (demoSession) {
        setIsDemo(true);
        const parsed = JSON.parse(demoSession);
        setUserId(parsed.user.id);
        fetchDocuments(parsed.user.id, true);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }
        setUserId(session.user.id);
        fetchDocuments(session.user.id, false);
      }
    };
    init();
  }, [router]);

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      setUploading(false);
      return;
    }

    if (isDemo) {
      // Create a local mock document
      const newDoc: Document = {
        id: 'demo-doc-' + Date.now(),
        name: file.name,
        file_path: 'demo/' + file.name,
        file_type: ext || 'txt',
        status: 'processing',
        num_pages: 5,
        created_at: new Date().toISOString()
      };

      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      localStorage.setItem('demo-documents', JSON.stringify(updatedDocs));

      // Simulate a background process
      setTimeout(() => {
        const processedDocs = updatedDocs.map(d => 
          d.id === newDoc.id ? { ...d, status: 'completed' as const } : d
        );
        setDocuments(processedDocs);
        localStorage.setItem('demo-documents', JSON.stringify(processedDocs));
      }, 3000);

      setUploading(false);
      return;
    }

    try {
      // 1. Upload to Supabase Storage
      const filePath = `${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insert into Database
      const { data: docData, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          name: file.name,
          file_path: filePath,
          file_type: ext || 'txt',
          status: 'uploaded',
          num_pages: 0
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Optimistically update UI
      setDocuments(prev => [docData, ...prev]);

      // 3. Call serverless route to process & chunk
      fetch('/api/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docData.id,
          filePath,
          fileType: ext
        })
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error('Error processing document');
        }
        fetchDocuments(userId, false);
      }).catch(err => {
        console.error(err);
        fetchDocuments(userId, false);
      });

    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Delete Document
  const handleDelete = async (id: string, filePath: string) => {
    if (isDemo) {
      const updatedDocs = documents.filter(d => d.id !== id);
      setDocuments(updatedDocs);
      localStorage.setItem('demo-documents', JSON.stringify(updatedDocs));
      return;
    }

    try {
      // 1. Delete from storage
      await supabase.storage.from('documents').remove([filePath]);
      
      // 2. Delete row from DB (Cascade will clean up chunks, kits, etc.)
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      setError(err.message || 'Could not delete document');
    }
  };

  // Trigger Action / Study
  const handleGenerateKit = (docId: string) => {
    router.push(`/dashboard/kits?docId=${docId}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Your Study Materials</h1>
        <p className="text-zinc-400">Upload textbooks, lecture slides, notes, or essays to begin generating your custom learning materials.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/30 text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Card */}
        <Card className="glass-card h-fit lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-400" /> Upload Document
            </CardTitle>
            <CardDescription>Drag & drop or browse your files (PDF, DOCX, TXT max 20MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative group border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-xl p-8 transition-colors flex flex-col items-center justify-center cursor-pointer">
              <input 
                type="file" 
                accept=".pdf,.docx,.txt"
                onChange={handleUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
                  <span className="text-sm font-medium text-zinc-300">Processing file...</span>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 text-zinc-500 group-hover:text-indigo-400 group-hover:scale-110 transition-all mb-4" />
                  <span className="text-sm text-zinc-300 text-center font-medium block">Click to upload files</span>
                  <span className="text-xs text-zinc-500 text-center mt-1 block">Supports PDF, DOCX, TXT</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">My Library</CardTitle>
            <CardDescription>Your processed study documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>No documents uploaded yet.</p>
                <p className="text-xs text-zinc-600 mt-1">Upload a PDF or document above to begin generating your study materials.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-black/40 transition-colors">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-1">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm text-white truncate max-w-md" title={doc.name}>{doc.name}</h4>
                        <div className="flex gap-3 text-xs text-zinc-400 mt-1">
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{doc.num_pages || '?'} pages</span>
                          <span>•</span>
                          <span className="capitalize">{doc.file_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      {doc.status === 'processing' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Loader2 className="h-3 w-3 animate-spin" /> Processing
                        </span>
                      )}
                      {doc.status === 'completed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle className="h-3 w-3" /> Ready
                        </span>
                      )}
                      {doc.status === 'error' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                          Error
                        </span>
                      )}

                      {doc.status === 'completed' && (
                        <Button 
                          size="sm" 
                          variant="gradient" 
                          onClick={() => handleGenerateKit(doc.id)}
                          className="flex items-center gap-1.5"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" /> Study
                        </Button>
                      )}

                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDelete(doc.id, doc.file_path)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
