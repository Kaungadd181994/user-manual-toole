import React, { useState, useRef, useEffect } from 'react';
import { ActiveTab, GuideData } from './types';
import BuilderTab from './components/BuilderTab';
import SettingsTab from './components/SettingsTab';
import { exportHtmlDocument } from './utils/export';
import {
  BookOpen,
  Layers,
  Settings,
  Menu,
  X,
  Video,
  Clock,
  Camera,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [guideData, setGuideData] = useState<GuideData | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('builder');
  const [instructions, setInstructions] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [analysisElapsed, setAnalysisElapsed] = useState<number>(0);
  const [screenshotRatio, setScreenshotRatio] = useState<string>('original');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load preferences from localStorage on start
  useEffect(() => {
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) setApiKey(savedKey);
    
    const savedGuide = localStorage.getItem('guideData');
    if (savedGuide) setGuideData(JSON.parse(savedGuide));
    
    const savedDark = localStorage.getItem('darkMode');
    if (savedDark) {
      setDarkMode(savedDark === 'true');
    } else {
      setDarkMode(false);
    }

    const savedInstructions = localStorage.getItem('customInstructions');
    if (savedInstructions) setInstructions(savedInstructions);
  }, []);

  // Sync preferences back to localStorage
  useEffect(() => {
    localStorage.setItem('apiKey', apiKey);
    if (guideData) {
      localStorage.setItem('guideData', JSON.stringify(guideData));
    } else {
      localStorage.removeItem('guideData');
    }
    localStorage.setItem('darkMode', String(darkMode));
    localStorage.setItem('customInstructions', instructions);
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [apiKey, guideData, darkMode, instructions]);

  const parseTimestamp = (timeStr: string): number => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    let val = 0;
    if (parts.length === 2) {
      val = parseInt(parts[0] || '0', 10) * 60 + parseFloat(parts[1] || '0');
    } else if (parts.length === 3) {
      val = parseInt(parts[0] || '0', 10) * 3600 + parseInt(parts[1] || '0', 10) * 60 + parseFloat(parts[2] || '0');
    } else {
      val = parseFloat(timeStr);
    }
    return isFinite(val) && !isNaN(val) ? val : 0;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const resultStr = reader.result as string;
        resolve(resultStr.split(',')[1]);
      };
      reader.onerror = reject;
    });
  };

  const extractFrames = (file: File, maxFrames: number = 20, onProgress?: (p: number) => void): Promise<{ timestamp: string, base64: string }[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = async () => {
        const duration = video.duration;
        if (!duration || !isFinite(duration)) {
          return reject(new Error('Cannot determine video duration.'));
        }

        const frames: { timestamp: string, base64: string }[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = video.videoWidth;
        let height = video.videoHeight;
        const MAX_DIM = 1024;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round(height * (MAX_DIM / width));
            width = MAX_DIM;
          } else {
            width = Math.round(width * (MAX_DIM / height));
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        
        let interval = duration / maxFrames;
        if (interval < 0.5) interval = 0.5; // Max 2 fps
        
        for (let time = 0.1; time < duration; time += interval) {
          video.currentTime = time;
          await new Promise((r) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              r(null);
            };
            video.addEventListener('seeked', onSeeked);
          });
          
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const base64 = dataUrl.split(',')[1];
          
          const minutes = Math.floor(time / 60).toString().padStart(2, '0');
          const seconds = Math.floor(time % 60).toString().padStart(2, '0');
          
          frames.push({
            timestamp: `${minutes}:${seconds}`,
            base64
          });
          
          if (onProgress) {
             onProgress(Math.min(100, Math.round((time / duration) * 100)));
          }
        }
        
        if (onProgress) onProgress(100);
        URL.revokeObjectURL(video.src);
        resolve(frames);
      };
      
      video.onerror = () => reject(new Error('Failed to load video to extract frames.'));
    });
  };

  const processVideo = async () => {
    if (!videoFile) {
      alert('Please select a screen recording video file.');
      return;
    }

    let timerInterval: any = null;
    try {
      setLoading(true);
      setProgress(0);
      setStatus('Step 1/3: Extracting keyframes from video locally (faster)...');
      
      const frames = await extractFrames(videoFile, 20, (p) => setProgress(p)); // max 20 frames to keep payload small and fast

      setProgress(0); // hide progress bar after extraction or reuse it for analyzing if possible. Let's just set it to 100 or hide.
      setStatus('Step 2/3: Uploading & analyzing frames with Gemini...');
      setAnalysisElapsed(0);
      
      const startTime = Date.now();
      timerInterval = setInterval(() => {
        setAnalysisElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      const payload = {
        frames,
        customApiKey: apiKey || undefined,
        instructions: instructions || undefined,
      };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      clearInterval(timerInterval);
      const responseText = await response.text();

      if (!response.ok) {
        let errMsg = `HTTP error! Status: ${response.status}`;
        try {
          const errJson = JSON.parse(responseText);
          errMsg = errJson.error || errMsg;
        } catch (_) {
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
            if (response.status === 413) {
              errMsg = "The video file size is too large for the network limit. Please try using a shorter video or compressing it.";
            } else {
              errMsg = `Server Error (${response.status}): The server returned an HTML error. This usually indicates an internal configuration issue or rate limit.`;
            }
          } else {
            errMsg = responseText || errMsg;
          }
        }
        throw new Error(errMsg);
      }

      let structuredJson: GuideData;
      try {
        structuredJson = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`Failed to parse response as JSON. Server returned: ${responseText.slice(0, 300)}`);
      }

      setStatus('Step 3/3: Mounting video canvas and extracting screenshots...');

      const videoUrl = URL.createObjectURL(videoFile);
      const videoEl = videoRef.current;
      if (!videoEl) {
        throw new Error('Video element is not initialized.');
      }

      videoEl.src = videoUrl;
      
      await new Promise<void>((resolve) => {
        const handleMetadata = () => {
          videoEl.removeEventListener('loadedmetadata', handleMetadata);
          resolve();
        };
        videoEl.addEventListener('loadedmetadata', handleMetadata);
      });

      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas element is not initialized.');
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2D context.');
      }

      for (let i = 0; i < structuredJson.steps.length; i++) {
        const step = structuredJson.steps[i];
        setStatus(`Step 3/3: Slicing screenshot frame at timestamp ${step.timestamp}...`);
        
        const seconds = parseTimestamp(step.timestamp);
        videoEl.currentTime = seconds;

        await new Promise<void>((resolve) => {
          const handleSeeked = () => {
            videoEl.removeEventListener('seeked', handleSeeked);
            resolve();
          };
          videoEl.addEventListener('seeked', handleSeeked);
        });

        const dataUrl = drawCroppedScreenshot(videoEl, canvas, screenshotRatio);
        
        try {
          step.screenshotDataUrl = dataUrl || '';
        } catch (canvasErr) {
          console.warn('Canvas export error', canvasErr);
          step.screenshotDataUrl = '';
        }
      }

      setGuideData(structuredJson);
      setStatus('✅ Guide completed successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to analyze video: ' + (err.message || String(err)));
      setStatus('');
    } finally {
      if (timerInterval) clearInterval(timerInterval);
      setLoading(false);
    }
  };

  const drawCroppedScreenshot = (videoEl: HTMLVideoElement, canvas: HTMLCanvasElement, ratio: string): string | null => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cw = videoEl.videoWidth;
    const ch = videoEl.videoHeight;
    let sw = cw;
    let sh = ch;
    let sx = 0;
    let sy = 0;

    if (ratio !== 'original') {
      const ratioMap: Record<string, number> = {
        '1:1': 1,
        '4:3': 4 / 3,
        '16:9': 16 / 9,
        '9:16': 9 / 16
      };
      const targetRatio = ratioMap[ratio] || 16/9;
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
      ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, sw, sh);
    } else {
      canvas.width = cw;
      canvas.height = ch;
      ctx.drawImage(videoEl, 0, 0, cw, ch);
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const captureScreenshotForStep = async (idx: number, explicitTimestamp?: string) => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.src) {
      if (!explicitTimestamp) {
        alert('Please upload and run a video through Gemini analysis first to enable dynamic timeline seek capturing.');
      }
      return;
    }

    try {
      let timeStr = explicitTimestamp;
      if (timeStr === undefined) {
        timeStr = guideData?.steps[idx]?.timestamp || '00:00';
      }

      const time = parseTimestamp(timeStr);
      
      if (Math.abs(videoEl.currentTime - time) > 0.01) {
        videoEl.currentTime = time;
        await new Promise<void>((resolve) => {
          let resolved = false;
          const handleSeeked = () => {
            if (resolved) return;
            resolved = true;
            videoEl.removeEventListener('seeked', handleSeeked);
            
            // Ultra-fast decode and paint trigger using play/pause + dual requestAnimationFrame
            videoEl.play().then(() => {
              videoEl.pause();
              requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
              });
            }).catch(() => {
              // Fallback if autoplay is blocked or playing fails
              if ('requestVideoFrameCallback' in videoEl) {
                (videoEl as any).requestVideoFrameCallback(() => {
                  setTimeout(resolve, 50);
                });
              } else {
                setTimeout(resolve, 150);
              }
            });
          };
          videoEl.addEventListener('seeked', handleSeeked);
          setTimeout(() => {
            if (!resolved) {
              videoEl.removeEventListener('seeked', handleSeeked);
              resolve();
            }
          }, 1500);
        });
      } else {
        // Already at target, ensure frame is decoded and painted fully
        try {
          await videoEl.play().then(() => videoEl.pause());
        } catch (e) {}
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      if (!videoEl.videoWidth || !videoEl.videoHeight) {
         console.warn("Video dimensions not ready yet");
         return;
      }

      const dataUrl = drawCroppedScreenshot(videoEl, canvas, screenshotRatio);

      setGuideData(prev => {
        if (!prev) return prev;
        const updated = { ...prev, steps: [...prev.steps] };
        if (updated.steps[idx]) {
          updated.steps[idx] = { 
            ...updated.steps[idx], 
            screenshotDataUrl: dataUrl || updated.steps[idx].screenshotDataUrl,
            timestamp: timeStr || updated.steps[idx].timestamp
          };
        }
        return updated;
      });
    } catch (err) {
      console.error(err);
      if (!explicitTimestamp) {
        alert('Failed to capture frame from video timeline.');
      }
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you absolutely sure you want to delete all local storage, custom API keys, and custom instructions? This cannot be undone.')) {
      localStorage.clear();
      setApiKey('');
      setVideoFile(null);
      setGuideData(null);
      setInstructions('');
      setDarkMode(false);
      setStatus('🧹 All application storage cleared successfully.');
    }
  };

  const handleResetGuide = () => {
    setVideoFile(null);
    setGuideData(null);
    setStatus('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col lg:flex-row transition-colors duration-300">
      
      {/* LEFT SIDEBAR (Desktop) */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 flex-col justify-between hidden lg:flex sticky top-0 h-screen z-20">
        <div className="flex flex-col flex-1">
          {/* Logo brand */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-extrabold tracking-tight text-lg block leading-none">
                BUILT
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block mt-1">
                AI Guide Builder
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 flex-1">
            <button
              onClick={() => {
                setActiveTab('builder');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 font-semibold text-sm ${
                activeTab === 'builder'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4.5 h-4.5" />
              Document Builder
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 font-semibold text-sm ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4.5 h-4.5" />
              Preferences & Rules
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Details */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/60">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white uppercase">
              {apiKey ? 'API' : 'SRV'}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs text-slate-300 font-semibold truncate">
                {apiKey ? 'Custom Key' : 'Server Key'}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                {apiKey ? 'Authenticated' : 'Zero-Config'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-full text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            How it works?
          </button>
        </div>
      </aside>

      {/* MOBILE NAVIGATION HEADER */}
      <header className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-extrabold tracking-tight text-base">
            BUILT
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col justify-between p-4 animate-fade-in border-t border-slate-800">
          <div className="space-y-2">
            <button
              onClick={() => {
                setActiveTab('builder');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'builder' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Layers className="w-5 h-5" />
              Document Builder
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Settings className="w-5 h-5" />
              Preferences & Rules
            </button>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 space-y-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                {apiKey ? 'API' : 'SRV'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs text-slate-300 font-semibold">
                  {apiKey ? 'Custom Key' : 'Server Key'}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">
                  {apiKey ? 'Authenticated' : 'Zero-Config'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                setShowHelpModal(true);
              }}
              className="w-full text-center py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              How it works?
            </button>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE WRAPPER */}
      <main className="flex-1 flex flex-col overflow-x-hidden min-w-0">
        
        {/* Workspace Breadcrumbs Header (Desktop-only) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 px-6 lg:px-8 hidden lg:flex items-center justify-between sticky top-0 z-15 bg-opacity-90 dark:bg-opacity-90 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Guide Workspace</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-slate-900 dark:text-white font-semibold">
              {guideData ? guideData.guide_title : 'Create New Guide'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Dark Mode toggle on header */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition"
              title="Toggle Dark Mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {guideData && (
              <>
                <button
                  onClick={handleResetGuide}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={() => exportHtmlDocument(guideData)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  Export Guide Report
                </button>
              </>
            )}
          </div>
        </header>

        {/* DASHBOARD CONTENT BODY */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl w-full mx-auto">
          
          {/* Header section on mobile (as breadcrumbs header is desktop-only) */}
          <div className="lg:hidden flex flex-wrap justify-between items-center gap-2 pb-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {activeTab === 'builder' ? 'Document Builder' : 'Preferences & Rules'}
            </h1>
            
            {guideData && activeTab === 'builder' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleResetGuide}
                  className="flex-1 sm:flex-initial px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Reset
                </button>
                <button
                  onClick={() => exportHtmlDocument(guideData)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                >
                  Export HTML
                </button>
              </div>
            )}
          </div>

          {/* REAL-TIME OVERVIEW STATS WIDGETS */}
          {activeTab === 'builder' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
              {/* Stat Card 1 */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Source Screen Recording
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block truncate mt-1">
                    {videoFile ? videoFile.name : 'Waiting for video...'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Video className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(2)} MB Payload` : 'Upload video below'}
                  </span>
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Captured Steps Progress
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                    {guideData ? guideData.steps.length : '0'} Steps
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: guideData ? '100%' : '0%' }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Gemini AI Status
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1">
                    {loading ? 'Processing...' : guideData ? 'Ready & Synced' : 'Ready to Analyze'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className={`w-2.5 h-2.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : guideData ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                  <span className="font-semibold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wide">
                    {loading ? 'AI Working' : guideData ? 'Documentation Live' : 'Idle'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE CONTENT VIEW */}
          {activeTab === 'builder' ? (
            <BuilderTab
              apiKey={apiKey}
              guideData={guideData}
              setGuideData={setGuideData}
              videoFile={videoFile}
              setVideoFile={setVideoFile}
              loading={loading}
              progress={progress}
              analysisTimeMs={analysisElapsed}
              statusMessage={status}
              instructions={instructions}
              onChangeInstructions={setInstructions}
              onProcessVideo={processVideo}
              onCaptureScreenshotForStep={captureScreenshotForStep}
              onExport={() => guideData && exportHtmlDocument(guideData)}
              onResetGuide={handleResetGuide}
              videoRef={videoRef}
              screenshotRatio={screenshotRatio}
              onRatioChange={setScreenshotRatio}
            />
          ) : (
            <SettingsTab
              apiKey={apiKey}
              onChangeApiKey={setApiKey}
              instructions={instructions}
              onChangeInstructions={setInstructions}
              onClearAll={handleClearAllData}
            />
          )}

        </div>
      </main>

      {/* Hidden elements for dynamic local browser canvas processing */}
      <video
        ref={videoRef}
        className="hidden"
        style={{ display: 'none' }}
        playsInline
        muted
        crossOrigin="anonymous"
      />
      <canvas ref={canvasRef} className="hidden" style={{ display: 'none' }} />

      {/* Beautiful Modal popup for explanation guide */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-6 h-6" />
              <h2 className="text-lg font-bold">About AI Guide Builder</h2>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              AI Guide Builder makes visual training guides, standard operating procedures (SOPs), and tutorial manuals in minutes:
            </p>

            <div className="space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex gap-2">
                <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">AI Timeline Analysis:</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gemini automatically logs each click, panel shift, and step along with the precise timestamps.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Camera className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Canvas Capture Slicing:</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The app seeks the local video stream in your browser to extract crystal-clear screenshot JPG files. No data is sent to external image servers.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Full Editing Toolbar:</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Modify text directly, drag to reorder actions, insert custom elements, or trigger snapshot recapture instantly.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-md shadow-blue-500/10"
              >
                Let's Build!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
