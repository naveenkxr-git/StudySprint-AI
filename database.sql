-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create a table for public profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Allow public read access to profiles" on public.profiles
  for select using (true);

create policy "Allow individual write access to own profile" on public.profiles
  for update using (auth.uid() = id);

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create Documents table
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  file_path text not null,
  file_type text not null,
  status text not null default 'uploaded', -- 'uploaded', 'processing', 'completed', 'error'
  num_pages integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.documents enable row level security;

create policy "Users can read own documents" on public.documents
  for select using (auth.uid() = user_id);

create policy "Users can insert own documents" on public.documents
  for insert with check (auth.uid() = user_id);

create policy "Users can update own documents" on public.documents
  for update using (auth.uid() = user_id);

create policy "Users can delete own documents" on public.documents
  for delete using (auth.uid() = user_id);

-- Create Document Chunks table for RAG
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  chunk_index integer not null,
  content text not null,
  embedding vector(768) not null
);

alter table public.document_chunks enable row level security;

create policy "Users can read chunks of own documents" on public.document_chunks
  for select using (
    exists (
      select 1 from public.documents
      where public.documents.id = public.document_chunks.document_id
      and public.documents.user_id = auth.uid()
    )
  );

create policy "Users can insert chunks for own documents" on public.document_chunks
  for insert with check (
    exists (
      select 1 from public.documents
      where public.documents.id = public.document_chunks.document_id
      and public.documents.user_id = auth.uid()
    )
  );

-- Create Learning Kits table
create table public.learning_kits (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  summary jsonb not null, -- { executiveSummary, chapterSummaries: [{ title, content }], keyTakeaways: [] }
  key_concepts jsonb not null, -- [{ concept, definition, formula, terminology }]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.learning_kits enable row level security;

create policy "Users can read own learning kits" on public.learning_kits
  for select using (
    exists (
      select 1 from public.documents
      where public.documents.id = public.learning_kits.document_id
      and public.documents.user_id = auth.uid()
    )
  );

create policy "Users can insert own learning kits" on public.learning_kits
  for insert with check (
    exists (
      select 1 from public.documents
      where public.documents.id = public.learning_kits.document_id
      and public.documents.user_id = auth.uid()
    )
  );

-- Create Flashcards table
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  front text not null,
  back text not null,
  completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.flashcards enable row level security;

create policy "Users can read own flashcards" on public.flashcards
  for select using (
    exists (
      select 1 from public.documents
      where public.documents.id = public.flashcards.document_id
      and public.documents.user_id = auth.uid()
    )
  );

create policy "Users can insert own flashcards" on public.flashcards
  for insert with check (
    exists (
      select 1 from public.documents
      where public.documents.id = public.flashcards.document_id
      and public.documents.user_id = auth.uid()
    )
  );

create policy "Users can update own flashcards" on public.flashcards
  for update using (
    exists (
      select 1 from public.documents
      where public.documents.id = public.flashcards.document_id
      and public.documents.user_id = auth.uid()
    )
  );

-- Create Quizzes table
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  title text not null,
  difficulty text not null, -- 'easy', 'medium', 'hard'
  questions jsonb not null, -- Array of { question, options: [4], correctAnswer: string, explanation: string }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.quizzes enable row level security;

create policy "Users can read own quizzes" on public.quizzes
  for select using (
    exists (
      select 1 from public.documents
      where public.documents.id = public.quizzes.document_id
      and public.documents.user_id = auth.uid()
    )
  );

create policy "Users can insert own quizzes" on public.quizzes
  for insert with check (
    exists (
      select 1 from public.documents
      where public.documents.id = public.quizzes.document_id
      and public.documents.user_id = auth.uid()
    )
  );

-- Create Quiz Attempts table
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  score integer not null,
  total_questions integer not null,
  accuracy numeric not null,
  time_spent integer not null, -- in seconds
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.quiz_attempts enable row level security;

create policy "Users can read own quiz attempts" on public.quiz_attempts
  for select using (auth.uid() = user_id);

create policy "Users can insert own quiz attempts" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);

-- Create Study Plans table
create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  exam_date date not null,
  daily_hours numeric not null,
  priority_topics text[] not null,
  schedule jsonb not null, -- [{ date, topic, duration, type: 'study' | 'revision' | 'mock_test', completed: boolean }]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.study_plans enable row level security;

create policy "Users can read own study plans" on public.study_plans
  for select using (auth.uid() = user_id);

create policy "Users can insert own study plans" on public.study_plans
  for insert with check (auth.uid() = user_id);

create policy "Users can update own study plans" on public.study_plans
  for update using (auth.uid() = user_id);

create policy "Users can delete own study plans" on public.study_plans
  for delete using (auth.uid() = user_id);

-- Create Tutor Chats table
create table public.tutor_chats (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  messages jsonb not null default '[]'::jsonb, -- Array of { role: 'user'|'assistant', content: string, references?: string[], timestamp: string }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tutor_chats enable row level security;

create policy "Users can read own chats" on public.tutor_chats
  for select using (auth.uid() = user_id);

create policy "Users can insert own chats" on public.tutor_chats
  for insert with check (auth.uid() = user_id);

create policy "Users can update own chats" on public.tutor_chats
  for update using (auth.uid() = user_id);

-- Create Analytics table
create table public.analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  readiness_score integer default 0 not null,
  strong_topics text[] default '{}' not null,
  weak_topics text[] default '{}' not null,
  improvement_suggestions text[] default '{}' not null,
  study_streak integer default 0 not null,
  total_time_spent integer default 0 not null, -- in seconds
  last_active date default current_date not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.analytics enable row level security;

create policy "Users can read own analytics" on public.analytics
  for select using (auth.uid() = user_id);

create policy "Users can insert own analytics" on public.analytics
  for insert with check (auth.uid() = user_id);

create policy "Users can update own analytics" on public.analytics
  for update using (auth.uid() = user_id);

-- Create bucket for document uploads
-- Note: Supabase storage buckets must be created via the dashboard, or through SQL extensions, or via client.
-- This SQL initializes policy rules for a 'documents' bucket.
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict do nothing;

create policy "Users can access own folder inside documents" on storage.objects
  for all using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- Vector Similarity Search Function
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_document_id uuid
) returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.document_id = filter_document_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
