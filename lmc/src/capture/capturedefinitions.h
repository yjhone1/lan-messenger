/****************************************************************************
**
** This file is part of LAN Messenger.
** 
** Copyright (c) 2010 - 2012 Qualia Digital Solutions.
** 
** Contact:  qualiatech@gmail.com
** 
** LAN Messenger is free software: you can redistribute it and/or modify
** it under the terms of the GNU General Public License as published by
** the Free Software Foundation, either version 3 of the License, or
** (at your option) any later version.
**
** LAN Messenger is distributed in the hope that it will be useful,
** but WITHOUT ANY WARRANTY; without even the implied warranty of
** MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
** GNU General Public License for more details.
**
** You should have received a copy of the GNU General Public License
** along with LAN Messenger.  If not, see <http://www.gnu.org/licenses/>.
**
****************************************************************************/

#ifndef CAPTUREDEFINITIONS_H
#define CAPTUREDEFINITIONS_H

#include <QString>
#include <QKeySequence>
#include <QColor>

enum CaptureArea {
  CA_FullScreen = 0,    // 전체화면 캡쳐
  CA_Area,              // 영역화면 캡쳐
  CA_Drag,              // 드래그영역 캡쳐
  CA_ActiveWindow,      // 활성중인 화면 캡쳐
  CA_Control,           // 윈도우 컨트롤 캡쳐
  CA_WebPage,           // 웹페이지 캡쳐
  CA_Color              // 색상 추출
};

enum CaptureFormat {
  CF_PNG = 0,
  CF_JPG,
  CF_GIF,
  CF_BMP,
  CF_WebP,
  CF_TXT,               // 글자 인식 (OCR)
  CF_Clipboard,         // 클립보드 복사
  CF_Floating,          // 플러팅 (화면에 항상 위 띄우기)
  CF_Printer            // 프린터 출력
};

enum NamingRule {
  NR_Sequential1 = 0,   // 순차적 #1: K-001, K-002...
  NR_Sequential2,       // 순차적 #2: 비어 있는 가장 작은 번호부터 채움
  NR_DateTime           // 날짜시간: K-YYYYMMDD-HHMMSS
};

enum CaptureSound {
  CS_None = 0,
  CS_Pre,
  CS_Post
};

/**
 * Converts QColor to Delphi/Windows TColor hex string ($00BBGGRR).
 * Example: RGB(255, 153, 51) -> $003399FF (as documented in Kalmuri manual).
 */
inline QString colorToTColor(const QColor& color) {
  QString r = QString("%1").arg(color.red(), 2, 16, QChar('0')).toUpper();
  QString g = QString("%1").arg(color.green(), 2, 16, QChar('0')).toUpper();
  QString b = QString("%1").arg(color.blue(), 2, 16, QChar('0')).toUpper();
  return QString("$00%1%2%3").arg(b, g, r);
}

/**
 * Validates if candidate shortcut conflicts with LAN Messenger reserved shortcuts.
 * LAN Messenger reserved:
 * Ctrl+G (Public Chat), Ctrl+B (Broadcast), Ctrl+H (History),
 * Ctrl+J (Transfers), Ctrl+P (Preferences), Ctrl+S (Save), Enter / Ctrl+Enter.
 */
inline bool isShortcutConflictingWithLmc(const QKeySequence& shortcut, QString* pConflictName = nullptr) {
  if (shortcut.isEmpty()) return false;

  QKeySequence ctrlG(int(Qt::ControlModifier) | int(Qt::Key_G));
  QKeySequence ctrlB(int(Qt::ControlModifier) | int(Qt::Key_B));
  QKeySequence ctrlH(int(Qt::ControlModifier) | int(Qt::Key_H));
  QKeySequence ctrlJ(int(Qt::ControlModifier) | int(Qt::Key_J));
  QKeySequence ctrlP(int(Qt::ControlModifier) | int(Qt::Key_P));
  QKeySequence ctrlS(int(Qt::ControlModifier) | int(Qt::Key_S));

  if (shortcut == ctrlG) {
    if (pConflictName) *pConflictName = "Ctrl+G (Public Chat)";
    return true;
  }
  if (shortcut == ctrlB) {
    if (pConflictName) *pConflictName = "Ctrl+B (Send Broadcast)";
    return true;
  }
  if (shortcut == ctrlH) {
    if (pConflictName) *pConflictName = "Ctrl+H (History)";
    return true;
  }
  if (shortcut == ctrlJ) {
    if (pConflictName) *pConflictName = "Ctrl+J (File Transfers)";
    return true;
  }
  if (shortcut == ctrlP || shortcut == QKeySequence::Preferences) {
    if (pConflictName) *pConflictName = "Ctrl+P (Preferences)";
    return true;
  }
  if (shortcut == ctrlS || shortcut == QKeySequence::Save) {
    if (pConflictName) *pConflictName = "Ctrl+S (Save Conversation)";
    return true;
  }
  return false;
}

#endif // CAPTUREDEFINITIONS_H
