import React, { useState, useEffect, useRef } from 'react';
import {
  AreaColor,
  AREA_COLOR_MAP,
  CapturedItem,
  CaptureArea,
  CaptureFormat,
  DEFAULT_KALMURI_SETTINGS,
  DEFAULT_PRESET_SIZES,
  ExtractedColor,
  FloatingPinItem,
  KalmuriSettings,
  PresetSize,
  RECOMMENDED_CAPTURE_SHORTCUTS,
  validateCaptureShortcut,
} from '../types/kalmuri';
import {
  buildColorInfo,
  captureDomRegion,
  copyCaptureToClipboard,
  extractTextFromRegion,
  generateFileName,
  playShutterSound,
  triggerFileDownload,
} from '../services/kalmuriEngine';

interface KalmuriCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (item: CapturedItem) => void;
  activeChatPeerName?: string;
}

export function KalmuriCapture({
  isOpen,
  onClose,
  onSendToChat,
  activeChatPeerName,
}: KalmuriCaptureProps) {
  // Settings
  const [settings, setSettings] = useState<KalmuriSettings>(() => {
    try {
      const saved = localStorage.getItem('kalmuri_settings');
      if (saved) {
        return { ...DEFAULT_KALMURI_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_KALMURI_SETTINGS;
  });

  // Save settings on update
  useEffect(() => {
    try {
      localStorage.setItem('kalmuri_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Captures history / folder items
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  // Floating pinned captures (플러팅)
  const [floatingPins, setFloatingPins] = useState<FloatingPinItem[]>([]);
  // Color palette items
  const [colorPalette, setColorPalette] = useState<ExtractedColor[]>([]);
  const [liveColor, setLiveColor] = useState<ExtractedColor>(() =>
    buildColorInfo(37, 99, 235)
  );

  // Sub-dialogs
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrTextResult, setOcrTextResult] = useState('');
  const [showColorModal, setShowColorModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showWebpageModal, setShowWebpageModal] = useState(false);

  // Drag capture overlay state
  const [isDraggingArea, setIsDraggingArea] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Control capture state
  const [isDetectingControl, setIsDetectingControl] = useState(false);
  const [hoveredControlRect, setHoveredControlRect] = useState<DOMRect | null>(null);

  // Color picker inspection mode
  const [isColorInspecting, setIsColorInspecting] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Area frame window state (for 'area' capture)
  const [areaFrame, setAreaFrame] = useState({
    x: 120,
    y: 100,
    width: 640,
    height: 480,
    visible: true,
  });

  // Main floating widget position
  const [widgetPos, setWidgetPos] = useState({ x: 30, y: 70 });
  const [isDraggingWidget, setIsDraggingWidget] = useState(false);
  const widgetDragRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  // UI Popups inside Main Window
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Mouse coordinate tracker for cursor inclusion
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 400, y: 300 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      if (isColorInspecting) {
        // Sample color under cursor
        const r = (e.clientX * 7) % 256;
        const g = (e.clientY * 11) % 256;
        const b = ((e.clientX + e.clientY) * 13) % 256;
        setLiveColor(buildColorInfo(r, g, b));
      }

      if (isDetectingControl) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el && !el.closest('[data-kalmuri-tool]')) {
          setHoveredControlRect(el.getBoundingClientRect());
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isColorInspecting, isDetectingControl]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (settings.maxRecordDurationSec > 0 && s + 1 >= settings.maxRecordDurationSec) {
            handleStopRecording();
            return s + 1;
          }
          if (
            (settings.format === 'GIF_ANIM' || settings.format === 'WEBP_ANIM') &&
            s + 1 >= 60
          ) {
            handleStopRecording();
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordSeconds(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording, settings.format, settings.maxRecordDurationSec]);

  // Global capture shortcut listener (PrintScreen, F11, or custom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea, unless it's PrintScreen or F11
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      let triggered = false;

      // 1. Check primary shortcut (PrintScreen)
      if (e.key === 'PrintScreen') {
        triggered = true;
      }
      // 2. Check alternative web-friendly shortcut (F11)
      else if (e.key === 'F11' && !isInput) {
        e.preventDefault();
        triggered = true;
      }
      // 3. Check custom shortcut key
      else if (!isInput && settings.shortcutKey) {
        const keyParts: string[] = [];
        if (e.ctrlKey) keyParts.push('Ctrl');
        if (e.shiftKey) keyParts.push('Shift');
        if (e.altKey) keyParts.push('Alt');
        keyParts.push(e.key.toUpperCase());
        const combination = keyParts.join('+');

        if (
          combination.toUpperCase() ===
          settings.shortcutKey.toUpperCase().replace(/\s+/g, '')
        ) {
          e.preventDefault();
          triggered = true;
        }
      }

      if (triggered) {
        handleTriggerCaptureAction();
      }

      // Esc key cancels drag overlay, control detection, or color inspecting
      if (e.key === 'Escape') {
        if (isDraggingArea) {
          setIsDraggingArea(false);
          setDragStart(null);
          setDragCurrent(null);
        }
        if (isDetectingControl) {
          setIsDetectingControl(false);
          setHoveredControlRect(null);
        }
        if (isColorInspecting) {
          setIsColorInspecting(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    settings.shortcutKey,
    settings.area,
    settings.format,
    isRecording,
    isDraggingArea,
    isDetectingControl,
    isColorInspecting,
    areaFrame,
  ]);

  // Main trigger capture action
  const handleTriggerCaptureAction = () => {
    // If currently recording, stop it
    if (isRecording) {
      handleStopRecording();
      return;
    }

    // Check if recording format
    if (
      settings.format === 'MP4' ||
      settings.format === 'GIF_ANIM' ||
      settings.format === 'WEBP_ANIM'
    ) {
      handleStartRecording();
      return;
    }

    // Check capture area type
    switch (settings.area) {
      case 'fullscreen':
        executeCapture({
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        });
        break;
      case 'area':
        executeCapture({
          x: areaFrame.x,
          y: areaFrame.y,
          width: areaFrame.width,
          height: areaFrame.height,
        });
        break;
      case 'drag':
        // Activate drag selection overlay
        setIsDraggingArea(true);
        break;
      case 'activewindow': {
        // Locate active dialog or main window
        const activeWin =
          document.querySelector('[role="dialog"]') ||
          document.querySelector('.lmc-window-surface') ||
          document.body;
        const rect = activeWin.getBoundingClientRect();
        executeCapture({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
        break;
      }
      case 'control':
        // Activate control highlighter
        setIsDetectingControl(true);
        break;
      case 'webpage':
        setShowWebpageModal(true);
        break;
      case 'color':
        // Pick color at current mouse position
        handlePickCurrentColor();
        break;
    }
  };

  // Execute snapshot of given bounds
  const executeCapture = async (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    // Shutter sound
    if (settings.captureSound === 'pre') {
      playShutterSound();
    }

    try {
      const snap = await captureDomRegion(
        rect,
        settings.includeCursorCapture,
        mousePosRef.current,
        settings.format,
        settings.jpgQuality
      );

      const fileName = generateFileName(
        settings.namingRule,
        settings.format,
        capturedItems
      );

      const ocrText =
        settings.format === 'TXT'
          ? extractTextFromRegion(rect, settings.ocrLang)
          : undefined;

      const newItem: CapturedItem = {
        id: `cap-${Date.now()}`,
        fileName,
        format: settings.format,
        timestamp: Date.now(),
        width: snap.width,
        height: snap.height,
        dataUrl: snap.dataUrl,
        ocrText,
        fileSize: snap.fileSize,
      };

      setCapturedItems((prev) => [newItem, ...prev]);

      // Post sound
      if (settings.captureSound === 'post') {
        playShutterSound();
      }

      // Auto clipboard copy if enabled or format is CLIPBOARD
      if (settings.autoClipboardCopy || settings.format === 'CLIPBOARD') {
        await copyCaptureToClipboard(newItem);
      }

      // Handle special formats
      if (settings.format === 'TXT') {
        setOcrTextResult(ocrText || '');
        setShowOcrModal(true);
      } else if (settings.format === 'FLOATING') {
        // Pin floating image
        setFloatingPins((prev) => [
          ...prev,
          {
            id: `pin-${Date.now()}`,
            dataUrl: snap.dataUrl,
            width: Math.min(snap.width, 420),
            height: Math.min(snap.height, 320),
            x: Math.max(20, rect.x),
            y: Math.max(20, rect.y),
            title: fileName,
          },
        ]);
      } else if (settings.format === 'PRINTER') {
        handlePrintImage(snap.dataUrl);
      } else if (settings.format === 'IMAGE_SHARE') {
        setShowFolderModal(true);
      }
    } catch (err) {
      console.error('Capture error:', err);
    }
  };

  // Start recording
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordSeconds(0);
    if (settings.captureSound === 'pre') {
      playShutterSound();
    }
  };

  // Stop recording and save file
  const handleStopRecording = () => {
    setIsRecording(false);
    if (settings.captureSound === 'post') {
      playShutterSound();
    }

    const duration = recordSeconds || 1;
    const isGif = settings.format === 'GIF_ANIM';
    const isWebp = settings.format === 'WEBP_ANIM';
    const fmt = isGif ? 'GIF_ANIM' : isWebp ? 'WEBP_ANIM' : 'MP4';
    const fileName = generateFileName(settings.namingRule, fmt, capturedItems);

    const newItem: CapturedItem = {
      id: `rec-${Date.now()}`,
      fileName,
      format: fmt,
      timestamp: Date.now(),
      width: settings.area === 'area' ? areaFrame.width : window.innerWidth,
      height: settings.area === 'area' ? areaFrame.height : window.innerHeight,
      dataUrl: '/resources/images/video_sample.png',
      isVideo: true,
      durationSec: duration,
      fileSize: duration * (isGif ? 180000 : 350000),
    };

    setCapturedItems((prev) => [newItem, ...prev]);
    setShowFolderModal(true);
  };

  // Pick color
  const handlePickCurrentColor = () => {
    const col = liveColor;
    setColorPalette((prev) => [col, ...prev.slice(0, 19)]);
    setShowColorModal(true);
  };

  // Print helper
  const handlePrintImage = (dataUrl: string) => {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`
        <html>
          <head><title>Kalmuri Print</title></head>
          <body style="margin:0; display:flex; align-items:center; justify-content:center;">
            <img src="${dataUrl}" style="max-width:100%; height:auto;" onload="window.print();window.close();"/>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  // Area frame nudging with arrow keys
  const handleAreaFrameKeyDown = (e: React.KeyboardEvent) => {
    const step = e.ctrlKey ? 10 : 1;
    if (e.shiftKey) {
      // Resize
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setAreaFrame((prev) => ({ ...prev, width: prev.width + step }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setAreaFrame((prev) => ({ ...prev, width: Math.max(50, prev.width - step) }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAreaFrame((prev) => ({ ...prev, height: prev.height + step }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAreaFrame((prev) => ({ ...prev, height: Math.max(50, prev.height - step) }));
      }
    } else {
      // Move
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setAreaFrame((prev) => ({ ...prev, x: prev.x + step }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setAreaFrame((prev) => ({ ...prev, x: prev.x - step }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAreaFrame((prev) => ({ ...prev, y: prev.y + step }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAreaFrame((prev) => ({ ...prev, y: prev.y - step }));
      }
    }
  };

  const areaColorCfg = AREA_COLOR_MAP[settings.areaColor] || AREA_COLOR_MAP.blue;

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* ================= 1. KALMURI MAIN COMPACT FLOATING BAR ================= */}
      <div
        data-kalmuri-tool="true"
        style={{
          left: `${widgetPos.x}px`,
          top: `${widgetPos.y}px`,
        }}
        className="fixed z-50 w-72 bg-[#ece9d8] border-2 border-[#0054e3] rounded-t-md shadow-2xl select-none text-xs font-sans"
        onContextMenu={(e) => {
          e.preventDefault();
          setShowContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {/* Title Bar */}
        <div
          className="h-6 px-2 bg-gradient-to-r from-[#0054e3] via-[#2673f2] to-[#0046c7] text-white flex items-center justify-between cursor-move"
          onMouseDown={(e) => {
            setIsDraggingWidget(true);
            widgetDragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              initX: widgetPos.x,
              initY: widgetPos.y,
            };

            const handleMove = (ev: MouseEvent) => {
              setWidgetPos({
                x: Math.max(
                  0,
                  Math.min(
                    window.innerWidth - 290,
                    widgetDragRef.current.initX + (ev.clientX - widgetDragRef.current.startX)
                  )
                ),
                y: Math.max(
                  32,
                  Math.min(
                    window.innerHeight - 150,
                    widgetDragRef.current.initY + (ev.clientY - widgetDragRef.current.startY)
                  )
                ),
              });
            };

            const handleUp = () => {
              setIsDraggingWidget(false);
              window.removeEventListener('mousemove', handleMove);
              window.removeEventListener('mouseup', handleUp);
            };

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
          }}
        >
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-[11px]">
            <span>📸</span>
            <span>칼무리 (Kalmuri)</span>
            <span className="text-[10px] opacity-80 font-normal">v1.4.0.0</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              title="환경설정"
              className="w-4 h-4 rounded hover:bg-white/20 flex items-center justify-center text-[10px] cursor-pointer"
            >
              ⚙
            </button>
            <button
              type="button"
              onClick={onClose}
              title="닫기 (트레이/메뉴에서 다시 열 수 있음)"
              className="w-4 h-4 rounded hover:bg-red-600 flex items-center justify-center font-bold text-[10px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="p-2 space-y-2 bg-[#f5f4ee]">
          {/* Top Big Card: Capture Area (캡쳐영역) */}
          <div className="relative">
            <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
              캡쳐영역 (무엇을 캡처할지 선택)
            </label>
            <button
              type="button"
              onClick={() => {
                setShowAreaDropdown((v) => !v);
                setShowFormatDropdown(false);
              }}
              className="w-full h-9 px-2.5 bg-white border border-[#7f9db9] hover:border-[#0054e3] rounded flex items-center justify-between text-left font-bold text-slate-800 shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-base">
                  {settings.area === 'fullscreen' && '🖥️'}
                  {settings.area === 'area' && '🔲'}
                  {settings.area === 'drag' && '✂️'}
                  {settings.area === 'activewindow' && '🪟'}
                  {settings.area === 'control' && '🎯'}
                  {settings.area === 'webpage' && '🌐'}
                  {settings.area === 'color' && '🎨'}
                </span>
                <span className="truncate">
                  {settings.area === 'fullscreen' && '전체화면 캡쳐'}
                  {settings.area === 'area' && '영역화면 캡쳐'}
                  {settings.area === 'drag' && '드래그영역 캡쳐'}
                  {settings.area === 'activewindow' && '활성중인 화면 캡쳐'}
                  {settings.area === 'control' && '윈도우 컨트롤 캡쳐'}
                  {settings.area === 'webpage' && '웹페이지 캡쳐'}
                  {settings.area === 'color' && '색상 추출'}
                </span>
              </div>
              <span className="text-[10px] text-gray-500">▾</span>
            </button>

            {/* Dropdown: Capture Areas */}
            {showAreaDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-400 shadow-xl rounded py-1 text-xs">
                {[
                  { id: 'fullscreen', label: '전체화면 캡쳐', icon: '🖥️', desc: '화면 전체' },
                  { id: 'area', label: '영역화면 캡쳐', icon: '🔲', desc: '테두리 창 안쪽 (늘 같은 자리)' },
                  { id: 'drag', label: '드래그영역 캡쳐', icon: '✂️', desc: '마우스로 끈 부분' },
                  { id: 'activewindow', label: '활성중인 화면 캡쳐', icon: '🪟', desc: '지금 쓰는 창 하나' },
                  { id: 'control', label: '윈도우 컨트롤 캡쳐', icon: '🎯', desc: '마우스 커서 아래 요소' },
                  { id: 'webpage', label: '웹페이지 캡쳐', icon: '🌐', desc: '웹 페이지 전체(스크롤 끝까지)' },
                  { id: 'color', label: '색상 추출', icon: '🎨', desc: '커서 아래의 색상 코드' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSettings({ ...settings, area: item.id as CaptureArea });
                      setShowAreaDropdown(false);
                      if (item.id === 'area') {
                        setAreaFrame((prev) => ({ ...prev, visible: true }));
                      } else if (item.id === 'color') {
                        setIsColorInspecting(true);
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between cursor-pointer ${
                      settings.area === item.id
                        ? 'bg-blue-100 font-bold text-blue-900'
                        : 'hover:bg-[#0054e3] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] opacity-70">{item.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Dropdown Box: Storage Format (저장형식) */}
          <div className="relative">
            <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
              저장형식 (어떻게 남길지 선택)
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowFormatDropdown((v) => !v);
                  setShowAreaDropdown(false);
                }}
                className="flex-1 h-8 px-2.5 bg-white border border-[#7f9db9] hover:border-[#0054e3] rounded flex items-center justify-between text-left font-medium text-slate-800 shadow-xs cursor-pointer"
              >
                <span className="truncate">
                  {settings.format === 'PNG' && 'PNG'}
                  {settings.format === 'JPG' && 'JPG'}
                  {settings.format === 'GIF' && 'GIF'}
                  {settings.format === 'BMP' && 'BMP'}
                  {settings.format === 'WebP' && 'WebP'}
                  {settings.format === 'MP4' && 'MP4 (동영상 화면녹화)'}
                  {settings.format === 'GIF_ANIM' && 'GIF (움짤 녹화)'}
                  {settings.format === 'WEBP_ANIM' && 'WebP (움짤 녹화)'}
                  {settings.format === 'TXT' && 'TXT (글자 인식 OCR)'}
                  {settings.format === 'CLIPBOARD' && '클립보드 (복사)'}
                  {settings.format === 'IMAGE_SHARE' && '이미지창고 (웹 링크)'}
                  {settings.format === 'PRINTER' && '프린터 (즉시 인쇄)'}
                  {settings.format === 'FLOATING' && '플러팅 (화면에 띄우기)'}
                </span>
                <span className="text-[10px] text-gray-500">▾</span>
              </button>

              {/* Quality box if JPG or WebP */}
              {(settings.format === 'JPG' || settings.format === 'WebP') && (
                <select
                  value={settings.jpgQuality}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jpgQuality: parseInt(e.target.value, 10),
                      webpQuality: parseInt(e.target.value, 10),
                    })
                  }
                  title="품질 (Quality 60~100)"
                  className="w-16 h-8 bg-white border border-[#7f9db9] rounded px-1 text-xs font-semibold"
                >
                  <option value={100}>100</option>
                  <option value={90}>90</option>
                  <option value={80}>80</option>
                  <option value={70}>70</option>
                  <option value={60}>60</option>
                </select>
              )}

              {/* OCR Language box if TXT */}
              {settings.format === 'TXT' && (
                <select
                  value={settings.ocrLang}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ocrLang: e.target.value as 'ko' | 'en' | 'ja' | 'zh',
                    })
                  }
                  title="문자 인식 언어"
                  className="w-20 h-8 bg-white border border-[#7f9db9] rounded px-1 text-xs font-semibold"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="zh">中文</option>
                </select>
              )}
            </div>

            {/* Dropdown: Formats */}
            {showFormatDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-400 shadow-xl rounded py-1 text-xs">
                {[
                  { id: 'PNG', label: 'PNG (이미지 파일)' },
                  { id: 'JPG', label: 'JPG (품질 조절 가능)' },
                  { id: 'GIF', label: 'GIF (이미지 파일)' },
                  { id: 'BMP', label: 'BMP (비트맵 파일)' },
                  { id: 'WebP', label: 'WebP (고효율 이미지)' },
                  { id: 'MP4', label: 'MP4 (화면 동영상 녹화)' },
                  { id: 'GIF_ANIM', label: 'GIF (움짤 녹화, 최대 60초)' },
                  { id: 'WEBP_ANIM', label: 'WebP (움짤 녹화, 최대 60초)' },
                  { id: 'TXT', label: 'TXT (글자 인식 OCR)' },
                  { id: 'CLIPBOARD', label: '클립보드 (파일 없이 복사)' },
                  { id: 'IMAGE_SHARE', label: '이미지창고 (웹 링크 공유)' },
                  { id: 'PRINTER', label: '프린터 (즉시 인쇄)' },
                  { id: 'FLOATING', label: '플러팅 (화면에 항상 위 띄우기)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSettings({ ...settings, format: item.id as CaptureFormat });
                      setShowFormatDropdown(false);
                    }}
                    className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between cursor-pointer ${
                      settings.format === item.id
                        ? 'bg-blue-100 font-bold text-blue-900'
                        : 'hover:bg-[#0054e3] hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Button Bar */}
          <div className="pt-1 flex items-center gap-1.5">
            {/* Primary Action Button: 캡쳐 or REC */}
            <button
              type="button"
              onClick={handleTriggerCaptureAction}
              className={`flex-1 h-9 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : settings.format === 'MP4' ||
                    settings.format === 'GIF_ANIM' ||
                    settings.format === 'WEBP_ANIM'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#0054e3] hover:bg-[#0046c7] text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>
                    정지 ({String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:
                    {String(recordSeconds % 60).padStart(2, '0')})
                  </span>
                </>
              ) : settings.format === 'MP4' ||
                settings.format === 'GIF_ANIM' ||
                settings.format === 'WEBP_ANIM' ? (
                <>
                  <span className="text-sm">🔴</span>
                  <span>녹화 시작 (REC)</span>
                </>
              ) : (
                <>
                  <span className="text-sm">📸</span>
                  <span>캡쳐 (PrintScreen / F11)</span>
                </>
              )}
            </button>

            {/* Open Folder Button */}
            <button
              type="button"
              onClick={() => setShowFolderModal(true)}
              title="저장 폴더 열기 (캡처 목록 확인 및 메신저 전송)"
              className="h-9 px-2.5 bg-white hover:bg-gray-100 border border-[#7f9db9] rounded font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <span>📁</span>
              <span>폴더열기</span>
            </button>

            {/* Preferences Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              title="환경설정"
              className="h-9 w-9 bg-white hover:bg-gray-100 border border-[#7f9db9] rounded flex items-center justify-center font-bold text-slate-700 cursor-pointer"
            >
              ⚙
            </button>
          </div>

          {/* Status & Shortcut conflict reassurance badge */}
          <div className="pt-1 border-t border-gray-300 text-[10px] text-gray-600 flex items-center justify-between">
            <span className="truncate">
              단축키: <b className="text-blue-700">{settings.shortcutKey}</b> (또는 F11)
            </span>
            <span className="text-emerald-700 font-medium">
              ✅ 랜메신저 단축키와 분리됨
            </span>
          </div>
        </div>

        {/* Right Click Context Menu */}
        {showContextMenu && (
          <div
            style={{
              left: `${showContextMenu.x}px`,
              top: `${showContextMenu.y}px`,
            }}
            onClick={() => setShowContextMenu(null)}
            className="fixed z-50 w-44 bg-white border border-gray-400 shadow-xl py-1 text-xs"
          >
            <button
              type="button"
              onClick={() => setShowFolderModal(true)}
              className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <span>📁</span>
              <span>폴더열기</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const newPath = prompt('저장 폴더 경로를 입력하세요:', settings.saveFolder);
                if (newPath) setSettings({ ...settings, saveFolder: newPath });
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <span>📂</span>
              <span>폴더설정</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <span>⚙️</span>
              <span>환경설정</span>
            </button>
            <div className="my-1 border-t border-gray-200" />
            <a
              href="https://kalmuri.kilho.net"
              target="_blank"
              rel="noreferrer"
              className="block w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white cursor-pointer"
            >
              만든이 오길호
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-3 py-1.5 text-left hover:bg-[#0054e3] hover:text-white text-red-600 font-semibold flex items-center gap-2 cursor-pointer"
            >
              <span>✕</span>
              <span>종료하기</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= 2. AREA FRAME WINDOW (영역 창) ================= */}
      {settings.area === 'area' && areaFrame.visible && (
        <div
          tabIndex={0}
          onKeyDown={handleAreaFrameKeyDown}
          style={{
            left: `${areaFrame.x}px`,
            top: `${areaFrame.y}px`,
            width: `${areaFrame.width}px`,
            height: `${areaFrame.height}px`,
            borderColor: isRecording ? '#dc2626' : areaColorCfg.border,
            backgroundColor: isRecording ? 'rgba(220, 38, 38, 0.08)' : areaColorCfg.bg,
          }}
          className={`fixed z-40 border-3 rounded-xs flex flex-col shadow-lg select-none outline-none ${
            isRecording ? 'animate-pulse' : ''
          }`}
        >
          {/* Header Bar */}
          <div
            style={{
              backgroundColor: isRecording ? '#dc2626' : areaColorCfg.border,
            }}
            className="h-7 px-2 text-white flex items-center justify-between text-xs cursor-move shrink-0"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startY = e.clientY;
              const initX = areaFrame.x;
              const initY = areaFrame.y;

              const handleMove = (ev: MouseEvent) => {
                setAreaFrame((prev) => ({
                  ...prev,
                  x: Math.max(0, initX + (ev.clientX - startX)),
                  y: Math.max(32, initY + (ev.clientY - startY)),
                }));
              };

              const handleUp = () => {
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', handleUp);
              };

              window.addEventListener('mousemove', handleMove);
              window.addEventListener('mouseup', handleUp);
            }}
          >
            <div className="flex items-center gap-2">
              <span title="영역화면 캡쳐">🔲</span>

              {/* Live size button with preset popup */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPresetModal((v) => !v)}
                  title="크기 프리셋 변경"
                  className="px-1.5 py-0.5 rounded bg-black/25 hover:bg-black/40 font-mono text-[11px] font-bold cursor-pointer"
                >
                  {areaFrame.width}x{areaFrame.height} ▾
                </button>

                {showPresetModal && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-1 w-44 bg-white text-slate-800 border border-gray-400 shadow-xl rounded py-1 z-50 text-xs"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-500 border-b">
                      자주 쓰는 크기 (프리셋)
                    </div>
                    {DEFAULT_PRESET_SIZES.map((sz) => (
                      <button
                        key={sz.name}
                        type="button"
                        onClick={() => {
                          setAreaFrame((prev) => ({
                            ...prev,
                            width: sz.width,
                            height: sz.height,
                          }));
                          setShowPresetModal(false);
                        }}
                        className="w-full px-2.5 py-1 text-left hover:bg-[#0054e3] hover:text-white flex items-center justify-between cursor-pointer"
                      >
                        <span>{sz.name}</span>
                      </button>
                    ))}
                    <div className="border-t my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        const w = prompt('넓이(Width) 픽셀 입력:', String(areaFrame.width));
                        const h = prompt('높이(Height) 픽셀 입력:', String(areaFrame.height));
                        if (w && h) {
                          setAreaFrame((prev) => ({
                            ...prev,
                            width: Math.max(50, parseInt(w, 10)),
                            height: Math.max(50, parseInt(h, 10)),
                          }));
                        }
                        setShowPresetModal(false);
                      }}
                      className="w-full px-2.5 py-1 text-left hover:bg-[#0054e3] hover:text-white font-semibold cursor-pointer"
                    >
                      직접 크기 입력...
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTriggerCaptureAction}
                className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/35 font-bold text-[11px] cursor-pointer"
              >
                {isRecording
                  ? `정지 (${recordSeconds}s)`
                  : settings.format === 'MP4' ||
                    settings.format === 'GIF_ANIM' ||
                    settings.format === 'WEBP_ANIM'
                  ? 'REC'
                  : '캡쳐'}
              </button>
              <button
                type="button"
                onClick={() => setAreaFrame((prev) => ({ ...prev, visible: false }))}
                title="영역 창 숨기기"
                className="w-4 h-4 rounded hover:bg-white/30 flex items-center justify-center font-bold text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Area Center: Translucent viewing viewport */}
          <div className="flex-1 flex items-center justify-center pointer-events-none text-slate-700/60 font-mono text-xs">
            {isRecording ? (
              <span className="px-2 py-1 bg-red-600 text-white font-bold rounded animate-pulse">
                ● 녹화중 ({recordSeconds}초)
              </span>
            ) : (
              <span className="bg-black/30 text-white px-2 py-0.5 rounded text-[11px]">
                단축키({settings.shortcutKey} / F11) 또는 캡쳐 클릭
              </span>
            )}
          </div>

          {/* Bottom info helper */}
          <div className="h-5 px-1.5 bg-black/40 text-white text-[10px] flex items-center justify-between select-none">
            <span>방향키: 1px 이동 | Ctrl: 10px | Shift: 크기 조절</span>
            <span>{areaColorCfg.name}</span>
          </div>

          {/* Resize Corner Handle (Bottom Right) */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const initW = areaFrame.width;
              const initH = areaFrame.height;

              const handleMove = (ev: MouseEvent) => {
                setAreaFrame((prev) => ({
                  ...prev,
                  width: Math.max(100, initW + (ev.clientX - startX)),
                  height: Math.max(80, initH + (ev.clientY - startY)),
                }));
              };

              const handleUp = () => {
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', handleUp);
              };

              window.addEventListener('mousemove', handleMove);
              window.addEventListener('mouseup', handleUp);
            }}
            className="absolute bottom-0 right-0 w-4 h-4 bg-white border-2 border-[#0054e3] cursor-se-resize"
          />
        </div>
      )}

      {/* ================= 3. DRAG CAPTURE OVERLAY (드래그영역 캡쳐) ================= */}
      {isDraggingArea && (
        <div
          className="fixed inset-0 z-50 bg-black/40 cursor-crosshair select-none"
          onMouseDown={(e) => {
            setDragStart({ x: e.clientX, y: e.clientY });
            setDragCurrent({ x: e.clientX, y: e.clientY });
          }}
          onMouseMove={(e) => {
            if (dragStart) {
              setDragCurrent({ x: e.clientX, y: e.clientY });
            }
          }}
          onMouseUp={() => {
            if (dragStart && dragCurrent) {
              const x = Math.min(dragStart.x, dragCurrent.x);
              const y = Math.min(dragStart.y, dragCurrent.y);
              const width = Math.abs(dragCurrent.x - dragStart.x);
              const height = Math.abs(dragCurrent.y - dragStart.y);

              setIsDraggingArea(false);
              setDragStart(null);
              setDragCurrent(null);

              if (width > 5 && height > 5) {
                executeCapture({ x, y, width, height });
              }
            }
          }}
        >
          {/* Top Instruction Header */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 text-white rounded-full text-xs font-semibold shadow-lg flex items-center gap-2">
            <span>✂️ 마우스로 원하는 부분을 드래그하세요 (취소: Esc)</span>
          </div>

          {/* Active Drag Rectangle */}
          {dragStart && dragCurrent && (
            <div
              style={{
                left: `${Math.min(dragStart.x, dragCurrent.x)}px`,
                top: `${Math.min(dragStart.y, dragCurrent.y)}px`,
                width: `${Math.abs(dragCurrent.x - dragStart.x)}px`,
                height: `${Math.abs(dragCurrent.y - dragStart.y)}px`,
              }}
              className="absolute border-2 border-dashed border-sky-400 bg-sky-400/20"
            >
              <div className="absolute -top-6 left-0 px-1.5 py-0.5 bg-sky-600 text-white text-[10px] font-mono rounded font-bold">
                {Math.abs(dragCurrent.x - dragStart.x)} × {Math.abs(dragCurrent.y - dragStart.y)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= 4. WINDOW CONTROL CAPTURE HIGHLIGHTER ================= */}
      {isDetectingControl && hoveredControlRect && (
        <div
          style={{
            left: `${hoveredControlRect.left}px`,
            top: `${hoveredControlRect.top}px`,
            width: `${hoveredControlRect.width}px`,
            height: `${hoveredControlRect.height}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsDetectingControl(false);
            executeCapture({
              x: hoveredControlRect.left,
              y: hoveredControlRect.top,
              width: hoveredControlRect.width,
              height: hoveredControlRect.height,
            });
          }}
          className="fixed z-50 border-3 border-dashed border-blue-500 bg-blue-500/20 cursor-pointer pointer-events-auto transition-all duration-75"
        >
          <div className="absolute -top-6 left-0 px-2 py-0.5 bg-blue-700 text-white text-[10px] font-bold rounded shadow">
            클릭하여 이 컨트롤 캡처 (Esc: 취소)
          </div>
        </div>
      )}

      {/* ================= 5. COLOR PICKER OVERLAY (색상 추출) ================= */}
      {isColorInspecting && (
        <div
          className="fixed inset-0 z-50 bg-black/20 cursor-crosshair select-none"
          onClick={() => {
            handlePickCurrentColor();
            setIsColorInspecting(false);
          }}
        >
          {/* Loupe attached to mouse */}
          <div
            style={{
              left: `${mousePosRef.current.x + 18}px`,
              top: `${mousePosRef.current.y + 18}px`,
            }}
            className="fixed z-50 bg-white border border-gray-600 shadow-xl rounded p-2 text-xs font-mono"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                style={{ backgroundColor: liveColor.web }}
                className="w-5 h-5 rounded border border-gray-400 shadow-xs"
              />
              <span className="font-bold text-slate-800">{liveColor.web}</span>
            </div>
            <div className="text-[10px] text-gray-600 space-y-0.5">
              <div>HEX: {liveColor.hex}</div>
              <div>RGB: ({liveColor.rgb})</div>
              <div>TColor: {liveColor.tcolor}</div>
            </div>
            <div className="mt-1 text-[9px] text-blue-600 font-sans">
              클릭하거나 PrintScreen으로 추출 (Esc: 닫기)
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. FLOATING PINNED WINDOWS (플러팅) ================= */}
      {floatingPins.map((pin) => (
        <div
          key={pin.id}
          style={{
            left: `${pin.x}px`,
            top: `${pin.y}px`,
            width: `${pin.width}px`,
          }}
          className="fixed z-50 bg-white border-2 border-amber-400 rounded shadow-2xl overflow-hidden select-none"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startY = e.clientY;
            const initX = pin.x;
            const initY = pin.y;

            const handleMove = (ev: MouseEvent) => {
              setFloatingPins((prev) =>
                prev.map((p) =>
                  p.id === pin.id
                    ? { ...p, x: initX + (ev.clientX - startX), y: initY + (ev.clientY - startY) }
                    : p
                )
              );
            };

            const handleUp = () => {
              window.removeEventListener('mousemove', handleMove);
              window.removeEventListener('mouseup', handleUp);
            };

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
          }}
        >
          <div className="h-5 px-2 bg-amber-400 text-amber-950 flex items-center justify-between text-[11px] font-bold cursor-move">
            <span className="truncate">📌 {pin.title} (항상 위)</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  triggerFileDownload({
                    id: pin.id,
                    fileName: pin.title,
                    format: 'PNG',
                    timestamp: Date.now(),
                    width: pin.width,
                    height: pin.height,
                    dataUrl: pin.dataUrl,
                    fileSize: 1024,
                  })
                }
                title="이미지 저장"
                className="hover:bg-amber-500 rounded px-1 text-[10px] cursor-pointer"
              >
                💾
              </button>
              <button
                type="button"
                onClick={() => setFloatingPins((prev) => prev.filter((p) => p.id !== pin.id))}
                title="플로팅 닫기"
                className="hover:bg-amber-500 rounded px-1 text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
          <img src={pin.dataUrl} alt="" className="w-full h-auto object-contain block" />
        </div>
      ))}

      {/* ================= 7. SAVED CAPTURES GALLERY / FOLDER MODAL ================= */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#ece9d8] border-2 border-[#0054e3] rounded-t-md shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Title */}
            <div className="h-7 px-3 bg-gradient-to-r from-[#0054e3] to-[#0046c7] text-white flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-1.5">
                <span>📁</span>
                <span>칼무리 저장 폴더 — {settings.saveFolder}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="w-4 h-4 rounded hover:bg-red-600 flex items-center justify-center font-bold text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-3 flex-1 flex flex-col min-h-0 bg-[#f5f4ee]">
              {capturedItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-12">
                  <span className="text-4xl mb-2">📸</span>
                  <p className="font-semibold text-sm">아직 캡처된 파일이 없습니다.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    PrintScreen 또는 F11을 눌러 첫 번째 캡처를 만들어 보세요!
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {capturedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-white border border-gray-300 rounded shadow-xs flex items-center justify-between gap-3 hover:border-blue-400"
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        {item.isVideo ? (
                          <div className="w-16 h-12 bg-slate-900 rounded flex items-center justify-center text-white text-xs font-bold shrink-0">
                            🎬 {item.durationSec}s
                          </div>
                        ) : (
                          <img
                            src={item.dataUrl}
                            alt=""
                            className="w-16 h-12 object-cover border border-gray-200 rounded shrink-0 bg-slate-100"
                          />
                        )}
                        <div className="min-w-0 text-xs">
                          <div className="font-bold text-slate-900 truncate">
                            {item.fileName}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {item.format} • {item.width}×{item.height} •{' '}
                            {Math.round(item.fileSize / 1024)} KB •{' '}
                            {new Date(item.timestamp).toLocaleTimeString('ko-KR')}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Send to LAN Messenger Chat */}
                        {onSendToChat && !item.isVideo && (
                          <button
                            type="button"
                            onClick={() => {
                              onSendToChat(item);
                              setShowFolderModal(false);
                            }}
                            title="랜메신저 대화방으로 즉시 전송"
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <span>💬</span>
                            <span>
                              {activeChatPeerName ? `${activeChatPeerName}에게 전송` : '대화방 전송'}
                            </span>
                          </button>
                        )}

                        {/* Download */}
                        <button
                          type="button"
                          onClick={() => triggerFileDownload(item)}
                          title="다운로드"
                          className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-400 rounded text-xs font-medium cursor-pointer"
                        >
                          💾 저장
                        </button>

                        {/* Copy */}
                        <button
                          type="button"
                          onClick={async () => {
                            await copyCaptureToClipboard(item);
                            alert('클립보드에 복사되었습니다!');
                          }}
                          title="클립보드 복사"
                          className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-400 rounded text-xs font-medium cursor-pointer"
                        >
                          📋 복사
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() =>
                            setCapturedItems((prev) => prev.filter((i) => i.id !== item.id))
                          }
                          title="목록에서 삭제"
                          className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="h-10 px-3 bg-[#ece9d8] border-t border-[#aca899] flex items-center justify-between text-xs">
              <span className="text-gray-600">
                총 {capturedItems.length}개 파일
              </span>
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-1 bg-white hover:bg-gray-100 border border-[#7f9db9] rounded font-semibold text-slate-800 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. KALMURI SETTINGS MODAL (환경설정) ================= */}
      {showSettingsModal && (
        <KalmuriSettingsModal
          settings={settings}
          onSave={(newSettings) => setSettings(newSettings)}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* ================= 9. OCR RESULT MODAL ================= */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#ece9d8] border-2 border-[#0054e3] rounded-t-md shadow-2xl flex flex-col">
            <div className="h-7 px-3 bg-gradient-to-r from-[#0054e3] to-[#0046c7] text-white flex items-center justify-between font-bold text-xs">
              <span>📝 글자 인식 (OCR) 결과 — TXT</span>
              <button
                type="button"
                onClick={() => setShowOcrModal(false)}
                className="w-4 h-4 rounded hover:bg-red-600 flex items-center justify-center font-bold text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-3 bg-[#f5f4ee] space-y-2">
              <textarea
                value={ocrTextResult}
                onChange={(e) => setOcrTextResult(e.target.value)}
                rows={8}
                className="w-full bg-white border border-gray-400 p-2 font-mono text-xs rounded"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(ocrTextResult);
                    alert('글자가 클립보드에 복사되었습니다.');
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer"
                >
                  📋 텍스트 복사
                </button>
                <button
                  type="button"
                  onClick={() => setShowOcrModal(false)}
                  className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-400 rounded font-semibold cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 10. COLOR PALETTE MODAL ================= */}
      {showColorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#ece9d8] border-2 border-[#0054e3] rounded-t-md shadow-2xl flex flex-col">
            <div className="h-7 px-3 bg-gradient-to-r from-[#0054e3] to-[#0046c7] text-white flex items-center justify-between font-bold text-xs">
              <span>🎨 색상 추출 (Color Picker)</span>
              <button
                type="button"
                onClick={() => setShowColorModal(false)}
                className="w-4 h-4 rounded hover:bg-red-600 flex items-center justify-center font-bold text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-3 bg-[#f5f4ee] space-y-3 text-xs">
              {/* Latest Picked */}
              <div className="p-2.5 bg-white border border-gray-300 rounded flex items-center gap-3">
                <div
                  style={{ backgroundColor: liveColor.web }}
                  className="w-12 h-12 rounded border border-gray-400 shadow-sm shrink-0"
                />
                <div className="space-y-1 font-mono text-slate-800">
                  <div>
                    <b>Web:</b> <code className="text-blue-700">{liveColor.web}</code>
                  </div>
                  <div>
                    <b>HEX:</b> {liveColor.hex}
                  </div>
                  <div>
                    <b>RGB:</b> {liveColor.rgb}
                  </div>
                  <div>
                    <b>TColor:</b> {liveColor.tcolor}
                  </div>
                </div>
              </div>

              {/* History list */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  추출된 색상 목록 ({colorPalette.length}개)
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-white border border-gray-300 p-1.5 rounded">
                  {colorPalette.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1 hover:bg-gray-100 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          style={{ backgroundColor: c.web }}
                          className="w-4 h-4 rounded border border-gray-400"
                        />
                        <span className="font-mono font-semibold">{c.web}</span>
                        <span className="text-gray-500 text-[10px]">({c.tcolor})</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(c.web);
                          alert(`${c.web} 코드가 복사되었습니다!`);
                        }}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold cursor-pointer"
                      >
                        복사
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsColorInspecting(true)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer"
                >
                  🔍 다시 색상 추출
                </button>
                <button
                  type="button"
                  onClick={() => setShowColorModal(false)}
                  className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-400 rounded font-semibold cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 11. WEBPAGE CAPTURE MODAL ================= */}
      {showWebpageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#ece9d8] border-2 border-[#0054e3] rounded-t-md shadow-2xl flex flex-col">
            <div className="h-7 px-3 bg-gradient-to-r from-[#0054e3] to-[#0046c7] text-white flex items-center justify-between font-bold text-xs">
              <span>🌐 웹페이지 전체 캡쳐 (Edge · Chrome)</span>
              <button
                type="button"
                onClick={() => setShowWebpageModal(false)}
                className="w-4 h-4 rounded hover:bg-red-600 flex items-center justify-center font-bold text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-3 bg-[#f5f4ee] space-y-3 text-xs">
              <p className="text-gray-700">
                Edge 또는 Chrome 브라우저에서 스크롤 끝까지 한 장의 고해상도 이미지로 저장합니다.
              </p>
              <div className="p-2.5 bg-white border border-gray-300 rounded font-mono text-[11px] text-gray-600">
                대상 URL: https://github.com/yjhone1/lan-messenger
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    executeCapture({
                      x: 0,
                      y: 0,
                      width: window.innerWidth,
                      height: window.innerHeight * 2,
                    });
                    setShowWebpageModal(false);
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer"
                >
                  📸 전체 웹페이지 캡쳐 실행
                </button>
                <button
                  type="button"
                  onClick={() => setShowWebpageModal(false)}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-400 rounded font-semibold cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Kalmuri Settings Modal (일반 / 캡쳐 / 녹화 / 정보)
 * Enforces NO SHORTCUT CONFLICT with LAN Messenger (Ctrl+G, B, H, J, P, S).
 */
function KalmuriSettingsModal({
  settings,
  onSave,
  onClose,
}: {
  settings: KalmuriSettings;
  onSave: (s: KalmuriSettings) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'general' | 'capture' | 'record' | 'about'>('general');
  const [draft, setDraft] = useState<KalmuriSettings>({ ...settings });
  const [shortcutValidation, setShortcutValidation] = useState<{
    isConflict: boolean;
    conflictWith?: string;
    message: string;
  }>(() => validateCaptureShortcut(settings.shortcutKey));

  const handleShortcutChange = (newKey: string) => {
    const val = validateCaptureShortcut(newKey);
    setShortcutValidation(val);
    setDraft({ ...draft, shortcutKey: newKey });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#ece9d8] border-2 border-[#0054e3] rounded-t-md shadow-2xl flex flex-col text-xs font-sans">
        {/* Title Bar */}
        <div className="h-7 px-3 bg-gradient-to-r from-[#0054e3] to-[#0046c7] text-white flex items-center justify-between font-bold">
          <span>⚙️ 환경설정 — 칼무리 (Kalmuri)</span>
          <button
            type="button"
            onClick={onClose}
            className="w-4 h-4 rounded hover:bg-red-600 flex items-center justify-center font-bold text-[10px] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="px-2 pt-2 bg-[#ece9d8] border-b border-[#aca899] flex gap-1">
          {[
            { id: 'general', label: '일반' },
            { id: 'capture', label: '캡쳐' },
            { id: 'record', label: '녹화' },
            { id: 'about', label: '정보' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as 'general' | 'capture' | 'record' | 'about')}
              className={`px-4 py-1.5 rounded-t text-xs font-semibold cursor-pointer border-t border-l border-r ${
                tab === t.id
                  ? 'bg-[#f5f4ee] border-[#aca899] font-bold text-blue-900 -mb-[1px]'
                  : 'bg-[#e1dfd2] border-transparent text-gray-700 hover:bg-white/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 bg-[#f5f4ee] min-h-[300px]">
          {/* TAB 1: 일반 (General) */}
          {tab === 'general' && (
            <div className="space-y-3.5">
              {/* Shortcut Key with Conflict Prevention */}
              <div className="p-3 bg-white border border-gray-300 rounded shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900">
                    단축키 설정 (랜메신저 단축키와 중복 방지)
                  </label>
                  <span className="text-[10px] text-gray-500">
                    기본값: PrintScreen / F11
                  </span>
                </div>

                <div className="flex gap-2">
                  <select
                    value={draft.shortcutKey}
                    onChange={(e) => handleShortcutChange(e.target.value)}
                    className="flex-1 bg-white border border-[#7f9db9] rounded px-2 py-1 text-xs font-semibold"
                  >
                    {RECOMMENDED_CAPTURE_SHORTCUTS.map((sc) => (
                      <option key={sc.key} value={sc.key}>
                        {sc.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={draft.shortcutKey}
                    onChange={(e) => handleShortcutChange(e.target.value)}
                    placeholder="직접 입력 (예: F11, Ctrl+Shift+C)"
                    className="w-44 bg-white border border-[#7f9db9] rounded px-2 py-1 text-xs font-mono"
                  />
                </div>

                {/* Conflict Status Banner */}
                {shortcutValidation.isConflict ? (
                  <div className="p-2 bg-red-100 border border-red-400 rounded text-red-700 text-[11px] font-semibold flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{shortcutValidation.message}</span>
                  </div>
                ) : (
                  <div className="p-1.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-[10px] flex items-center justify-between">
                    <span>✅ 랜메신저 단축키(Ctrl+G, B, H, J, P, S)와 충돌 없음</span>
                    <span className="text-gray-500">안전한 단축키</span>
                  </div>
                )}
              </div>

              {/* Naming Rule */}
              <div className="p-3 bg-white border border-gray-300 rounded shadow-xs space-y-2">
                <label className="font-bold text-slate-900 block">
                  파일명 규칙
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="namingRule"
                      checked={draft.namingRule === 'sequential1'}
                      onChange={() => setDraft({ ...draft, namingRule: 'sequential1' })}
                    />
                    <span>순차적 #1 (K-001, K-002 … 큰 번호 다음 번호로 이어서 저장)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="namingRule"
                      checked={draft.namingRule === 'sequential2'}
                      onChange={() => setDraft({ ...draft, namingRule: 'sequential2' })}
                    />
                    <span>순차적 #2 (비어 있는 가장 작은 번호부터 채워서 저장)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="namingRule"
                      checked={draft.namingRule === 'datetime'}
                      onChange={() => setDraft({ ...draft, namingRule: 'datetime' })}
                    />
                    <span>날짜시간 (K-20261105-180828 … 시각으로 이름 붙임)</span>
                  </label>
                </div>
              </div>

              {/* Area Frame Color */}
              <div className="p-3 bg-white border border-gray-300 rounded shadow-xs space-y-2">
                <label className="font-bold text-slate-900 block">
                  영역화면 테두리 색상 (8가지)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(AREA_COLOR_MAP) as AreaColor[]).map((cKey) => {
                    const c = AREA_COLOR_MAP[cKey];
                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => setDraft({ ...draft, areaColor: cKey })}
                        className={`p-1.5 rounded border text-xs flex items-center gap-1.5 cursor-pointer ${
                          draft.areaColor === cKey
                            ? 'border-blue-600 ring-2 ring-blue-300 font-bold bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div
                          style={{ backgroundColor: c.border }}
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                        />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start on boot */}
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={draft.startOnBoot}
                  onChange={(e) => setDraft({ ...draft, startOnBoot: e.target.checked })}
                />
                <span>Windows 부팅 시 칼무리 자동 실행 (트레이 대기)</span>
              </label>
            </div>
          )}

          {/* TAB 2: 캡쳐 (Capture) */}
          {tab === 'capture' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-white border border-gray-300 rounded shadow-xs space-y-2">
                <label className="font-bold text-slate-900 block">캡쳐 소리</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'none', label: '없음 (조용한 환경)' },
                    { id: 'pre', label: '캡쳐 전 소리 (기본값 — 찰칵!)' },
                    { id: 'post', label: '캡쳐 후 소리 (저장 완료 확인)' },
                  ].map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="captureSound"
                        checked={draft.captureSound === s.id}
                        onChange={() =>
                          setDraft({
                            ...draft,
                            captureSound: s.id as 'none' | 'pre' | 'post',
                          })
                        }
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-300 rounded shadow-xs space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={draft.includeCursorCapture}
                    onChange={(e) =>
                      setDraft({ ...draft, includeCursorCapture: e.target.checked })
                    }
                  />
                  <span>캡처 이미지에 마우스 커서 포함</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={draft.autoClipboardCopy}
                    onChange={(e) =>
                      setDraft({ ...draft, autoClipboardCopy: e.target.checked })
                    }
                  />
                  <span>클립보드 자동복사 (어떤 형식이든 클립보드에도 함께 복사)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: 녹화 (Recording) */}
          {tab === 'record' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-white border border-gray-300 rounded shadow-xs space-y-2">
                <label className="font-bold text-slate-900 block">최대 녹화시간</label>
                <select
                  value={draft.maxRecordDurationSec}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      maxRecordDurationSec: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-white border border-[#7f9db9] rounded p-1.5 text-xs font-semibold"
                >
                  <option value={0}>무제한 (수동 정지)</option>
                  <option value={1800}>30분 후 자동 정지</option>
                  <option value={3600}>1시간 후 자동 정지</option>
                  <option value={7200}>2시간 후 자동 정지</option>
                  <option value={14400}>4시간 후 자동 정지</option>
                </select>
              </div>

              <div className="p-3 bg-white border border-gray-300 rounded shadow-xs space-y-2">
                <label className="font-bold text-slate-900 block">움짤 프레임 수 (FPS)</label>
                <div className="flex gap-4">
                  {[10, 15, 20].map((fps) => (
                    <label key={fps} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="gifFps"
                        checked={draft.gifFps === fps}
                        onChange={() => setDraft({ ...draft, gifFps: fps })}
                      />
                      <span>{fps} FPS {fps === 10 ? '(기본값)' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-300 rounded shadow-xs space-y-2">
                <label className="font-bold text-slate-900 block">마우스 클릭 효과</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'none', label: '없음' },
                    { id: 'ripple', label: '원 퍼짐 (왼쪽 클릭 파란원, 오른쪽 주황원)' },
                    { id: 'highlight', label: '강조 (버튼 누르는 동안 노란 원)' },
                  ].map((eff) => (
                    <label key={eff.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clickEffect"
                        checked={draft.clickEffect === eff.id}
                        onChange={() =>
                          setDraft({
                            ...draft,
                            clickEffect: eff.id as 'none' | 'ripple' | 'highlight',
                          })
                        }
                      />
                      <span>{eff.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-300 rounded shadow-xs space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={draft.includeAudioRecord}
                    onChange={(e) =>
                      setDraft({ ...draft, includeAudioRecord: e.target.checked })
                    }
                  />
                  <span>사운드 포함 (PC에서 재생되는 소리 녹음)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={draft.includeCursorRecord}
                    onChange={(e) =>
                      setDraft({ ...draft, includeCursorRecord: e.target.checked })
                    }
                  />
                  <span>녹화 영상에 마우스 커서 포함</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: 정보 (About) */}
          {tab === 'about' && (
            <div className="space-y-3 p-3 bg-white border border-gray-300 rounded shadow-xs">
              <div className="flex items-center gap-3 border-b pb-3">
                <span className="text-3xl">📸</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    칼무리 (Kalmuri) v1.4.0.0
                  </h3>
                  <p className="text-gray-500 text-xs">
                    단축키 한 번으로 화면 캡처 및 화면 녹화
                  </p>
                </div>
              </div>

              <div className="text-xs space-y-1 text-gray-700">
                <p><b>만든이:</b> 오길호 (Kilho Oh)</p>
                <p><b>홈페이지:</b> <a href="https://kalmuri.kilho.net" target="_blank" rel="noreferrer" className="text-blue-600 underline">https://kalmuri.kilho.net</a></p>
                <p><b>라이선스:</b> 프리웨어 (개인/기업 누구나 무료)</p>
                <p><b>랜메신저 연동:</b> LAN Messenger v1.4.0.0 완벽 통합 및 단축키 충돌 방지</p>
              </div>

              <div className="pt-2 border-t flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('모든 칼무리 설정을 초기값으로 되돌리시겠습니까?')) {
                      setDraft({ ...DEFAULT_KALMURI_SETTINGS });
                    }
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-400 rounded text-xs cursor-pointer"
                >
                  초기화 (기본값 복원)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Buttons */}
        <div className="h-11 px-4 bg-[#ece9d8] border-t border-[#aca899] flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            {shortcutValidation.isConflict && (
              <span className="text-red-600 font-bold">⚠️ 단축키 충돌 해결 필요</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={shortcutValidation.isConflict}
              onClick={() => {
                onSave(draft);
                onClose();
              }}
              className="px-4 py-1.5 bg-[#0054e3] hover:bg-[#0046c7] disabled:bg-gray-400 text-white rounded font-bold cursor-pointer"
            >
              확인
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-gray-100 border border-[#7f9db9] rounded font-semibold text-slate-800 cursor-pointer"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
