/**
 * Kalmuri Capture Engine
 * Handles Canvas rendering, shutter audio synthesis, TColor formatting,
 * sequential/datetime naming, and OCR text extraction.
 */

import {
  AreaColor,
  CapturedItem,
  CaptureFormat,
  ClickEffect,
  ExtractedColor,
  NamingRule,
} from '../types/kalmuri';

/**
 * Synthesizes a crisp, mechanical camera shutter sound ("찰칵!") using Web Audio API.
 * Does not depend on external network assets and works instantly offline.
 */
export function playShutterSound(volume: number = 0.5): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // 1. Initial mechanical click
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);

    oscGain.gain.setValueAtTime(volume * 0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);

    // 2. White noise shutter curtain flutter
    const bufferSize = ctx.sampleRate * 0.09;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, now + 0.015);
    filter.Q.setValueAtTime(3.5, now + 0.015);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(volume * 0.9, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now + 0.01);
    noise.stop(now + 0.095);

    // Close context after completion
    setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch {
        // ignore
      }
    }, 200);
  } catch {
    // Audio autoplay or permissions safeguard
  }
}

/**
 * Converts standard RGB to Delphi/Windows TColor hex format ($00BBGGRR).
 * Example: RGB(255, 153, 51) -> $003399FF (as documented in Kalmuri manual).
 */
export function rgbToTColor(r: number, g: number, b: number): string {
  const hexR = r.toString(16).padStart(2, '0').toUpperCase();
  const hexG = g.toString(16).padStart(2, '0').toUpperCase();
  const hexB = b.toString(16).padStart(2, '0').toUpperCase();
  return `$00${hexB}${hexG}${hexR}`;
}

export function rgbToWeb(r: number, g: number, b: number): string {
  const hexR = r.toString(16).padStart(2, '0').toUpperCase();
  const hexG = g.toString(16).padStart(2, '0').toUpperCase();
  const hexB = b.toString(16).padStart(2, '0').toUpperCase();
  return `#${hexR}${hexG}${hexB}`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const hexR = r.toString(16).padStart(2, '0').toUpperCase();
  const hexG = g.toString(16).padStart(2, '0').toUpperCase();
  const hexB = b.toString(16).padStart(2, '0').toUpperCase();
  return `${hexR}${hexG}${hexB}`;
}

/**
 * Extracts and formats color from RGB numbers.
 */
export function buildColorInfo(r: number, g: number, b: number): ExtractedColor {
  return {
    hex: rgbToHex(r, g, b),
    rgb: `${r},${g},${b}`,
    web: rgbToWeb(r, g, b),
    tcolor: rgbToTColor(r, g, b),
    timestamp: Date.now(),
  };
}

/**
 * Generates Kalmuri file name based on naming rule:
 * - sequential1: max existing number + 1 (e.g. K-001.png, K-002.png)
 * - sequential2: lowest available missing number (e.g. if K-001 and K-003 exist, fills K-002)
 * - datetime: K-YYYYMMDD-HHMMSS.png
 */
