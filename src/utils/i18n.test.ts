import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLanguage,
  getLabels,
  toggleLanguage,
  t,
  getAppThemeConfig,
  normalizeAppTheme,
  saveAppThemeToStorage,
  loadAppThemeFromStorage,
  APP_THEME_STORAGE_KEY,
  EN_US_LABELS,
  KO_KR_LABELS,
} from './i18n';
import { VERSION_CONFIG, APP_VERSION } from '../types/lmc';

test('normalizeLanguage maps ko/ko_KR variants to ko_KR and defaults to en_US', () => {
  assert.equal(normalizeLanguage('en_US'), 'en_US');
  assert.equal(normalizeLanguage('ko_KR'), 'ko_KR');
  assert.equal(normalizeLanguage('ko'), 'ko_KR');
  assert.equal(normalizeLanguage('KO_kr'), 'ko_KR');
  assert.equal(normalizeLanguage(''), 'en_US');
  assert.equal(normalizeLanguage(undefined), 'en_US');
  assert.equal(normalizeLanguage('fr_FR'), 'en_US');
});

test('toggleLanguage switches cleanly between en_US and ko_KR', () => {
  assert.equal(toggleLanguage('en_US'), 'ko_KR');
  assert.equal(toggleLanguage('ko_KR'), 'en_US');
  assert.equal(toggleLanguage(undefined), 'ko_KR');
});

test('getLabels returns complete English and Korean label dictionaries', () => {
  const en = getLabels('en_US');
  const ko = getLabels('ko_KR');

  assert.equal(en.langCode, 'en_US');
  assert.equal(ko.langCode, 'ko_KR');
  assert.equal(en.mainWindow.title, 'LAN Messenger');
  assert.equal(ko.mainWindow.title, 'LAN 메신저');
  assert.equal(en.preferences.windowTitle, 'Preferences - LAN Messenger');
  assert.equal(ko.preferences.windowTitle, '환경설정 - LAN 메신저');
  assert.equal(en.preferences.categories.general, 'General');
  assert.equal(ko.preferences.categories.general, '일반');
  assert.equal(en.chatWindow.sendBtn, 'Send');
  assert.equal(ko.chatWindow.sendBtn, '전송');
});

test('t() resolves dot-separated keys for en_US and ko_KR and falls back safely', () => {
  assert.equal(t('en_US', 'mainWindow.preferences'), EN_US_LABELS.mainWindow.preferences);
  assert.equal(t('ko_KR', 'mainWindow.preferences'), KO_KR_LABELS.mainWindow.preferences);
  assert.equal(t('ko_KR', 'preferences.buttons.ok'), '확인');
  assert.equal(t('en_US', 'preferences.buttons.ok'), 'OK');
  assert.equal(t('ko_KR', 'status.chat'), '대화 가능');
  assert.equal(t('en_US', 'status.chat'), 'Available');
  assert.equal(t('en_US', 'nonexistent.key.path'), 'nonexistent.key.path');
});

test('getAppThemeConfig and normalizeAppTheme resolve classic, dark, and high-contrast themes', () => {
  const classic = getAppThemeConfig('classic');
  assert.equal(classic.id, 'classic');
  assert.equal(classic.koName, '클래식 윈도우');
  assert.equal(classic.windowBg, '#ece9d8');
  assert.equal(classic.borderOuter, '#0054e3');
  assert.equal(classic.borderStyle, 'solid');

  const dark = getAppThemeConfig('dark');
  assert.equal(dark.id, 'dark');
  assert.equal(dark.koName, '다크 모드');
  assert.equal(dark.windowBg, '#1e293b');
  assert.equal(dark.borderOuter, '#38bdf8');
  assert.equal(dark.borderStyle, 'solid');

  const highContrast = getAppThemeConfig('high-contrast');
  assert.equal(highContrast.id, 'high-contrast');
  assert.equal(highContrast.koName, '고대비');
  assert.equal(highContrast.windowBg, '#000000');
  assert.equal(highContrast.borderOuter, '#ffff00');
  assert.equal(highContrast.borderStyle, 'double');

  assert.equal(normalizeAppTheme('다크 모드'), 'dark');
  assert.equal(normalizeAppTheme('고대비'), 'high-contrast');
  assert.equal(normalizeAppTheme('클래식 윈도우'), 'classic');
});

test('saveAppThemeToStorage and loadAppThemeFromStorage persist and restore theme', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };

  // Defaults to classic when empty
  assert.equal(loadAppThemeFromStorage(mockStorage), 'classic');

  // Saves dark mode and loads it back
  assert.equal(saveAppThemeToStorage('다크 모드', mockStorage), 'dark');
  assert.equal(store.get(APP_THEME_STORAGE_KEY), 'dark');
  assert.equal(loadAppThemeFromStorage(mockStorage), 'dark');

  // Saves high-contrast mode and loads it back
  assert.equal(saveAppThemeToStorage('고대비', mockStorage), 'high-contrast');
  assert.equal(store.get(APP_THEME_STORAGE_KEY), 'high-contrast');
  assert.equal(loadAppThemeFromStorage(mockStorage), 'high-contrast');
});

test('userInfo modal labels include Windows/OS version detail, CPU, Memory, GPU, and MAC address in en_US and ko_KR', () => {
  const en = getLabels('en_US').modals.userInfo;
  const ko = getLabels('ko_KR').modals.userInfo;

  assert.equal(en.osDetail, 'Windows / OS Version Detail:');
  assert.equal(en.cpu, 'CPU (Processor):');
  assert.equal(en.memory, 'Memory (RAM):');
  assert.equal(en.gpu, 'Graphics Card (GPU):');
  assert.equal(en.macAddress, 'MAC Address (맥주소):');

  assert.equal(ko.osDetail, '윈도우 / OS 버전 상세:');
  assert.equal(ko.cpu, 'CPU 정보:');
  assert.equal(ko.memory, '메모리 (RAM) 정보:');
  assert.equal(ko.gpu, '그래픽카드 (GPU) 정보:');
  assert.equal(ko.macAddress, 'MAC 주소 (맥주소):');
});

test('VERSION_CONFIG defines v1.3.0.4 consistently for main window UI and UserInfoWindowModal', () => {
  assert.equal(VERSION_CONFIG.version, 'v1.3.0.4');
  assert.equal(VERSION_CONFIG.displayVersion, 'v1.3.0.4');
  assert.equal(VERSION_CONFIG.rawVersion, '1.3.0.4');
  assert.equal(VERSION_CONFIG.fullTitle, 'LAN Messenger v1.3.0.4');
  assert.equal(APP_VERSION, VERSION_CONFIG.version);
});


