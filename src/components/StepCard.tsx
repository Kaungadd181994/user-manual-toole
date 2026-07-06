import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Trash2, Camera, Clock, HelpCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { GuideStep } from '../types';

interface StepCardProps {
  key?: React.Key;
  step: GuideStep;
  index: number;
  totalSteps: number;
  durationSecs?: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onCaptureScreenshot: (timestamp?: string) => Promise<void> | void;
  onFieldChange: (key: keyof GuideStep, value: any) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  screenshotRatio?: string;
}

const parseTimestamp = (ts: string) => {
  if (!ts) return 0;
  const parts = ts.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

export default function StepCard({
  step,
  index,
  totalSteps,
  durationSecs,
  onMoveUp,
  onMoveDown,
  onDelete,
  onCaptureScreenshot,
  onFieldChange,
  videoRef,
  screenshotRatio,
}: StepCardProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [lastCapturedTimestamp, setLastCapturedTimestamp] = useState(step.timestamp);
  const hoverCanvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-capture screenshot when timestamp is manually edited to a valid format
  useEffect(() => {
    const isValidTimestamp = (ts: string) => {
      return /^\d{1,2}:\d{2}(?:\.\d{1,3})?$/.test(ts);
    };

    if (step.timestamp !== lastCapturedTimestamp && isValidTimestamp(step.timestamp)) {
      const handler = setTimeout(async () => {
        setIsCapturing(true);
        try {
          await onCaptureScreenshot(step.timestamp);
          setLastCapturedTimestamp(step.timestamp);
        } catch (err) {
          console.error("Auto-capture failed:", err);
        } finally {
          setIsCapturing(false);
        }
      }, 350); // 350ms debounce for typing
      return () => clearTimeout(handler);
    }
  }, [step.timestamp, lastCapturedTimestamp, onCaptureScreenshot]);

  const getAspectRatioStyle = () => {
    if (!screenshotRatio || screenshotRatio === 'original') return { aspectRatio: '16/9' }; // fallback
    return { aspectRatio: screenshotRatio.replace(':', '/') };
  };

  useEffect(() => {
    if (isHovering && videoRef?.current && hoverCanvasRef.current) {
      const video = videoRef.current;
      const canvas = hoverCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const seconds = parseTimestamp(step.timestamp);
      
      const drawFrame = () => {
        if (video.videoWidth && video.videoHeight) {
          const cw = video.videoWidth;
          const ch = video.videoHeight;
          let sw = cw;
          let sh = ch;
          let sx = 0;
          let sy = 0;

          if (screenshotRatio && screenshotRatio !== 'original') {
            const ratioMap: Record<string, number> = {
              '1:1': 1,
              '4:3': 4 / 3,
              '16:9': 16 / 9,
              '9:16': 9 / 16
            };
            const targetRatio = ratioMap[screenshotRatio] || 16/9;
            const videoRatio = cw / ch;

            if (videoRatio > targetRatio) {
              sw = ch * targetRatio;
              sx = (cw - sw) / 2;
            } else {
              sh = cw / targetRatio;
              sy = (ch - sh) / 2;
            }
            canvas.width = sw;
            canvas.height = sh;
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
          } else {
            canvas.width = cw;
            canvas.height = ch;
            ctx.drawImage(video, 0, 0, cw, ch);
          }
        }
      };

      const handleSeeked = () => {
        if ('requestVideoFrameCallback' in video) {
          (video as any).requestVideoFrameCallback(() => {
            setTimeout(drawFrame, 50);
          });
        } else {
          setTimeout(drawFrame, 250);
        }
        video.removeEventListener('seeked', handleSeeked);
      };

      video.addEventListener('seeked', handleSeeked);
      video.currentTime = seconds;

      // Draw immediately just in case it's already there or loaded
      drawFrame();

      return () => {
        video.removeEventListener('seeked', handleSeeked);
      };
    }
  }, [isHovering, step.timestamp, videoRef]);

  const handleRecapture = async () => {
    setIsCapturing(true);
    try {
      await onCaptureScreenshot(step.timestamp);
      setLastCapturedTimestamp(step.timestamp);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div 
      className="relative group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-200 grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] gap-5 items-start"
    >
      
      {/* Control Actions Panel (Positioned cleanly to remain usable and responsive) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200/60 dark:border-slate-700/60 shadow-sm"
          title="Move Step Up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === totalSteps - 1}
          className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200/60 dark:border-slate-700/60 shadow-sm"
          title="Move Step Down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/30 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors border border-red-200/40 dark:border-red-900/40 shadow-sm"
          title="Delete Step"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* LEFT COLUMN: Screenshot Media Block */}
      <div className="flex flex-col gap-3 w-full">
        <div 
          className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center group/img shadow-inner w-full cursor-crosshair"
          style={getAspectRatioStyle()}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          
          {/* Base Screenshot */}
          {step.screenshotDataUrl ? (
            <img
              src={step.screenshotDataUrl}
              alt={`Step ${step.step_number} frame`}
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <div className="text-center p-4">
              <Camera className="w-8 h-8 text-slate-500 dark:text-slate-600 mx-auto mb-2 stroke-[1.5]" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">No Screen Capture</p>
            </div>
          )}

          {/* Dynamic Video Hover Preview Canvas */}
          <canvas 
            ref={hoverCanvasRef}
            className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Screenshot Hover Overlay (Shown when hovering directly over the image) */}
          <div className="absolute inset-0 bg-slate-900/55 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1px] z-20">
            <button
              onClick={handleRecapture}
              disabled={isCapturing}
              className="px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-50 text-xs font-bold shadow-md flex items-center gap-2 transition-all transform scale-95 group-hover/img:scale-100 focus:outline-none"
            >
              <Camera className={`w-4 h-4 text-indigo-600 ${isCapturing ? 'animate-spin' : ''}`} />
              {isCapturing ? 'Capturing...' : 'Capture Frame'}
            </button>
          </div>
        </div>

        {/* Video sync / Timestamp fields */}
        <div className="flex items-center justify-between gap-2.5 px-1 mt-1.5">
          <div className="flex items-center gap-1.5 select-none">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Video Sync
              {durationSecs !== undefined && ` • ${durationSecs}s`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={step.timestamp}
              onChange={(e) => onFieldChange('timestamp', e.target.value)}
              onBlur={() => {
                const isValid = /^\d{1,2}:\d{2}(?:\.\d{1,3})?$/.test(step.timestamp);
                if (step.timestamp !== lastCapturedTimestamp && isValid) {
                  handleRecapture();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const isValid = /^\d{1,2}:\d{2}(?:\.\d{1,3})?$/.test(step.timestamp);
                  if (step.timestamp !== lastCapturedTimestamp && isValid) {
                    handleRecapture();
                    (e.target as HTMLInputElement).blur();
                  }
                }
              }}
              className="w-16 px-2 py-1 text-center text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
              placeholder="00:00"
              title="Timestamp MM:SS"
            />
            <button
              onClick={handleRecapture}
              disabled={isCapturing}
              className={`p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition ${isCapturing ? 'opacity-50' : ''}`}
              title="Recapture screenshot at current timestamp"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCapturing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Form Fields */}
      <div className="space-y-4 w-full min-w-0">
        {/* Step badge + Title */}
        <div className="space-y-1.5 pr-14 md:pr-20">
          <div className="flex items-center">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 uppercase tracking-wider select-none">
              Step {step.step_number}
            </span>
          </div>
          <input
            type="text"
            value={step.title}
            onChange={(e) => onFieldChange('title', e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/60 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 px-3 py-2 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 border border-transparent focus:border-indigo-500 transition-all duration-150"
            placeholder="Give this step an action title..."
          />
        </div>

        {/* Action input */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none">
            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
            User Action Instruction
          </label>
          <textarea
            value={step.action}
            onChange={(e) => onFieldChange('action', e.target.value)}
            rows={2}
            className="w-full bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/60 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 p-3 rounded-xl border border-transparent focus:border-indigo-500 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-150 resize-none break-words"
            placeholder="Describe exactly what action the user needs to perform here..."
          />
        </div>

        {/* Visual Cue input */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none">
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            Visual Feedback / Expected Result
          </label>
          <input
            type="text"
            value={step.visual_cue}
            onChange={(e) => onFieldChange('visual_cue', e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/60 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 px-3 py-2 rounded-xl border border-transparent focus:border-indigo-500 text-sm italic text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all duration-150"
            placeholder="Describe what visual change occurs on the screen (e.g. 'A sidebar slides out with results')..."
          />
        </div>
      </div>

    </div>
  );
}
