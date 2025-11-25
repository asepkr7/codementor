import React, { useState, useCallback, useEffect } from 'react';
import { NavBar } from './components/NavBar';
import { MermaidChart } from './components/MermaidChart';
import { IconZap, IconAlert, IconCheck, IconTerminal, IconPlay, IconActivity, IconCopy } from './components/Icons';
import { AppMode, DifficultyLevel, ExplanationResponse, DebugResponse, FlowchartData, SupportedLanguage, ExecutionResponse } from './types';
import { generateLineByLine, generateFlowchart, analyzeBugs, runCodeSimulation } from './services/geminiService';
import Editor from '@monaco-editor/react';

const DEFAULT_CODE_SNIPPETS: Record<SupportedLanguage, string> = {
  javascript: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci(10) =", fibonacci(10));`,
  python: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(f"Fibonacci(10) = {fibonacci(10)}")`,
  java: `public class Main {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    public static void main(String[] args) {
        System.out.println("Fibonacci(10) = " + fibonacci(10));
    }
}`,
  php: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PHP Demo</title>
    <style>
        body { font-family: sans-serif; background: #f0fdf4; padding: 2rem; }
        .box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="box">
        <h1>Hello from PHP!</h1>
        <p>Current Server Time:</p>
        <?php
            date_default_timezone_set('Asia/Jakarta');
            echo "<h2 style='color: #166534;'>" . date("H:i:s") . "</h2>";
            
            $name = "CodeMentor";
            echo "<p>Welcome to $name</p>";
        ?>
        <button onclick="alert('JS also works!')">Click Me</button>
    </div>
</body>
</html>`,
  html: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: 'Segoe UI', sans-serif; 
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0; 
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            text-align: center;
            transition: transform 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        h1 { color: #166534; margin-bottom: 0.5rem; }
        p { color: #4b5563; margin-bottom: 1.5rem; }
        button { 
            padding: 10px 24px; 
            background: #166534; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600;
            transition: background 0.2s;
        }
        button:hover { background: #15803d; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Halo CodeMentor!</h1>
        <p>Ini adalah demo HTML, CSS, & JS.</p>
        <button onclick="changeText()">Klik Saya</button>
    </div>

    <script>
        function changeText() {
            const h1 = document.querySelector('h1');
            h1.innerText = 'JS Berjalan Berhasil!';
            h1.style.color = '#2563eb';
            alert('Script JavaScript berfungsi!');
        }
    </script>
</body>
</html>`
};

const STORAGE_KEY = 'codementor_saved_code';
const LANG_KEY = 'codementor_saved_lang';
const MODE_KEY = 'codementor_saved_mode';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(() => {
    return (localStorage.getItem(MODE_KEY) as AppMode) || AppMode.EXPLAIN;
  });
  const [storageError, setStorageError] = useState<string | null>(null);
  
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem(LANG_KEY) as SupportedLanguage) || 'javascript';
  });

  // Initialize code from localStorage if available, otherwise use default for that language
  const [code, setCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved : DEFAULT_CODE_SNIPPETS['javascript'];
    } catch (e) {
      return DEFAULT_CODE_SNIPPETS['javascript'];
    }
  });

  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.BEGINNER);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  // Results
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [flowchartData, setFlowchartData] = useState<FlowchartData | null>(null);
  const [debugData, setDebugData] = useState<DebugResponse | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null);

  // Save code and mode to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
      localStorage.setItem(LANG_KEY, language);
      localStorage.setItem(MODE_KEY, mode);
      setStorageError(null);
    } catch (e) {
      let message = "Gagal menyimpan lokal.";
      if (e instanceof Error && e.name === 'QuotaExceededError') {
          message = "Penyimpanan lokal penuh.";
      }
      setStorageError(message);
    }
  }, [code, language, mode]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    // Optional: Reset code to snippet if switching languages to avoid syntax mess,
    // or keep it if user wants to translate manually. Let's reset for better UX.
    if (confirm("Ganti bahasa akan mereset editor ke template default. Lanjutkan?")) {
        setCode(DEFAULT_CODE_SNIPPETS[newLang]);
        setExplanation(null);
        setFlowchartData(null);
        setDebugData(null);
        setExecutionResult(null);
    }
  };

  const handleCopyMermaid = useCallback((mermaidCode: string) => {
    navigator.clipboard.writeText(mermaidCode).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
        if (!code.trim()) {
             setLoading(false);
             return;
        }

        if (mode === AppMode.EXPLAIN) {
            const result = await generateLineByLine(code, difficulty);
            setExplanation(result);
        } else if (mode === AppMode.FLOWCHART) {
            const result = await generateFlowchart(code, difficulty);
            setFlowchartData(result);
        } else if (mode === AppMode.DEBUG) {
            const result = await analyzeBugs(code, difficulty);
            setDebugData(result);
        } else if (mode === AppMode.RUN) {
            if (language === 'html') {
                // For HTML, we just set the result to display the code
                setExecutionResult({ output: code, isError: false });
                setRunKey(prev => prev + 1); // Force iframe refresh
            } else {
                const result = await runCodeSimulation(code, language);
                setExecutionResult(result);
            }
        }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui");
    } finally {
      setLoading(false);
    }
  }, [code, difficulty, mode, language]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-900 text-slate-200 overflow-hidden">
      <NavBar currentMode={mode} setMode={setMode} />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="p-3 md:p-4 border-b border-slate-700 bg-slate-900/95 backdrop-blur flex items-center justify-between z-40">
          <div className="md:hidden font-bold text-indigo-400 flex items-center gap-2 shrink-0">
             <IconTerminal size={20} /> 
             {/* Text hidden on mobile to save space */}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                <div className="flex items-center gap-2 shrink-0">
                     <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider hidden sm:inline">Bahasa:</span>
                     <select 
                        value={language} 
                        onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 sm:px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                     >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="php">PHP</option>
                        <option value="java">Java</option>
                        <option value="html">HTML</option>
                     </select>
                </div>

                <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider hidden sm:inline">Tingkat:</span>
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    {Object.values(DifficultyLevel).map((level) => (
                        <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`px-2 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-xs rounded-md transition-colors whitespace-nowrap ${
                            difficulty === level 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        >
                        {level}
                        </button>
                    ))}
                    </div>
                </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Code Input */}
          <section className="flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-slate-100 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span> 
                  Kode Sumber ({language})
                </h2>
                
                <div className="flex items-center gap-2">
                  <button 
                  onClick={handleAnalyze}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all shadow-lg 
                    ${mode === AppMode.RUN 
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' 
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
                    }
                    disabled:bg-slate-700 disabled:cursor-not-allowed ${loading ? 'animate-pulse' : ''}`}
                  >
                  {loading ? (
                      <>Sedang memproses...</>
                  ) : (
                      <>
                      {mode === AppMode.RUN ? <IconPlay size={16} fill="currentColor" /> : <IconZap size={16} />}
                      {mode === AppMode.EXPLAIN ? 'Jelaskan' : 
                      mode === AppMode.FLOWCHART ? 'Visualisasi' : 
                      mode === AppMode.DEBUG ? 'Debug' : 'Jalankan'}
                      </>
                  )}
                  </button>
                </div>
            </div>
            
            {storageError && (
               <div className="mb-3 p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-xs rounded-lg flex items-center gap-2.5">
                 <IconAlert size={14} className="text-yellow-500 shrink-0" /> 
                 <span>{storageError}</span>
               </div>
            )}
            
            <div className="flex-1 relative group flex flex-col gap-4">
                <div className="h-full rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-[#1e1e1e]">
                  <Editor
                    height="100%"
                    language={language === 'html' ? 'html' : language}
                    value={code}
                    theme="vs-dark"
                    onChange={(value) => setCode(value || "")}
                    options={{
                      minimap: { enabled: true, scale: 0.75 },
                      fontSize: 14,
                      fontFamily: 'Consolas, "Courier New", monospace',
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 },
                      cursorBlinking: 'smooth',
                      smoothScrolling: true,
                      suggest: {
                        showWords: true,
                        showSnippets: true,
                      }
                    }}
                  />
                </div>
            </div>
          </section>

          {/* Right Column: Output */}
          <section className="flex flex-col h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-100 font-medium flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${mode === AppMode.RUN ? 'bg-emerald-400' : 'bg-indigo-400'}`}></span> 
                {mode === AppMode.RUN ? 'Konsol / Output' : 'Analisis AI'}
              </h2>
              {mode === AppMode.RUN && executionResult && (
                <button 
                    onClick={() => setExecutionResult(null)}
                    className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded border border-slate-700 transition-colors"
                >
                    Bersihkan
                </button>
              )}
            </div>
            
            <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-800 p-1 overflow-hidden flex flex-col relative">
              {error && (
                <div className="p-4 m-2 bg-red-900/20 border border-red-800/50 text-red-200 rounded-lg text-sm flex items-start gap-3 absolute top-0 left-0 right-0 z-10">
                   <IconAlert className="shrink-0 mt-0.5" size={16} />
                   {error}
                </div>
              )}

              {!loading && !explanation && !flowchartData && !debugData && !executionResult && !error && (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <IconTerminal size={32} className="opacity-50" />
                    </div>
                    <p className="text-sm">
                        Masukkan kode {language} dan tekan tombol aksi untuk memulai.
                    </p>
                 </div>
              )}

              {/* EXPLAIN MODE */}
              {mode === AppMode.EXPLAIN && explanation && !loading && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="bg-indigo-900/20 border border-indigo-500/20 p-4 rounded-lg mb-4">
                    <h3 className="text-indigo-200 font-semibold text-sm mb-1 uppercase tracking-wider">Ringkasan</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{explanation.summary}</p>
                  </div>
                  
                  {/* Line by Line Breakdown */}
                  <div className="space-y-3">
                    {explanation.lines.map((line) => (
                      <div key={line.lineNumber} className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30 rounded-lg p-3 transition-all">
                        <div className="flex gap-3 items-start">
                          <span className="font-mono text-xs text-slate-500 w-6 pt-1 text-right select-none">{line.lineNumber}</span>
                          <div className="flex-1">
                            <code className="block font-mono text-xs text-indigo-300 mb-2 bg-slate-950/50 p-1.5 rounded border border-slate-800/50">{line.code}</code>
                            <p className="text-sm text-slate-300">{line.explanation}</p>
                            {line.stateChanges && (
                                <div className="mt-2 text-xs text-emerald-400/80 flex items-center gap-1.5">
                                    <IconZap size={12} /> {line.stateChanges}
                                </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Variable State Tracking Table */}
                  {explanation.lines.some(l => l.stateChanges) && (
                    <div className="mt-8 pt-6 border-t border-slate-700/50">
                        <h3 className="text-slate-200 font-semibold text-sm mb-3 flex items-center gap-2">
                           <IconActivity size={16} className="text-emerald-400"/>
                           Pelacakan Variabel (State Tracking)
                        </h3>
                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-x-auto">
                          <table className="w-full text-left text-sm min-w-[300px]">
                            <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase font-semibold">
                              <tr>
                                <th className="px-4 py-3 w-16 text-center">Baris</th>
                                <th className="px-4 py-3">Kode</th>
                                <th className="px-4 py-3">Perubahan State</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {explanation.lines.filter(l => l.stateChanges).map((line, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="px-4 py-3 text-center font-mono text-slate-500 text-xs">
                                    {line.lineNumber}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-indigo-300 truncate max-w-[150px]">
                                    {line.code}
                                  </td>
                                  <td className="px-4 py-3 text-emerald-300 font-mono text-xs">
                                    {line.stateChanges}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                    </div>
                  )}
                </div>
              )}

              {/* FLOWCHART MODE */}
              {mode === AppMode.FLOWCHART && flowchartData && !loading && (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                    <div className="bg-slate-800/80 p-3 rounded-lg mb-4 text-sm text-slate-300 border border-slate-700">
                        {flowchartData.summary}
                    </div>
                    
                    {/* Mermaid Controls */}
                    <div className="flex items-center justify-between mb-2 px-1">
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visualisasi</span>
                         <button 
                             onClick={() => handleCopyMermaid(flowchartData.mermaidCode)}
                             className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/20"
                             title="Salin kode Mermaid.js"
                         >
                            {isCopied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                            {isCopied ? 'Tersalin' : 'Salin Kode'}
                         </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center min-h-[300px] bg-slate-900/50 rounded-lg border border-slate-700/50 p-2 overflow-hidden">
                        <MermaidChart chart={flowchartData.mermaidCode} />
                    </div>
                </div>
              )}

              {/* DEBUG MODE */}
              {mode === AppMode.DEBUG && debugData && !loading && (
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Saran Mentor</h3>
                    <p className="text-slate-300 text-sm italic">"{debugData.generalAdvice}"</p>
                  </div>

                  {debugData.bugs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-emerald-400">
                          <IconCheck size={48} className="mb-4" />
                          <p>Tidak ada bug fatal ditemukan! Kerja bagus.</p>
                      </div>
                  ) : (
                      debugData.bugs.map((bug, idx) => (
                        <div key={idx} className="bg-red-950/10 border border-red-900/30 rounded-xl overflow-hidden">
                            <div className="bg-red-950/30 p-3 flex items-center justify-between border-b border-red-900/30">
                                <span className="font-mono text-xs text-red-300 bg-red-900/20 px-2 py-1 rounded">Baris/Lokasi: {bug.bugLocation}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                    bug.severity === 'Critical' ? 'bg-red-600 text-white' : 
                                    bug.severity === 'High' ? 'bg-orange-600 text-white' :
                                    'bg-yellow-600 text-white'
                                }`}>
                                    {bug.severity}
                                </span>
                            </div>
                            <div className="p-4 space-y-3">
                                <div>
                                    <h4 className="text-slate-200 font-semibold text-sm mb-1">Masalah</h4>
                                    <p className="text-slate-400 text-sm">{bug.description}</p>
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded-lg border-l-2 border-indigo-500">
                                    <h4 className="text-indigo-300 font-semibold text-xs mb-1 uppercase tracking-wide">Argumen</h4>
                                    <p className="text-slate-300 text-sm leading-relaxed">{bug.argument}</p>
                                </div>
                                <div>
                                    <h4 className="text-emerald-400 font-semibold text-xs mb-2 uppercase tracking-wide flex items-center gap-2">
                                        Perbaikan yang Disarankan <IconCheck size={12} />
                                    </h4>
                                    <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800">
                                        {bug.fix}
                                    </pre>
                                </div>
                            </div>
                        </div>
                      ))
                  )}
                </div>
              )}

              {/* RUN MODE */}
              {mode === AppMode.RUN && executionResult && !loading && (
                <div className="flex-1 flex flex-col h-full bg-[#1e1e1e]">
                    {language === 'html' ? (
                         <div className="flex-1 bg-white relative h-full w-full">
                             <iframe 
                                key={runKey}
                                title="Preview"
                                srcDoc={executionResult.output}
                                className="w-full h-full border-0 absolute inset-0"
                                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-presentation allow-downloads"
                             />
                         </div>
                    ) : (
                        <div className="flex-1 p-4 font-mono text-sm overflow-auto">
                            <div className="text-slate-400 mb-2 text-xs flex items-center gap-2">
                                <IconTerminal size={14} /> Output Terminal:
                            </div>
                            <pre className={`${executionResult.isError ? 'text-red-400' : 'text-emerald-300'} whitespace-pre-wrap break-all`}>
                                {executionResult.output}
                            </pre>
                            <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500">
                                Process finished.
                            </div>
                        </div>
                    )}
                </div>
              )}
              
              {loading && (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                      <div className="relative w-12 h-12">
                          <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                      </div>
                      <p className="text-slate-400 text-sm animate-pulse">
                          {mode === AppMode.RUN ? 'Sedang menjalankan kode...' : 'Sedang berkonsultasi dengan AI Mentor...'}
                      </p>
                  </div>
              )}
            </div>
          </section>

          {/* Mobile Footer (Shown in grid) */}
          <div className="col-span-1 lg:col-span-2 md:hidden text-center py-4 text-xs text-slate-500 opacity-50">
             &copy; {new Date().getFullYear()} Developer Asep Ripa'i
          </div>
        </main>
        
        {/* Desktop Footer (Fixed bottom) */}
        <footer className="hidden md:flex items-center justify-center py-2 text-xs text-slate-500 bg-slate-900 border-t border-slate-800 z-10">
           <span className="opacity-75">&copy; {new Date().getFullYear()} Developer Asep Ripa'i</span>
        </footer>
      </div>
    </div>
  );
};

export default App;