export function generateFileName(
  rule: NamingRule,
  format: CaptureFormat,
  existingItems: CapturedItem[]
): string {
  let ext = 'png';
  if (format === 'JPG') ext = 'jpg';
  else if (format === 'GIF') ext = 'gif';
  else if (format === 'BMP') ext = 'bmp';
  else if (format === 'WebP') ext = 'webp';
  else if (format === 'MP4') ext = 'mp4';
  else if (format === 'GIF_ANIM') ext = 'gif';
  else if (format === 'WEBP_ANIM') ext = 'webp';
  else if (format === 'TXT') ext = 'txt';

  if (rule === 'datetime') {
    const d = new Date();
    const pad = (n: number, l = 2) => n.toString().padStart(l, '0');
    const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const hms = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${pad(
      Math.floor(d.getMilliseconds() / 10),
      2
    )}`;
    return `K-${ymd}-${hms}.${ext}`;
  }

  // Extract all existing K-NNN numbers
  const usedNumbers = new Set<number>();
  const regex = /^K-(\d+)\./i;
  for (const item of existingItems) {
    const m = item.fileName.match(regex);
    if (m && m[1]) {
      const num = parseInt(m[1], 10);
      if (!Number.isNaN(num) && num > 0) {
        usedNumbers.add(num);
      }
    }
  }

  if (rule === 'sequential2') {
    // Lowest available number starting from 1
    let candidate = 1;
    while (usedNumbers.has(candidate)) {
      candidate++;
    }
    const padNum = candidate.toString().padStart(3, '0');
    return `K-${padNum}.${ext}`;
  }

  // sequential1: highest number + 1
  let maxNum = 0;
  for (const num of usedNumbers) {
    if (num > maxNum) maxNum = num;
  }
  const nextNum = (maxNum + 1).toString().padStart(3, '0');
  return `K-${nextNum}.${ext}`;
}

/**
 * Captures region from the viewport / DOM elements using HTML5 Canvas.
 */
export async function captureDomRegion(
  rect: { x: number; y: number; width: number; height: number },
  includeCursor: boolean = true,
  cursorPos?: { x: number; y: number },
  format: CaptureFormat = 'PNG',
  quality: number = 90
): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  fileSize: number;
}> {
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  // Fill base background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Attempt to clone visual DOM nodes within the rect
  // We draw a stylized, crystal-clear snapshot of the desktop/windows/chat inside the canvas
  try {
    drawSimulatedDesktopCanvas(ctx, rect);
  } catch {
    // fallback background
    ctx.fillStyle = '#ece9d8';
    ctx.fillRect(0, 0, width, height);
  }

  // If include cursor, draw authentic Windows cursor
  if (includeCursor && cursorPos) {
    const relX = cursorPos.x - rect.x;
    const relY = cursorPos.y - rect.y;
    if (relX >= -10 && relX <= width + 10 && relY >= -10 && relY <= height + 10) {
      drawMouseCursor(ctx, relX, relY);
    }
  }

  let mimeType = 'image/png';
  let qVal = quality / 100;
  if (format === 'JPG') {
    mimeType = 'image/jpeg';
  } else if (format === 'WebP') {
    mimeType = 'image/webp';
  }

  const dataUrl = canvas.toDataURL(mimeType, qVal);
  // Estimate byte size from dataUrl
  const head = dataUrl.indexOf(',') + 1;
  const b64 = dataUrl.substring(head);
  const fileSize = Math.round((b64.length * 3) / 4);

  return { dataUrl, width, height, fileSize };
}

/**
 * Draws the desktop and active windows into the canvas at the specified viewport rect.
 */
function drawSimulatedDesktopCanvas(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number }
): void {
  ctx.save();
  ctx.translate(-rect.x, -rect.y);

  // Background desktop
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  const grad = ctx.createLinearGradient(0, 0, 0, winH);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, winW, winH);

  // Render visible windows by scanning DOM elements with class lmc-window-surface or dialog surfaces
  const windowElements = document.querySelectorAll(
    '.lmc-window-surface, [data-window-panel], [role="dialog"], [data-app-theme]'
  );

  windowElements.forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return;

    // Check if within capture rect
    if (
      b.right < rect.x ||
      b.bottom < rect.y ||
      b.left > rect.x + rect.width ||
      b.top > rect.y + rect.height
    ) {
      return;
    }

    const computed = window.getComputedStyle(el);
    ctx.save();
    ctx.fillStyle = computed.backgroundColor || '#ece9d8';
    ctx.strokeStyle = computed.borderColor || '#0054e3';
    ctx.lineWidth = parseInt(computed.borderWidth, 10) || 1;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillRect(b.left, b.top, b.width, b.height);
    ctx.shadowColor = 'transparent';
    ctx.strokeRect(b.left, b.top, b.width, b.height);

    // Window title text if present
    const titleEl = el.querySelector('span, h1, h2, h3, [data-testid]');
    if (titleEl && titleEl.textContent) {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(b.left, b.top, b.width, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Tahoma, sans-serif';
      ctx.fillText(titleEl.textContent.trim().slice(0, 40), b.left + 8, b.top + 16);
    }

    ctx.restore();
  });

  // Capture visible text blocks
  const textElements = document.querySelectorAll('p, span, button, code, input, td, div');
  ctx.fillStyle = '#0f172a';
  ctx.font = '11px Tahoma, sans-serif';

  textElements.forEach((el) => {
    // Skip empty or hidden
    if (el.children.length > 0 && el.textContent?.trim().length === 0) return;
    const text = el.textContent?.trim();
    if (!text || text.length === 0 || text.length > 80) return;

    const b = el.getBoundingClientRect();
    if (
      b.width <= 0 ||
      b.height <= 0 ||
      b.right < rect.x ||
      b.bottom < rect.y ||
      b.left > rect.x + rect.width ||
      b.top > rect.y + rect.height
    ) {
      return;
    }

    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;

    ctx.save();
    ctx.fillStyle = cs.color || '#1e293b';
    ctx.font = `${cs.fontWeight || 'normal'} ${cs.fontSize || '11px'} ${
      cs.fontFamily || 'Tahoma, sans-serif'
    }`;
    ctx.fillText(text.slice(0, 60), b.left, b.top + Math.min(b.height, 14));
    ctx.restore();
  });

  ctx.restore();
}

/**
 * Draws an authentic arrow mouse cursor into the canvas.
 */
function drawMouseCursor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);

  // Classic Windows arrow cursor path
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 15);
  ctx.lineTo(4, 11);
  ctx.lineTo(7, 18);
  ctx.lineTo(10, 16.5);
  ctx.lineTo(7, 9.5);
  ctx.lineTo(12, 9.5);
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'miter';
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Simulates high-accuracy Optical Character Recognition (OCR) on the captured region.
 * Detects text present within the target coordinates or uses smart content extraction.
 */
export function extractTextFromRegion(
  rect: { x: number; y: number; width: number; height: number },
  lang: 'ko' | 'en' | 'ja' | 'zh' = 'ko'
): string {
  const elements = document.elementsFromPoint
    ? document.elementsFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
    : [];

  const extractedLines: string[] = [];

  // Scan text within the bounding box
  const allTextNodes = document.querySelectorAll(
    'p, span, div, h1, h2, h3, input, textarea, td, button'
  );

  allTextNodes.forEach((node) => {
    const b = node.getBoundingClientRect();
    if (
      b.left >= rect.x - 10 &&
      b.top >= rect.y - 10 &&
      b.right <= rect.x + rect.width + 10 &&
      b.bottom <= rect.y + rect.height + 10
    ) {
      const txt = node.textContent?.trim();
      if (txt && txt.length > 0 && !extractedLines.includes(txt) && txt.length < 200) {
        extractedLines.push(txt);
      }
    }
  });

  if (extractedLines.length > 0) {
    return extractedLines.join('\n');
  }

  // Fallback context-aware OCR sample
  if (lang === 'ko') {
    return `[칼무리 OCR 글자 인식 결과]
프로그램: LAN Messenger v1.4.0.0
호스트: WIN7-LAB-PC04 (192.168.1.104)
상태: 대화 가능 (Available)
암호화 모드: OpenSSL 3.0.13 <-> 1.0.2u Legacy 호환 모드
시간: ${new Date().toLocaleTimeString('ko-KR')}`;
  }

  return `[Kalmuri OCR Text Recognition]
Application: LAN Messenger v1.4.0.0
Host: WIN7-LAB-PC04 (192.168.1.104)
Status: Available
Security: OpenSSL 3.0.13 <-> 1.0.2u Legacy Interop
Timestamp: ${new Date().toLocaleTimeString('en-US')}`;
}

/**
 * Downloads a captured item to the user's computer.
 */
export function triggerFileDownload(item: CapturedItem): void {
  const link = document.createElement('a');
  link.href = item.dataUrl;
  link.download = item.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copies captured image or text to system clipboard.
 */
export async function copyCaptureToClipboard(
  item: CapturedItem
): Promise<boolean> {
  try {
    if (item.ocrText && item.format === 'TXT') {
      await navigator.clipboard.writeText(item.ocrText);
      return true;
    }

    if (item.dataUrl.startsWith('data:image/')) {
      const response = await fetch(item.dataUrl);
      const blob = await response.blob();
      if (typeof ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([clipboardItem]);
        return true;
      }
    }

    // Fallback: copy dataUrl string
    await navigator.clipboard.writeText(item.dataUrl);
    return true;
  } catch {
    return false;
  }
}
