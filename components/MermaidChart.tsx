import React, { useEffect, useRef, useState } from 'react';

interface MermaidChartProps {
  chart: string;
}

declare global {
  interface Window {
    mermaid: any;
  }
}

export const MermaidChart: React.FC<MermaidChartProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !window.mermaid) return;
      
      try {
        window.mermaid.initialize({ 
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          themeVariables: {
            primaryColor: '#1e293b',
            primaryTextColor: '#e2e8f0',
            primaryBorderColor: '#6366f1',
            lineColor: '#818cf8',
            secondaryColor: '#334155',
            tertiaryColor: '#475569',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
          }
        });
        
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await window.mermaid.render(id, chart);
        setSvg(svg);
        setError('');
      } catch (e) {
        console.error("Mermaid render error:", e);
        setError("Gagal merender diagram alur. Sintaks mungkin tidak valid.");
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return <div className="p-4 text-red-400 bg-red-900/20 rounded-lg text-sm border border-red-800">{error}</div>;
  }

  return (
    <div className="w-full h-full flex flex-col items-center transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 rounded-xl cursor-default">
      <style>{`
        /* Animated Edges */
        .edgePath .path {
          stroke: #818cf8 !important; 
          stroke-width: 2px !important;
          stroke-dasharray: 10;
          animation: flowAnimation 1s linear infinite; /* Faster animation for visible flow */
        }
        
        @keyframes flowAnimation {
          from {
            stroke-dashoffset: 100;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        /* Node Styling */
        .node rect, .node circle, .node polygon {
          fill: #1e293b !important;
          stroke: #6366f1 !important;
          stroke-width: 2px !important;
          transition: all 0.3s ease;
        }

        .node:hover rect, .node:hover circle, .node:hover polygon {
          fill: #334155 !important;
          stroke: #a5b4fc !important;
        }
        
        .node .label {
          color: #f1f5f9 !important;
          font-weight: 600;
        }
        
        .marker {
            fill: #818cf8 !important;
            stroke: #818cf8 !important;
        }
      `}</style>
      <div 
        ref={ref}
        className="w-full overflow-x-auto flex justify-center p-6"
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
    </div>
  );
};