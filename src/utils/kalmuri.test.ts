import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCaptureShortcut,
  LAN_MESSENGER_RESERVED_SHORTCUTS,
  RECOMMENDED_CAPTURE_SHORTCUTS,
  CapturedItem,
} from '../types/kalmuri';
import {
  generateFileName,
  rgbToTColor,
  rgbToWeb,
  rgbToHex,
  buildColorInfo,
} from '../services/kalmuriEngine';

test('validateCaptureShortcut rejects all LAN Messenger reserved shortcuts', () => {
  // Check every reserved shortcut
  for (const reserved of LAN_MESSENGER_RESERVED_SHORTCUTS) {
    const check = validateCaptureShortcut(reserved.key);
    assert.equal(
      check.isConflict,
      true,
      `Expected reserved key ${reserved.key} to trigger a conflict`
    );
    assert.match(check.message, /LAN Messenger 예약 단축키/);
  }

  // Check case-insensitive variations and spacing
  assert.equal(validateCaptureShortcut('ctrl+g').isConflict, true);
  assert.equal(validateCaptureShortcut('CTRL + B').isConflict, true);
  assert.equal(validateCaptureShortcut('ctrl+p').isConflict, true);
  assert.equal(validateCaptureShortcut('ctrl+s').isConflict, true);
  assert.equal(validateCaptureShortcut('ctrl+h').isConflict, true);
  assert.equal(validateCaptureShortcut('ctrl+j').isConflict, true);
  assert.equal(validateCaptureShortcut('enter').isConflict, true);
});

test('validateCaptureShortcut allows recommended Kalmuri shortcuts without conflict', () => {
  for (const rec of RECOMMENDED_CAPTURE_SHORTCUTS) {
    const check = validateCaptureShortcut(rec.key);
    assert.equal(
      check.isConflict,
      false,
      `Expected safe key ${rec.key} to be allowed`
    );
    assert.match(check.message, /랜메신저 단축키와 분리됨/);
  }

  // Common variants
  assert.equal(validateCaptureShortcut('PrintScreen').isConflict, false);
  assert.equal(validateCaptureShortcut('F11').isConflict, false);
  assert.equal(validateCaptureShortcut('F12').isConflict, false);
  assert.equal(validateCaptureShortcut('Ctrl+Shift+C').isConflict, false);
  assert.equal(validateCaptureShortcut('Ctrl+Alt+S').isConflict, false);
});

test('generateFileName correctly generates sequential #1 names (K-001, K-002...) based on existing items', () => {
  const items: CapturedItem[] = [];

  const name1 = generateFileName('sequential1', 'PNG', items);
  assert.equal(name1, 'K-001.png');

  items.push({
    id: '1',
    fileName: name1,
    format: 'PNG',
    timestamp: Date.now(),
    width: 640,
    height: 480,
    dataUrl: '',
    fileSize: 1024,
  });

  const name2 = generateFileName('sequential1', 'PNG', items);
  assert.equal(name2, 'K-002.png');

  items.push({
    id: '2',
    fileName: name2,
    format: 'PNG',
    timestamp: Date.now(),
    width: 640,
    height: 480,
    dataUrl: '',
    fileSize: 1024,
  });

  const name3 = generateFileName('sequential1', 'JPG', items);
  assert.equal(name3, 'K-003.jpg');
});

test('generateFileName correctly fills holes in sequential #2 naming', () => {
  // Existing files: K-001 and K-003 (K-002 was deleted)
  const items: CapturedItem[] = [
    {
      id: '1',
      fileName: 'K-001.png',
      format: 'PNG',
      timestamp: Date.now(),
      width: 640,
      height: 480,
      dataUrl: '',
      fileSize: 1024,
    },
    {
      id: '3',
      fileName: 'K-003.png',
      format: 'PNG',
      timestamp: Date.now(),
      width: 640,
      height: 480,
      dataUrl: '',
      fileSize: 1024,
    },
  ];

  const filledHole = generateFileName('sequential2', 'PNG', items);
  assert.equal(filledHole, 'K-002.png');
});

test('generateFileName correctly formats datetime rule (K-YYYYMMDD-HHMMSS.ext)', () => {
  const dtName = generateFileName('datetime', 'PNG', []);
  assert.match(dtName, /^K-\d{8}-\d{6,8}\.png$/);

  const dtMp4 = generateFileName('datetime', 'MP4', []);
  assert.match(dtMp4, /^K-\d{8}-\d{6,8}\.mp4$/);
});

test('rgbToTColor, rgbToWeb, rgbToHex match Kalmuri specifications', () => {
  // Kalmuri manual test vector:
  // Color with RGB(255, 153, 51):
  // HEX: FF9933
  // RGB: 255,153,51
  // Web: #FF9933
  // TColor: $003399FF (Delphi $00BBGGRR format where B=FF, G=99, R=33)
  const r = 255;
  const g = 153;
  const b = 51;

  assert.equal(rgbToHex(r, g, b), 'FF9933');
  assert.equal(rgbToWeb(r, g, b), '#FF9933');
  assert.equal(rgbToTColor(r, g, b), '$003399FF');

  const colorInfo = buildColorInfo(r, g, b);
  assert.equal(colorInfo.hex, 'FF9933');
  assert.equal(colorInfo.web, '#FF9933');
  assert.equal(colorInfo.rgb, '255,153,51');
  assert.equal(colorInfo.tcolor, '$003399FF');
});
