import React, { useRef, useState } from 'react';
import { Upload, Film, Sparkles, RefreshCw, Plus, FileCode, CheckCircle, ChevronRight, Info, Trash2 } from 'lucide-react';
import { GuideData, GuideStep } from '../types';
import StepCard from './StepCard';

interface BuilderTabProps {
  apiKey: string;
  guideData: GuideData | null;
  setGuideData: React.Dispatch<React.SetStateAction<GuideData | null>>;
  videoFile: File | null;
  setVideoFile: (file: File | null) => void;
  loading: boolean;
  progress?: number;
  statusMessage: string;
  instructions: string;
  onChangeInstructions: (inst: string) => void;
  onProcessVideo: () => void;
  onCaptureScreenshotForStep: (idx: number, timestamp?: string) => Promise<void>;
  onExport: () => void;
  onResetGuide: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  screenshotRatio: string;
  onRatioChange: (ratio: string) => void;
  analysisTimeMs?: number;
}

export default function BuilderTab({
  apiKey,
  guideData,
  setGuideData,
  videoFile,
  setVideoFile,
  loading,
  progress = 0,
  analysisTimeMs = 0,
  statusMessage,
  instructions,
  onChangeInstructions,
  onProcessVideo,
  onCaptureScreenshotForStep,
  onExport,
  onResetGuide,
  videoRef,
  screenshotRatio,
  onRatioChange
}: BuilderTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setVideoFile(files[0]);
    }
  };

  // Step operations
  const handleFieldChange = (index: number | null, key: keyof GuideData | keyof GuideStep, value: any) => {
    if (!guideData) return;
    const updated = { ...guideData };
    if (index === null) {
      (updated as any)[key] = value;
    } else {
      (updated.steps[index] as any)[key] = value;
    }
    setGuideData(updated);
  };

  const handleMoveStep = (idx: number, direction: number) => {
    if (!guideData) return;
    const steps = [...guideData.steps];
    const target = idx + direction;
    if (target < 0 || target >= steps.length) return;
    
    // Swap steps
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    
    // Recalculate step numbers
    steps.forEach((step, i) => {
      step.step_number = i + 1;
    });

    setGuideData({ ...guideData, steps });
  };

  const handleDeleteStep = (idx: number) => {
    if (!guideData) return;
    if (window.confirm(`Are you sure you want to delete Step ${idx + 1}?`)) {
      const steps = guideData.steps
        .filter((_, i) => i !== idx)
        .map((step, i) => ({ ...step, step_number: i + 1 }));
      setGuideData({ ...guideData, steps });
    }
  };

  const handleAddManualStep = () => {
    if (!guideData) return;
    const nextStepNum = guideData.steps.length + 1;
    const newSteps = [
      ...guideData.steps,
      {
        step_number: nextStepNum,
        timestamp: '00:00',
        title: 'New Manual Action Step',
        action: 'Describe the action detail here...',
        visual_cue: 'What is visible on screen...',
        screenshotDataUrl: '',
      }
    ];
    setGuideData({ ...guideData, steps: newSteps });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!guideData && !loading ? (
        /* Video Upload Form */
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-10 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[280px] shadow-sm ${
              dragOver
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                : videoFile
                ? 'border-emerald-500/60 bg-emerald-50/10 dark:bg-emerald-950/10 hover:border-emerald-500'
                : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-400 dark:hover:border-slate-700'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {videoFile ? (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/10">
                  <Film className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate max-w-sm mx-auto">
                    {videoFile.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Size: {(videoFile.size / 1024 / 1024).toFixed(2)} MB • Click or drag to replace video source
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-md shadow-indigo-500/5">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Upload Screen Recording
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed mx-auto">
                    Drag and drop your screen recording video file here, or click to choose from your device. Supports common video container extensions.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Analysis instructions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                AI Guide Custom Directives / Tone (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => onChangeInstructions(e.target.value)}
                placeholder="Examples: 'Focus heavily on the checkout steps', 'Translate the guide into professional Spanish', or 'Format with technical enterprise terminology'."
                rows={3}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all duration-200 resize-none placeholder-slate-400 dark:placeholder-slate-600"
              />
            </div>

            {/* Mode selection notification */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/30 dark:border-indigo-900/30 text-xs text-slate-600 dark:text-slate-400">
              <Info className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {apiKey ? '🚀 Custom Gemini API Key Detected' : '✨ Zero-Config Server API Key Active'}
                </span>
                <p className="mt-1 leading-relaxed">
                  {apiKey
                    ? 'The application will prioritize your custom-provided Gemini credentials located in Preferences.'
                    : 'The backend will seamlessly manage token streams utilizing pre-configured server-side Google AI Studio keys. Safe, fast, and secure.'}
                </p>
              </div>
            </div>

            <button
              onClick={onProcessVideo}
              disabled={!videoFile}
              className="w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm tracking-wide transition shadow-lg shadow-indigo-500/10 focus:outline-none flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4.5 h-4.5" />
              Analyze & Generate Documentation
            </button>
          </div>
        </div>
      ) : loading ? (
        /* Progress Screen */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-8 md:p-10 shadow-sm text-center max-w-lg mx-auto space-y-6">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500 animate-spin"></div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Analyzing Recording Timeline
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-4">
              {statusMessage || 'Gemini is evaluating individual keyframes...'}
            </p>
            {analysisTimeMs > 0 && (
              <p className="text-xs font-mono text-indigo-500 font-semibold">
                Processing time: {analysisTimeMs}s
              </p>
            )}
          </div>

          {/* Staggered checklist */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 text-left max-w-xs mx-auto space-y-3.5">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Read video container streams</span>
            </div>
            <div className={`flex items-center gap-3 text-xs font-semibold ${
              statusMessage.includes('Step 1') ? 'text-blue-500' : statusMessage.includes('Step 2') || statusMessage.includes('Step 3') || statusMessage.includes('built') || statusMessage.includes('✅') ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
            }`}>
              {statusMessage.includes('Step 2') || statusMessage.includes('Step 3') || statusMessage.includes('built') || statusMessage.includes('✅') ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
              )}
              <span>Analyze video tracks with Gemini 2.5 Flash</span>
            </div>
            <div className={`flex items-center gap-3 text-xs font-semibold ${
              statusMessage.includes('Step 3') ? 'text-blue-500' : statusMessage.includes('✅') ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
            }`}>
              {statusMessage.includes('✅') ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : statusMessage.includes('Step 3') ? (
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
              <span>Capture precise step screenshots</span>
            </div>
          </div>
          
          {progress > 0 && progress < 100 && (
            <div className="w-full max-w-xs mx-auto mt-6">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                <span>Extraction Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Guide Editor & Viewer */
        <div className="space-y-6">
          {/* Quick Toolbar for Desktop/Mobile layout consistency */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm lg:hidden">
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-sm"
            >
              <FileCode className="w-4 h-4" />
              Export HTML
            </button>
            <button
              onClick={onResetGuide}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-xs"
            >
              <Trash2 className="w-4 h-4" />
              Start Over
            </button>
          </div>

          {/* Guide Level Metadata Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Guide Documentation Title
              </label>
              <input
                type="text"
                value={guideData!.guide_title}
                onChange={(e) => handleFieldChange(null, 'guide_title', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-950 px-3.5 py-2.5 rounded-xl text-lg md:text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
                placeholder="Give your user guide a clear title..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={guideData!.target_audience}
                  onChange={(e) => handleFieldChange(null, 'target_audience', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-950 px-3.5 py-2.5 rounded-xl border border-transparent focus:border-blue-500 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
                  placeholder="e.g. End Users, Operations, Admin"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Total Captured Steps
                </label>
                <div className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 border border-transparent select-none flex items-center min-h-[46px]">
                  {guideData!.steps.length} Steps Logged
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Screenshot Crop Ratio
                </label>
                <select
                  value={screenshotRatio}
                  onChange={(e) => onRatioChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-950 px-3.5 py-2.5 rounded-xl border border-transparent focus:border-blue-500 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
                >
                  <option value="original">Original Aspect Ratio</option>
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="4:3">4:3 (Standard)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="9:16">9:16 (Vertical)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Executive Overview / Summary
              </label>
              <textarea
                value={guideData!.summary}
                onChange={(e) => handleFieldChange(null, 'summary', e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-950 p-3.5 rounded-xl border border-transparent focus:border-blue-500 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 resize-none"
                placeholder="Briefly describe what goals are achieved in this step-by-step guide..."
              />
            </div>
          </div>

          {/* List of Steps */}
          <div className="space-y-6">
            {guideData!.steps.map((step, idx) => {
              const nextStep = guideData!.steps[idx + 1];
              const parseTime = (timeStr: string) => {
                const parts = timeStr.split(':');
                if (parts.length === 2) return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
                return parseFloat(timeStr) || 0;
              };
              const c = parseTime(step.timestamp);
              const n = nextStep ? parseTime(nextStep.timestamp) : 0;
              const durationSecs = (n && n > c) ? Math.round(n - c) : undefined;
              
              return (
                <StepCard
                  key={idx}
                  step={step}
                  index={idx}
                  totalSteps={guideData!.steps.length}
                  durationSecs={durationSecs}
                  onMoveUp={() => handleMoveStep(idx, -1)}
                  onMoveDown={() => handleMoveStep(idx, 1)}
                  onDelete={() => handleDeleteStep(idx)}
                  onCaptureScreenshot={(timestamp?: string) => onCaptureScreenshotForStep(idx, timestamp)}
                  onFieldChange={(key, value) => handleFieldChange(idx, key, value)}
                  screenshotRatio={screenshotRatio}
                />
              );
            })}
          </div>

          {/* Add Manual Step Trigger */}
          <button
            onClick={handleAddManualStep}
            className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-slate-700 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-blue-500/5 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Insert Manual Instructional Step
          </button>
        </div>
      )}
    </div>
  );
}
