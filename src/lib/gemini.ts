import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function getModel() {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured. Please set it in your environment.");
  }
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

function getEmbeddingModel() {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured. Please set it in your environment.");
  }
  return genAI.getGenerativeModel({ model: "text-embedding-004" });
}

// Generate Embeddings for RAG
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = getEmbeddingModel();
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Return a dummy 768-dimension vector if it fails in dev, so the app doesn't crash completely.
    return new Array(768).fill(0);
  }
}

// Generate Summary and Key Concepts (Study Kit)
export async function generateLearningKit(content: string) {
  const model = getModel();
  const prompt = `
    You are an expert tutor. Analyze the following study material and generate a comprehensive learning kit in JSON.
    The response MUST be a single, valid JSON object with the exact structure below. Do not wrap in markdown or any other formatting, just the raw JSON:
    
    {
      "summary": {
        "executiveSummary": "A concise high-level overview of the entire material.",
        "chapterSummaries": [
          {
            "title": "Chapter/Section Title",
            "content": "Detailed summary of this section."
          }
        ],
        "keyTakeaways": [
          "Takeaway 1",
          "Takeaway 2"
        ]
      },
      "keyConcepts": [
        {
          "concept": "Name of the concept/term/formula",
          "definition": "Clear explanation of what it is",
          "formula": "Optional mathematical formula or null if not applicable",
          "type": "concept" | "definition" | "formula" | "terminology"
        }
      ]
    }

    Study Material:
    ${content.substring(0, 15000)} // Limit content length to stay within token limits
  `;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  const responseText = result.response.text();
  return JSON.parse(responseText);
}

// Generate Flashcards
export async function generateFlashcards(content: string, count: number = 30) {
  const model = getModel();
  const prompt = `
    You are an expert tutor. Create between ${count} and ${count + 10} flashcards from the following study material.
    Each flashcard must contain a 'front' (question or term) and a 'back' (answer or explanation).
    The response MUST be a single, valid JSON array of objects. Do not wrap in markdown or any other formatting.
    
    Format:
    [
      {
        "front": "Question or Term",
        "back": "Answer or Explanation"
      }
    ]

    Study Material:
    ${content.substring(0, 15000)}
  `;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  return JSON.parse(result.response.text());
}

// Generate Quiz Questions
export async function generateQuiz(content: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
  const model = getModel();
  const prompt = `
    You are an expert examiner. Create a multiple-choice quiz of 10 questions based on the following study material.
    The difficulty should be: ${difficulty}.
    Each question must have exactly 4 options, one correct answer (index 0, 1, 2, or 3), and an explanation for why it is correct.
    The response MUST be a single, valid JSON array of objects. Do not wrap in markdown or any other formatting.
    
    Format:
    [
      {
        "question": "The question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0, // 0-based index of the correct option (e.g. 0 for Option A)
        "explanation": "Why this option is correct."
      }
    ]

    Study Material:
    ${content.substring(0, 15000)}
  `;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  return JSON.parse(result.response.text());
}

// Generate Study Plan
export interface StudyPlanParams {
  examDate: string;
  dailyHours: number;
  priorityTopics: string[];
  contentContext?: string;
}

export async function generateStudyPlan(params: StudyPlanParams) {
  const model = getModel();
  const prompt = `
    You are an AI Study Coach. Create a day-by-day study plan leading up to the exam date: ${params.examDate}.
    The user can study ${params.dailyHours} hours per day.
    The priority topics to cover are: ${params.priorityTopics.join(", ")}.
    ${params.contentContext ? `The study plan by default should be based on this context: ${params.contentContext.substring(0, 8000)}` : ""}

    Create a realistic, progressive schedule including study sessions, revision sessions, and mock test schedules.
    The response MUST be a single, valid JSON array of objects representing days. Do not wrap in markdown or any other formatting.
    
    Format:
    [
      {
        "date": "YYYY-MM-DD",
        "topic": "Topic Name",
        "duration": ${params.dailyHours}, // hours for the day
        "type": "study" | "revision" | "mock_test",
        "tasks": [
          "Read chapter 1",
          "Solve 10 practice questions"
        ]
      }
    ]
  `;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  return JSON.parse(result.response.text());
}

// RAG AI Tutor Chat
export async function answerTutorQuestion(
  contextChunks: string[],
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newQuestion: string
) {
  const model = getModel();
  
  const systemInstruction = `
    You are an AI Study Tutor for StudySprint AI. 
    Your job is to help the student learn from their uploaded documents.
    You MUST answer the student's question based ONLY on the provided context retrieved from their documents.
    If the answer cannot be found in the context, politely state that you can only answer questions related to the uploaded document.
    Always structure your answers clearly and refer to parts of the context if needed.
    
    Context:
    ---
    ${contextChunks.join("\n\n---\n\n")}
    ---
  `;

  const chat = model.startChat({
    history: history,
    systemInstruction: systemInstruction,
  });

  const response = await chat.sendMessage(newQuestion);
  return response.response.text();
}
