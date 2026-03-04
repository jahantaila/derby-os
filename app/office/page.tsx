"use client";

export default function OfficePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">The Office</h1>
      <div className="bg-card border border-border rounded-lg p-6 overflow-hidden">
        <div className="relative w-full" style={{ minHeight: 500, background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)" }}>
          {/* Floor */}
          <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: "repeating-conic-gradient(#2a2a4a 0% 25%, #222244 0% 50%) 0 0 / 40px 40px", imageRendering: "pixelated" }} />

          {/* Wall decorations */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2 rounded-sm" style={{ imageRendering: "pixelated" }}>
            <span className="text-white font-bold text-xs tracking-widest" style={{ fontFamily: "monospace" }}>DERBY DIGITAL HQ</span>
          </div>

          {/* Window */}
          <div className="absolute top-12 right-12 w-24 h-20 border-4 border-gray-600 bg-gradient-to-b from-indigo-900 to-indigo-950 rounded-sm">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-yellow-300 text-lg">✦</div>
            </div>
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-600" />
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-600" />
          </div>

          {/* Plant */}
          <div className="absolute bottom-24 left-8">
            <div className="text-3xl" style={{ imageRendering: "pixelated" }}>🪴</div>
          </div>

          {/* Jahan's Desk */}
          <div className="absolute bottom-24 left-16" style={{ left: "15%" }}>
            <div className="relative">
              {/* Speech bubble */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-gray-800/90 border border-gray-600 rounded-lg px-3 py-1.5 whitespace-nowrap animate-pulse">
                <span className="text-xs text-gray-300">Building DerbyFlow... 🚀</span>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 border-b border-r border-gray-600 rotate-45" />
              </div>
              {/* Character */}
              <div className="text-4xl mb-1 text-center animate-bounce" style={{ animationDuration: "3s" }}>👨‍💻</div>
              {/* Desk */}
              <div className="w-28 h-8 bg-amber-800 rounded-sm border-2 border-amber-900 flex items-center justify-center relative">
                <div className="w-10 h-6 bg-gray-700 rounded-sm border border-gray-600 flex items-center justify-center">
                  <span className="text-[6px] text-green-400 font-mono">{">"}_</span>
                </div>
                <div className="absolute -bottom-4 left-2 w-1.5 h-4 bg-amber-900" />
                <div className="absolute -bottom-4 right-2 w-1.5 h-4 bg-amber-900" />
              </div>
              {/* Nameplate */}
              <div className="bg-yellow-600 px-2 py-0.5 rounded-sm mx-auto w-fit mt-1">
                <span className="text-[8px] font-bold text-yellow-100" style={{ fontFamily: "monospace" }}>CEO - JAHAN</span>
              </div>
            </div>
          </div>

          {/* Kimberly's Desk */}
          <div className="absolute bottom-24" style={{ left: "45%" }}>
            <div className="relative">
              {/* Speech bubble */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-indigo-900/90 border border-indigo-500 rounded-lg px-3 py-1.5 whitespace-nowrap">
                <span className="text-xs text-indigo-200 typing-animation">Managing Mission Control ✨</span>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-900 border-b border-r border-indigo-500 rotate-45" />
              </div>
              {/* Character with typing animation */}
              <div className="text-4xl mb-1 text-center relative">
                <span className="inline-block animate-typing">🤖</span>
                {/* Typing particles */}
                <span className="absolute -right-2 top-0 text-xs animate-ping" style={{ animationDuration: "1.5s" }}>⚡</span>
              </div>
              {/* Desk */}
              <div className="w-28 h-8 bg-amber-800 rounded-sm border-2 border-amber-900 flex items-center justify-center gap-1 relative">
                <div className="w-10 h-6 bg-gray-700 rounded-sm border border-gray-600 flex items-center justify-center">
                  <span className="text-[6px] text-indigo-400 font-mono animate-pulse">AI</span>
                </div>
                <div className="w-3 h-4 bg-gray-600 rounded-sm" title="coffee" />
                <div className="absolute -bottom-4 left-2 w-1.5 h-4 bg-amber-900" />
                <div className="absolute -bottom-4 right-2 w-1.5 h-4 bg-amber-900" />
              </div>
              {/* Nameplate */}
              <div className="bg-indigo-600 px-2 py-0.5 rounded-sm mx-auto w-fit mt-1">
                <span className="text-[8px] font-bold text-indigo-100" style={{ fontFamily: "monospace" }}>AI COS - KIMBERLY</span>
              </div>
            </div>
          </div>

          {/* Sub-agent Desk 1 */}
          <div className="absolute bottom-24" style={{ left: "72%" }}>
            <div className="relative opacity-50">
              <div className="text-2xl mb-1 text-center">🖥️</div>
              <div className="w-24 h-7 bg-gray-700 rounded-sm border-2 border-gray-600 flex items-center justify-center relative">
                <span className="text-[7px] text-gray-400 font-mono">AVAILABLE</span>
                <div className="absolute -bottom-4 left-2 w-1.5 h-4 bg-gray-600" />
                <div className="absolute -bottom-4 right-2 w-1.5 h-4 bg-gray-600" />
              </div>
              <div className="bg-gray-600 px-2 py-0.5 rounded-sm mx-auto w-fit mt-1">
                <span className="text-[8px] text-gray-400" style={{ fontFamily: "monospace" }}>SUB-AGENT 1</span>
              </div>
            </div>
          </div>

          {/* Sub-agent Desk 2 */}
          <div className="absolute bottom-24" style={{ left: "88%" }}>
            <div className="relative opacity-50">
              <div className="text-2xl mb-1 text-center">🖥️</div>
              <div className="w-24 h-7 bg-gray-700 rounded-sm border-2 border-gray-600 flex items-center justify-center relative">
                <span className="text-[7px] text-gray-400 font-mono">AVAILABLE</span>
                <div className="absolute -bottom-4 left-2 w-1.5 h-4 bg-gray-600" />
                <div className="absolute -bottom-4 right-2 w-1.5 h-4 bg-gray-600" />
              </div>
              <div className="bg-gray-600 px-2 py-0.5 rounded-sm mx-auto w-fit mt-1">
                <span className="text-[8px] text-gray-400" style={{ fontFamily: "monospace" }}>SUB-AGENT 2</span>
              </div>
            </div>
          </div>

          {/* Coffee machine */}
          <div className="absolute bottom-28 right-8">
            <div className="text-2xl">☕</div>
            <div className="text-[7px] text-gray-500 text-center font-mono">FUEL</div>
          </div>

          {/* Another plant */}
          <div className="absolute bottom-24 right-24">
            <div className="text-2xl">🌿</div>
          </div>

          {/* Cat */}
          <div className="absolute bottom-28" style={{ left: "38%" }}>
            <div className="text-xl animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>🐈</div>
          </div>
        </div>
      </div>

      {/* Status footer */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">Jahan</div>
          <div className="text-sm font-medium text-green-400">Coding</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">Kimberly</div>
          <div className="text-sm font-medium text-indigo-400">Active</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">Sub-Agent 1</div>
          <div className="text-sm font-medium text-gray-400">Available</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">Sub-Agent 2</div>
          <div className="text-sm font-medium text-gray-400">Available</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes typing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-typing {
          animation: typing 0.6s ease-in-out infinite;
        }
        .typing-animation {
          border-right: 2px solid #818cf8;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { border-color: transparent; }
        }
      `}</style>
    </div>
  );
}
