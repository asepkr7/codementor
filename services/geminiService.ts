import { GoogleGenAI, Type } from "@google/genai";
import { DifficultyLevel, ExplanationResponse, DebugResponse, FlowchartData, SupportedLanguage, ExecutionResponse } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize client
const ai = new GoogleGenAI({ apiKey });

/**
 * Uses Gemini Flash for fast line-by-line explanation.
 * Updated to 'gemini-2.5-flash' for reliability.
 */
export const generateLineByLine = async (code: string, level: DifficultyLevel): Promise<ExplanationResponse> => {
  if (!apiKey) throw new Error("API Key hilang");

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "Ringkasan singkat tentang apa yang dilakukan kode dalam Bahasa Indonesia." },
      lines: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            lineNumber: { type: Type.INTEGER },
            code: { type: Type.STRING },
            explanation: { type: Type.STRING, description: "Penjelasan sederhana dan jelas dalam Bahasa Indonesia sesuai tingkat kesulitan." },
            stateChanges: { type: Type.STRING, description: "Perubahan variabel jika ada, misal: 'x menjadi 5'. Bahasa Indonesia." }
          },
          required: ["lineNumber", "code", "explanation"]
        }
      }
    },
    required: ["summary", "lines"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: `Analisis kode ini untuk siswa tingkat ${level}. Jelaskan baris demi baris dalam Bahasa Indonesia.\n\nKode:\n${code}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: `Anda adalah tutor ilmu komputer yang membantu. Sesuaikan bahasa Anda dengan tingkat siswa: ${level}. Gunakan Bahasa Indonesia.
        Untuk Pemula: Gunakan analogi, hindari jargon rumit.
        Untuk Menengah: Diskusikan aliran kontrol dan efisiensi dasar.
        Untuk Lanjutan: Diskusikan memori, kompleksitas, dan optimasi.`
      }
    });

    const text = response.text;
    if (!text) throw new Error("Tidak ada respon dari AI");
    return JSON.parse(text) as ExplanationResponse;
  } catch (error) {
    console.error("Gemini Explanation Error:", error);
    throw error;
  }
};

/**
 * Uses Gemini Flash for robust Mermaid diagram generation.
 */
export const generateFlowchart = async (code: string, level: DifficultyLevel): Promise<FlowchartData> => {
  if (!apiKey) throw new Error("API Key hilang");

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      mermaidCode: { type: Type.STRING, description: "Valid Mermaid.js graph definition code (e.g., starting with graph TD)" },
      summary: { type: Type.STRING, description: "Deskripsi alur logika dalam Bahasa Indonesia." }
    },
    required: ["mermaidCode", "summary"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Buat diagram alur Mermaid.js yang merepresentasikan logika kode ini. Sertakan ringkasan dalam Bahasa Indonesia.\n\nKode:\n${code}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        // STRICT INSTRUCTION: Quote all labels to avoid syntax errors with special chars
        systemInstruction: `Anda adalah ahli visualisasi. Hasilkan sintaks grafik Mermaid.js yang valid (graph TD).
        ATURAN KRITIS: Semua label node HARUS diapit tanda kutip ganda.
        Contoh: A["Mulai"] --> B["Apakah n <= 1?"]
        Jangan sertakan backtick markdown. Gunakan Bahasa Indonesia untuk label diagram.`
      }
    });

    const text = response.text;
    if (!text) throw new Error("Tidak ada respon dari AI");
    
    const data = JSON.parse(text) as FlowchartData;
    // Sanitize output just in case
    data.mermaidCode = data.mermaidCode.replace(/```mermaid/g, '').replace(/```/g, '').trim();
    
    return data;
  } catch (error) {
    console.error("Gemini Flowchart Error:", error);
    throw error;
  }
};

/**
 * Uses Gemini Flash for Argumentative Debugging.
 */
export const analyzeBugs = async (code: string, level: DifficultyLevel): Promise<DebugResponse> => {
  if (!apiKey) throw new Error("API Key hilang");

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      generalAdvice: { type: Type.STRING, description: "Saran keseluruhan tentang kualitas kode dalam Bahasa Indonesia." },
      bugs: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            bugLocation: { type: Type.STRING, description: "Nomor baris atau nama fungsi." },
            description: { type: Type.STRING, description: "Deskripsi bug dalam Bahasa Indonesia." },
            argument: { type: Type.STRING, description: "Penjelasan argumentatif MENGAPA ini adalah bug dan bagaimana hal itu merusak logika. Bahasa Indonesia." },
            fix: { type: Type.STRING, description: "Potongan kode yang diperbaiki." },
            severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] }
          },
          required: ["bugLocation", "description", "argument", "fix", "severity"]
        }
      }
    },
    required: ["generalAdvice", "bugs"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: `Temukan bug dalam kode ini. Jadilah argumentatif dan ketat tetapi mendidik. Jelaskan mengapa kode gagal. Bahasa: Indonesia.\n\nKode:\n${code}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: `Anda adalah insinyur perangkat lunak senior yang melakukan code review untuk siswa tingkat ${level}.
        Jangan hanya menunjukkan kesalahan; berikan argumen logis mengapa implementasi saat ini menyebabkan kegagalan (runtime error, bug logika, atau kinerja buruk).
        Bersikaplah konstruktif. Gunakan Bahasa Indonesia.`
      }
    });

    const text = response.text;
    if (!text) throw new Error("Tidak ada respon dari AI");
    return JSON.parse(text) as DebugResponse;
  } catch (error) {
    console.error("Gemini Debug Error:", error);
    throw error;
  }
};

/**
 * Simulates code execution output using Gemini.
 * Useful for languages that cannot run in the browser (PHP, Java, Python).
 */
export const runCodeSimulation = async (code: string, language: SupportedLanguage): Promise<ExecutionResponse> => {
    if (!apiKey) throw new Error("API Key hilang");

    // HTML doesn't use AI simulation, it's handled in the UI via Iframe.
    if (language === 'html') {
        return { output: code, isError: false };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Simulasikan eksekusi kode ${language} ini. Berikan OUTPUT text persis seperti yang akan muncul di konsol/terminal.\n\nKode:\n${code}`,
            config: {
                systemInstruction: `Anda adalah compiler dan interpreter code. Tugas Anda adalah menjalankan kode secara mental dan menghasilkan OUTPUT murni saja.
                - Jangan berikan penjelasan.
                - Jangan berikan markdown backticks.
                - Jika ada error syntax atau runtime, outputkan pesan error tersebut selayaknya compiler asli.
                - Jika kode meminta input pengguna, asumsikan input standar/dummy atau abaikan jika tidak kritis, tapi berikan catatan [Menunggu Input].`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        output: { type: Type.STRING, description: "Output dari stdout atau pesan error." },
                        isError: { type: Type.BOOLEAN, description: "Apakah eksekusi menghasilkan error." }
                    },
                    required: ["output", "isError"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("Tidak ada respon dari eksekutor.");
        return JSON.parse(text) as ExecutionResponse;
    } catch (error) {
        console.error("Simulation Error:", error);
        return { 
            output: `Error Sistem: Gagal menjalankan simulasi.\n${error instanceof Error ? error.message : ''}`, 
            isError: true 
        };
    }
}
