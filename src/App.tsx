/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1,
  Maximize, 
  Tv, 
  Youtube, 
  Sparkles, 
  RotateCcw, 
  Info, 
  ExternalLink, 
  Shield, 
  EyeOff, 
  Trash2, 
  Check, 
  AlertCircle,
  Clock,
  History,
  KeyRound,
  Compass,
  CornerDownRight,
  BookOpen,
  Volume
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Declaration for YouTube types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface VideoHistoryItem {
  id: string;
  url: string;
  title: string;
  author: string;
  timestamp: number;
}

const PRESET_VIDEOS = [
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop - Chill Beats to Study/Relax To',
    author: 'ChilledCow / Lofi Girl',
    category: 'Lofi Music'
  },
  {
    id: 'M0AWBn_7y74',
    title: 'Nature 4K - Relaxing Forest Walk & Stream',
    author: 'Cat Trumpet',
    category: 'Relief Ambient'
  },
  {
    id: 'c0_ejQQcrwI',
    title: 'Rainy Night Coffee Shop ambience & Cozy Lofi',
    author: 'Rainy Cafe Ambient',
    category: 'Rain Ambient'
  },
  {
    id: '4xDzrJKXfYI',
    title: 'Synthwave Radio - Synth & Outrun Retro Beats',
    author: 'Lofi Records Retro',
    category: 'Retro Outrun'
  }
];

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoAuthor, setVideoAuthor] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState('1');
  const [quality, setQuality] = useState('default');
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [ytApiReady, setYtApiReady] = useState(false);

  // References
  const playerRef = useRef<any>(null);
  const playerContainerId = 'youtube-iframe-player';
  const seekIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationUpdateCount = useRef(0);

  // Extract ID function
  const extractId = (url: string): string | null => {
    const regExp = /(?:v=|youtu\.be\/|embed\/|shorts\/|watch\?v=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // On first load, load search history and YouTube script if needed
  useEffect(() => {
    // Load local storage history
    try {
      const saved = localStorage.getItem('yt_private_player_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load player history', e);
    }

    // Load Youtube Iframe API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        setYtApiReady(true);
      };
    } else {
      setYtApiReady(true);
    }

    return () => {
      stopProgressTracker();
    };
  }, []);

  // Sync state changes from fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in the input
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skip(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skip(5);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, isMuted, duration, currentTime, activeVideoId]);

  // Load a video by ID
  const handleLoadVideo = (id: string, customTitle?: string, customAuthor?: string) => {
    setErrorMsg('');
    setActiveVideoId(id);
    setVideoTitle(customTitle || 'Đang tải video...');
    setVideoAuthor(customAuthor || 'Kênh YouTube');
    setPlaybackSpeed('1');
    setQuality('default');

    // Reset timelines
    setCurrentTime(0);
    setDuration(0);

    // Instantiate or load
    if (window.YT && window.YT.Player) {
      initOrLoadPlayer(id);
    } else {
      // Wait for API
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initOrLoadPlayer(id);
        }
      }, 100);
    }
  };

  const initOrLoadPlayer = (id: string) => {
    if (playerRef.current && playerRef.current.loadVideoById) {
      try {
        playerRef.current.loadVideoById({
          videoId: id,
          suggestedQuality: 'default'
        });
        playerRef.current.setVolume(isMuted ? 0 : volume);
        playerRef.current.setPlaybackRate(1);
        setIsPlaying(true);
        return;
      } catch (err) {
        console.error('Error reloading video', err);
      }
    }

    // Destroy existing player container contents
    const container = document.getElementById(playerContainerId);
    if (container) {
      container.innerHTML = '';
    }

    try {
      playerRef.current = new window.YT.Player(playerContainerId, {
        videoId: id,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          showinfo: 0,
          iv_load_policy: 3,
          fs: 1,
          playsinline: 1,
          enablejsapi: 1
        },
        events: {
          onReady: (e: any) => onPlayerReady(e, id),
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });
    } catch (e) {
      console.error('Failed to create YouTube Player instance', e);
      setErrorMsg('Không thể khởi tạo trình phát YouTube. Thử lại.');
    }
  };

  const onPlayerReady = (event: any, id: string) => {
    const targetPlayer = event.target;
    
    // Set proper volume
    targetPlayer.setVolume(isMuted ? 0 : volume);
    targetPlayer.setPlaybackRate(parseFloat(playbackSpeed));
    
    // Get info
    const data = targetPlayer.getVideoData();
    let title = 'Video riêng tư';
    let author = 'Kênh YouTube';
    
    if (data) {
      title = data.title || title;
      author = data.author || author;
    }

    setVideoTitle(title);
    setVideoAuthor(author);
    
    const dur = targetPlayer.getDuration() || 0;
    setDuration(dur);

    // Add to history
    addToHistory({
      id,
      url: `https://youtube.com/watch?v=${id}`,
      title,
      author,
      timestamp: Date.now()
    });

    // Let the custom layout clip pointer events
    const iframe = document.querySelector(`#video-wrapper iframe`);
    if (iframe) {
      (iframe as HTMLElement).style.pointerEvents = 'none';
    }

    setIsPlaying(true);
    startProgressTracker();
  };

  const onPlayerStateChange = (event: any) => {
    const state = event.data;
    // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
    
    // Periodically fetch dynamic title updates if they weren't available immediately
    if (state === 1) { // PLAYING
      setIsPlaying(true);
      startProgressTracker();

      // Retrieve titles inside gameplay if empty
      if (playerRef.current && playerRef.current.getVideoData) {
        const info = playerRef.current.getVideoData();
        if (info && info.title && videoTitle === 'Đang tải video...') {
          setVideoTitle(info.title);
          setVideoAuthor(info.author || 'Kênh YouTube');
        }
      }
    } else {
      setIsPlaying(false);
      if (state !== 3) { // Not buffering
        stopProgressTracker();
      }
    }
  };

  const onPlayerError = (event: any) => {
    const code = event.data;
    const msgs: Record<number, string> = {
      2: 'Đường dẫn YouTube chứa ID video không đúng cấu trúc.',
      5: 'Sự cố lỗi trình chiếu HTML5 xảy ra với video này.',
      100: 'Không tìm thấy video này (Có thể đã xóa hoặc để riêng tư).',
      101: 'Chủ sở hữu video không cho phép phát dưới dạng nhúng bên ngoài.',
      150: 'Nhà phát hành video đã chặn tính năng nhúng ngoài trang YouTube.'
    };
    setErrorMsg(msgs[code] || `Phát sinh lỗi kỹ thuật khi tải video này (Mã: ${code}). Vui lòng thử link khác.`);
    setIsPlaying(false);
    stopProgressTracker();
  };

  // Helper progress tracking
  const startProgressTracker = () => {
    stopProgressTracker();
    seekIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const curr = playerRef.current.getCurrentTime() || 0;
        setCurrentTime(curr);

        // Periodically refresh duration in case player loads it lazily
        if (duration === 0 || durationUpdateCount.current < 5) {
          const dur = playerRef.current.getDuration() || 0;
          if (dur > 0) {
            setDuration(dur);
            durationUpdateCount.current++;
          }
        }
      }
    }, 250);
  };

  const stopProgressTracker = () => {
    if (seekIntervalRef.current) {
      clearInterval(seekIntervalRef.current);
      seekIntervalRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const id = extractId(urlInput);
    if (!id) {
      setErrorMsg('Đường dẫn YouTube không hợp lệ. Hãy kiểm tra lại định dạng link của bạn.');
      return;
    }

    handleLoadVideo(id);
  };

  // Skip time forward or backward
  const skip = (seconds: number) => {
    if (!playerRef.current || !playerRef.current.getCurrentTime) return;
    const curr = playerRef.current.getCurrentTime();
    const dest = Math.max(0, Math.min(duration, curr + seconds));
    playerRef.current.seekTo(dest, true);
    setCurrentTime(dest);
  };

  const handleSeek = (val: string) => {
    if (!playerRef.current || !playerRef.current.seekTo) return;
    const ratio = parseFloat(val);
    const dest = (ratio / 100) * duration;
    playerRef.current.seekTo(dest, true);
    setCurrentTime(dest);
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const adjustVolume = (v: number) => {
    setVolume(v);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(isMuted ? 0 : v);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(nextMuted ? 0 : volume);
    }
  };

  const adjustSpeed = (speedStr: string) => {
    setPlaybackSpeed(speedStr);
    if (playerRef.current && playerRef.current.setPlaybackRate) {
      playerRef.current.setPlaybackRate(parseFloat(speedStr));
    }
  };

  const adjustQuality = (qStr: string) => {
    setQuality(qStr);
    if (playerRef.current && playerRef.current.setPlaybackQuality) {
      playerRef.current.setPlaybackQuality(qStr);
    }
  };

  const toggleFullscreen = () => {
    const wrapper = document.getElementById('video-wrapper');
    if (!wrapper) return;

    if (!document.fullscreenElement) {
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen();
      } else if ((wrapper as any).webkitRequestFullscreen) {
        (wrapper as any).webkitRequestFullscreen();
      } else if ((wrapper as any).mozRequestFullScreen) {
        (wrapper as any).mozRequestFullScreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Add video item to local history
  const addToHistory = (item: VideoHistoryItem) => {
    setHistory((prev) => {
      // Avoid duplicate recent entries
      const filtered = prev.filter((p) => p.id !== item.id);
      const updated = [item, ...filtered].slice(0, 8); // Keep last 8 items
      try {
        localStorage.setItem('yt_private_player_history', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save player history element', e);
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('yt_private_player_history');
    } catch (e) {}
  };

  // Utility formatting
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-rose-500/30 selection:text-white overflow-x-hidden relative flex flex-col justify-between py-6 px-4 md:px-8">
      
      {/* Ambient background glows */}
      <div className="absolute top-[3%] left-[10%] w-[500px] h-[500px] rounded-full bg-rose-500/5 blur-[120px] animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-[5%] right-[10%] w-[450px] h-[450px] rounded-full bg-red-600/5 blur-[120px] animate-pulse-glow pointer-events-none" />

      <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-5 flex-1">
        
        {/* Top Header Navigation (Bento style) */}
        <header className="flex flex-col md:flex-row items-center justify-between bg-slate-900/40 border border-slate-800/80 rounded-2xl px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-rose-600/20">
              <Youtube className="w-5 h-5 text-white fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg tracking-wider text-white">
                  PLAYBACK<span className="text-rose-500">PRIVATE</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Secure Client
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Bảo mật thiết bị · Chặn quảng cáo rác · Tránh thuật toán theo dõi</p>
            </div>
          </div>
          
          <nav className="flex gap-6 text-xs font-semibold text-slate-400 my-3 md:my-0">
            <span className="text-slate-300 border-b-2 border-rose-500 pb-1">Private Hub</span>
            <span className="hover:text-white transition-colors cursor-help" title="Local Sandbox environment">Sandbox Mode</span>
            <span className="hover:text-white transition-colors cursor-help" title="No Cloud storage logs">Local Sync Only</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-mono">v2.5.0-stable</p>
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                <span>Encrypted</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
              <Shield className="w-5 h-5 text-rose-500" />
            </div>
          </div>
        </header>

        {/* Bento Grid layout grid */}
        <div className="grid grid-cols-12 gap-5 flex-1">
          
          {/* Bento Block 1: CORE PROCESSOR PLAYER (Spans 12 or 8 on large devices, rows 2) */}
          <div className="col-span-12 lg:col-span-8 bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-5 border-b border-slate-800/60 pb-5">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Core Engine Player
                </span>
                <h2 className="text-xl md:text-2xl font-bold font-display text-white mt-1 select-all" title={videoTitle}>
                  {activeVideoId ? videoTitle : 'Awaiting video source...'}
                </h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <span>Tác giả:</span>
                  <span className="text-rose-400 font-mono font-medium">{activeVideoId ? videoAuthor : 'Chưa tải'}</span>
                </p>
              </div>

              {activeVideoId && (
                <div className="flex gap-2 shrink-0">
                  <span className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-mono flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>Layout Clipped</span>
                  </span>
                </div>
              )}
            </div>

            {/* Embed Video section */}
            <div className="flex-1 bg-black/50 rounded-2xl border border-slate-800/80 overflow-hidden relative shadow-inner min-h-[300px] md:min-h-[360px] flex items-center justify-center">
              
              <div 
                id="video-wrapper" 
                className="relative w-full h-full aspect-video bg-neutral-950 overflow-hidden"
              >
                {/* Embedded YouTube Target container */}
                {activeVideoId ? (
                  <div className="absolute top-[-60px] left-0 w-full h-[calc(100%+120px)] pointer-events-none">
                    <div id={playerContainerId} className="w-full h-full" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-neutral-950/90 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 relative group">
                      <div className="absolute inset-0 rounded-xl bg-rose-500/10 blur group-hover:blur-md transition-all duration-300" />
                      <Youtube className="w-12 h-12 text-slate-500 group-hover:text-rose-500 transition-colors duration-300 relative z-10" />
                    </div>
                    <div>
                      <p className="font-display font-medium text-slate-200 text-base md:text-lg">Trình phát đa phương tiện tối giản bảo mật</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2">
                        Nhập đường dẫn phát video trực tiếp ở bảng bên cạnh, hoặc thử một trong những dự án ghi âm thư giãn đặc sắc có sẵn.
                      </p>
                    </div>
                  </div>
                )}

                {/* Secure Click Shield protecting interactions */}
                {activeVideoId && (
                  <div 
                    id="click-shield" 
                    className="absolute inset-0 z-10 cursor-default"
                    onDoubleClick={toggleFullscreen}
                    onClick={togglePlay}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                )}
              </div>
            </div>

            {/* Custom Interactive Player Controls */}
            {activeVideoId ? (
              <div className="mt-6 flex flex-col gap-4">
                
                {/* Custom Seek Bar & time indicator */}
                <div className="flex flex-col gap-1.5 bg-black/20 p-3 rounded-xl border border-slate-800/40">
                  <div className="relative group">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={duration > 0 ? (currentTime / duration) * 100 : 0} 
                      onChange={(e) => handleSeek(e.target.value)}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer outline-none transition-all duration-150 group-hover:h-2"
                      style={{
                        background: `linear-gradient(to right, #e11d48 0%, #e11d48 ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #1e293b ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #1e293b 100%)`
                      }}
                    />
                  </div>
                  
                  {/* Timer Displays */}
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="bg-[#0a0a0c] px-2.5 py-0.5 rounded border border-slate-800 text-slate-300">
                      {formatTime(currentTime)}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">PROGRESS: {duration > 0 ? Math.round((currentTime / duration) * 100) : 0}%</span>
                    <span className="bg-[#0a0a0c] px-2.5 py-0.5 rounded border border-slate-800 text-slate-300">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Stream Settings / Controls Console */}
                <div className="grid grid-cols-12 gap-3">
                  
                  {/* Left Controls: Play / Seek (Span 6) */}
                  <div className="col-span-12 sm:col-span-6 bg-slate-950/50 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={togglePlay}
                        className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/10 active:scale-95 transition-all duration-200"
                        title="Phát / Tạm dừng (Space)"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>TẠM DỪNG</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>PHÁT</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                        <button 
                          onClick={() => skip(-10)}
                          className="p-2 text-[10px] font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                          title="Lùi 10s (←)"
                        >
                          -10S
                        </button>
                        <span className="w-px h-3 bg-slate-800" />
                        <button 
                          onClick={() => skip(10)}
                          className="p-2 text-[10px] font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                          title="Tiến 10s (→)"
                        >
                          +10S
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 font-bold font-mono uppercase hidden xs:block">Playback Status</p>
                  </div>

                  {/* Middle Controls: Audio Engine (Span 6) */}
                  <div className="col-span-12 sm:col-span-6 bg-slate-950/50 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
                        title="Tắt tiếng (M)"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-rose-500" />
                        ) : volume < 40 ? (
                          <Volume1 className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-rose-400" />
                        )}
                      </button>
                      
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 px-2 py-1 rounded-xl">
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => adjustVolume(parseInt(e.target.value))}
                          className="w-16 sm:w-20 md:w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 outline-none"
                        />
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-800/80 px-2 py-1 rounded">
                      {isMuted ? 'MUTED' : `VOL: ${volume}%`}
                    </span>
                  </div>

                  {/* Speed Selector (Span 4) */}
                  <div className="col-span-12 xs:col-span-5 md:col-span-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1 font-mono">Tốc độ</span>
                    <select 
                      value={playbackSpeed}
                      onChange={(e) => adjustSpeed(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-white py-1 px-2.5 focus:outline-none focus:border-rose-500/50 cursor-pointer font-mono font-semibold"
                    >
                      <option value="0.25">0.25×</option>
                      <option value="0.5">0.5×</option>
                      <option value="0.75">0.75×</option>
                      <option value="1">1.0× Std</option>
                      <option value="1.25">1.25×</option>
                      <option value="1.5">1.5×</option>
                      <option value="1.75">1.75×</option>
                      <option value="2">2.0×</option>
                    </select>
                  </div>

                  {/* Resolution Selector (Span 4) */}
                  <div className="col-span-12 xs:col-span-5 md:col-span-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1 font-mono">Độ phân giải</span>
                    <select 
                      value={quality}
                      onChange={(e) => adjustQuality(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-white py-1 px-2.5 focus:outline-none focus:border-rose-500/50 cursor-pointer font-mono font-semibold"
                    >
                      <option value="default">Auto</option>
                      <option value="hd1080">1080p Full-HD</option>
                      <option value="hd720">720p HD</option>
                      <option value="large">480p Pro</option>
                      <option value="medium">360p Compact</option>
                      <option value="small">240p Lite</option>
                    </select>
                  </div>

                  {/* Screen Toggle (Span 4) */}
                  <div className="col-span-12 xs:col-span-2 md:col-span-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-center">
                    <button 
                      onClick={toggleFullscreen}
                      className="w-full h-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider font-mono"
                      title="Toàn màn hình (F)"
                    >
                      {isFullscreen ? (
                        <>
                          <Tv className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="hidden md:inline">Thu nhỏ</span>
                        </>
                      ) : (
                        <>
                          <Maximize className="w-4 h-4 shrink-0" />
                          <span className="hidden md:inline">Toàn màn</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="mt-6 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-5 flex items-start gap-3.5">
                <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 leading-relaxed">
                  <p className="font-semibold text-slate-300 mb-1">Sandbox Environment Ready</p>
                  Hệ thống đang hoạt động trong môi trường ảo hóa tách biệt. Toàn bộ hành vi phát sóng, cấu hình cá nhân hoặc lịch sử tìm kiếm sẽ chỉ tồn tại trên thiết bị hiện hành để bảo đảm bạn an toàn tuyệt đối trước các công cụ bám đuôi theo dõi bên thứ ba.
                </div>
              </div>
            )}
          </div>

          {/* Bento Block 2: INPUT CONTROLLER CONSOLE (Spans 4 columns) */}
          <div className="col-span-12 lg:col-span-4 bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700/60 transition-all duration-300 relative overflow-hidden group">
            
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Handler Handshake
              </span>
              <h3 className="text-xl font-bold font-display text-white mt-1">Core Input Handler</h3>
              <p className="text-xs text-slate-400 mt-1">Nạp nguồn tài nguyên streaming YouTube bảo an</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 my-3">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Dán đường dẫn hoặc chuỗi ID video..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-9 rounded-xl bg-black/60 border border-slate-800 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/20 transition-all duration-200"
                />
                {urlInput && (
                  <button 
                    type="button"
                    onClick={() => setUrlInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
              <button 
                type="submit"
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/10 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current text-white" />
                <span>Nạp Video nguồn</span>
              </button>
            </form>

            {/* Error Message Panel */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-400 flex items-start gap-2 overflow-hidden mb-3"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="leading-tight">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Preset Videos Grid (Bento mini panel) */}
            <div className="bg-black/40 rounded-2xl border border-slate-800/80 p-4 mt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3 h-3 text-rose-400" /> Tuyển tập Ambient Thư giãn
              </span>
              
              <div className="grid grid-cols-1 gap-2">
                {PRESET_VIDEOS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleLoadVideo(p.id, p.title, p.author)}
                    className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-left border border-slate-800/60 hover:border-slate-700/60 transition-all flex items-center justify-between gap-2.5 group/btn"
                    title={p.title}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/10 group-hover/btn:bg-rose-500/20">
                        <Youtube className="w-3.5 h-3.5 text-rose-400 fill-current" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-200 truncate group-hover/btn:text-rose-400 transition-colors">
                          {p.title}
                        </p>
                        <p className="text-[9px] text-slate-500 truncate">{p.category}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-500 shrink-0 uppercase bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">Phát</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active System Diagnoses indicator */}
            <div className="flex gap-2.5 items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850 mt-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-400 font-mono font-bold">API PROTOCOL: ACTIVE</span>
              </div>
              <span className="text-slate-500 font-mono">STABLE GATEWAY</span>
            </div>
          </div>

          {/* Bento Block 3: QUICK BRIGHT CONFIG - HOTKEY CARD (Spans 4 columns) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-gradient-to-br from-rose-600 via-red-600 to-amber-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between group">
            
            {/* Visual background element */}
            <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-105 transition-all duration-300 pointer-events-none" />

            <div className="z-10 relative">
              <div className="h-10 w-10 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#fecdd3]/90 bg-white/10 px-2 py-0.5 rounded-full border border-white/5 inline-block mb-2">Controls profile</span>
              <h3 className="text-lg md:text-xl font-bold font-display">Bàn phím tắt nhanh</h3>
              <p className="text-rose-100 text-xs mt-1 leading-relaxed">Điều hướng trình phát siêu tốc không cần chạm chuột.</p>
            </div>

            <div className="my-5 space-y-2.5 z-10 relative bg-black/10 p-3.5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-rose-100/90 font-medium">Bật / Tạm dừng video</span>
                <kbd className="px-2 py-0.5 bg-white text-rose-600 rounded text-[10px] font-mono font-bold shadow-md">Space</kbd>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-rose-100/90 font-medium">Tua lại / Tua tiến 5 giây</span>
                <kbd className="px-2 py-0.5 bg-white text-rose-600 rounded text-[10px] font-mono font-bold shadow-md">← / →</kbd>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-rose-100/90 font-medium">Toàn màn hình (Fullscreen)</span>
                <kbd className="px-2 py-0.5 bg-white text-rose-600 rounded text-[10px] font-mono font-bold shadow-md">F</kbd>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-rose-100/90 font-medium">Tắt / Bật tiếng nhanh</span>
                <kbd className="px-2 py-0.5 bg-white text-rose-600 rounded text-[10px] font-mono font-bold shadow-md">M</kbd>
              </div>
            </div>

            <p className="text-[10px] text-rose-200 font-medium z-10 relative">
              *Không hoạt động khi bạn đang nhấp chọn trong hộp điền link.
            </p>
          </div>

          {/* Bento Block 4: HISTORICAL DATA ENGINE (Spans 4 columns) */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700/60 transition-all duration-300 relative">
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Local History Logs
                  </span>
                  <h3 className="text-xl font-bold font-display text-white mt-1">Lịch sử xem</h3>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-850"
                  >
                    <Trash2 className="w-3 h-3 text-rose-500" />
                    <span>Dọn sạch</span>
                  </button>
                )}
              </div>

              {/* History stack container */}
              <div className="my-3 font-mono text-xs text-slate-300">
                {history.length === 0 ? (
                  <div className="py-12 px-4 rounded-2xl bg-black/30 border border-slate-800/80 flex flex-col items-center justify-center text-center gap-2.5">
                    <Clock className="w-7 h-7 text-slate-600 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-400">Chưa ghi nhận video</p>
                    <p className="text-[10px] text-slate-600 max-w-[200px] leading-tight">Video đã phát sẽ hiển thị tự động tại đây để bạn truy xuất nhanh lần sau.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[178px] overflow-y-auto pr-1">
                    {history.map((h) => (
                      <div 
                        key={`${h.id}-${h.timestamp}`}
                        className="group bg-slate-950 hover:bg-slate-950/40 rounded-xl p-2.5 border border-slate-850 flex items-start gap-2.5 transition-all relative overflow-hidden"
                      >
                        <button 
                          onClick={() => handleLoadVideo(h.id, h.title, h.author)}
                          className="absolute inset-0 z-10 w-full h-full text-left cursor-pointer"
                          aria-label={`Play ${h.title}`}
                        />
                        
                        <div className="w-7 h-7 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 z-20 group-hover:border-rose-500/20 transition-all">
                          <Youtube className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-500 transition-colors" />
                        </div>

                        <div className="flex-1 min-w-0 z-20">
                          <p className="text-[11px] font-bold text-slate-200 truncate group-hover:text-rose-400 transition-colors">
                            {h.title}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 font-sans">
                            <span className="truncate">{h.author}</span>
                            <span className="shrink-0 font-mono text-slate-600">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-3.5 mt-3 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-normal">
                Ứng dụng chỉ lưu trữ cục bộ tạm thời (cookie-less). Mọi hành tung không phân tích lưu trữ về máy chủ.
              </p>
            </div>
          </div>

          {/* Bento Block 5: ADD COMPONENT BOX (Spans 4 columns) */}
          <div className="col-span-12 md:col-span-12 lg:col-span-4 bg-slate-900/90 border border-slate-800/80 border-dashed border-2 rounded-3xl p-6 flex flex-col justify-center items-center gap-3 opacity-60 hover:opacity-100 transition-all duration-300">
            <div className="w-12 h-12 border border-slate-700/80 rounded-full flex items-center justify-center bg-slate-950 shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">Custom widgets</span>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-snug">Hệ trình chiếu riêng tư luôn sẵn sàng tiếp nhận.</p>
            </div>
          </div>

        </div>

        {/* Bottom Status bar (Bento styled footer details) */}
        <footer className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 border-t border-slate-800/60 mt-4 text-[10px] text-slate-500 gap-4">
          <div className="flex flex-wrap gap-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">SANDBOX LIVE UPDATES</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">Lat: <span className="text-emerald-400">12ms (Direct CDN)</span></span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">CPU Core: <span className="text-slate-300">Optimal (Client Handlers)</span></span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">Tracking: <span className="text-rose-500 font-bold">DISABLED</span></span>
            </div>
          </div>
          <div className="text-[10px] text-slate-600 font-medium font-mono text-center sm:text-right uppercase tracking-wider">
            © {new Date().getFullYear()} Playback Private · Deployed on Edge CDN
          </div>
        </footer>

      </div>
    </div>
  );
}
