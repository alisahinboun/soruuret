
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

export interface QuestionRequest {
  grade: string;
  subject: string;
  topic: string;
  difficulty: string;
  qType: string;
}

export interface GeneratedQuestion {
  questionText: string;
  options?: string[];
  answer: string;
  explanation: string;
  difficulty?: string; // Added specific difficulty field
}

@Injectable({
  providedIn: 'root'
})
export class QuestionGeneratorService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = (import.meta as any).env?.GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateQuestions(req: QuestionRequest): Promise<GeneratedQuestion[]> {
    // Handle 'Mixed' difficulty specifically in the prompt
    const difficultyPrompt = req.difficulty === 'Karışık' 
      ? 'Karışık (Sorular; Kolay, Orta, Zor ve Çok Zor seviyelerden çeşitlendirilmiş, dengeli bir dağılım olsun)'
      : req.difficulty;

    const prompt = `
      Sen İnekle platformunda çalışan uzman bir öğretmensin.
      Aşağıdaki kriterlere göre öğrenciler için özel sorular hazırla:
      
      Sınıf Seviyesi: ${req.grade}
      Ders: ${req.subject}
      Konu: ${req.topic}
      Zorluk Seviyesi: ${difficultyPrompt}
      Soru Tipi: ${req.qType}

      Lütfen tam olarak 5 adet soru hazırla.
      Cevap anahtarını ve kısa bir açıklamayı da ekle.
      Her sorunun kendi zorluk derecesini (Kolay, Orta, Zor, Çok Zor) belirle ve çıktıya ekle.
      Türkçe dilini mükemmel kullan.
      
      ÖNEMLİ KURALLAR:
      1. Matematiksel ifadeleri, denklemleri ve formülleri LaTeX formatında yaz.
      2. Satır içi (inline) matematik için $ işareti kullan. Örnek: $x^2 + 2x$
      3. Blok matematik için $$ işareti kullan.
      4. JSON formatında çıktı verdiğin için, tüm LaTeX komutlarında ters eğik çizgi (backslash) karakterini çift kullanmalısın (escape etmelisin). 
         Örneğin: "\\times" yerine "\\\\times", "\\frac" yerine "\\\\frac", "\\sqrt" yerine "\\\\sqrt" yazmalısın. 
         Bu kurala uymazsan "imes" gibi hatalı çıktılar oluşur. Lütfen buna çok dikkat et.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionText: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Çoktan seçmeli ise şıklar, değilse boş liste"
                },
                answer: { type: Type.STRING },
                explanation: { type: Type.STRING, description: "Öğrenci için kısa ipucu veya açıklama" },
                difficulty: { type: Type.STRING, description: "Sorunun zorluk derecesi (Örn: Kolay, Zor)" }
              },
              required: ["questionText", "answer", "explanation", "difficulty"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      
      return JSON.parse(text) as GeneratedQuestion[];
    } catch (error) {
      console.error('Error generating questions:', error);
      throw error;
    }
  }
}
