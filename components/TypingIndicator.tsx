'use client';

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 msg-enter">
      <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
        <span className="text-[#4ade80] text-[10px] font-mono font-medium">F</span>
      </div>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#737373]" />
          <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#737373]" />
          <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#737373]" />
        </div>
      </div>
    </div>
  );
}
