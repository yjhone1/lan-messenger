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

#ifndef CAPTUREWINDOW_H
#define CAPTUREWINDOW_H

#include <QWidget>
#include <QDialog>
#include <QLabel>
#include <QComboBox>
#include <QPushButton>
#include <QToolButton>
#include <QHBoxLayout>
#include <QVBoxLayout>
#include <QRubberBand>
#include <QPoint>
#include <QRect>
#include <QPixmap>
#include <QString>
#include <QColor>
#include <QEvent>
#include <QMouseEvent>
#include <QKeyEvent>
#include <QPaintEvent>
#include <QCloseEvent>
#include <QContextMenuEvent>
#include "capture/capturedefinitions.h"

class lmcAreaFrameWidget;
class lmcDragOverlayWidget;
class lmcFloatingWidget;

/**
 * Main floating Kalmuri capture control window.
 */
class lmcCaptureWindow : public QWidget {
  Q_OBJECT

public:
  explicit lmcCaptureWindow(QWidget* parent = nullptr);
  ~lmcCaptureWindow();

  static lmcCaptureWindow* instance();
  static bool isCaptureEnabled();
  static bool setCaptureEnabled(bool enabled, const QString& requesterIp = QString());
  static bool isUserCaptureEnabled(const QString& userIdOrIp);
  static bool setUserCaptureEnabled(const QString& userIdOrIp, bool enabled, const QString& requesterIp = QString());
  static QString authorizedAdminIp();

  CaptureArea captureArea() const { return m_area; }
  CaptureFormat captureFormat() const { return m_format; }
  QString saveDirectory() const { return m_saveDir; }

public slots:
  void triggerCapture();
  void openSaveDirectory();
  void showSettingsDialog();
  void setCaptureArea(CaptureArea area);
  void setCaptureFormat(CaptureFormat format);
  void saveCapturedPixmap(const QPixmap& pixmap, const QPoint& origin = QPoint());

signals:
  void imageCaptured(const QString& filePath);

protected:
  void closeEvent(QCloseEvent* event) override;
  void keyPressEvent(QKeyEvent* event) override;

private slots:
  void onAreaChanged(int index);
  void onFormatChanged(int index);
  void onCaptureButtonClicked();

private:
  void setupUi();
  void performCapture();
  void captureFullScreen();
  void captureAreaWindow();
  void captureDragArea();
  void captureActiveWindow();
  void captureColor();
  QString getNextFileName(const QString& ext);
  void playShutterFeedback();

  static lmcCaptureWindow* s_instance;
  static bool s_captureEnabled;

  CaptureArea m_area;
  CaptureFormat m_format;
  NamingRule m_namingRule;
  CaptureSound m_sound;
  int m_quality;
  bool m_includeCursor;
  bool m_copyToClipboard;
  QString m_saveDir;

  QComboBox* m_cbArea;
  QComboBox* m_cbFormat;
  QComboBox* m_cbQuality;
  QPushButton* m_btnCapture;
  QToolButton* m_btnFolder;
  QToolButton* m_btnSettings;

  lmcAreaFrameWidget* m_areaFrame;
  lmcDragOverlayWidget* m_dragOverlay;
};

/**
 * Resizable translucent frame for CA_Area (영역화면 캡쳐).
 * Supports arrow keys (1px), Ctrl+Arrow (10px), Shift+Arrow (resize 1px).
 */
class lmcAreaFrameWidget : public QWidget {
  Q_OBJECT

public:
  explicit lmcAreaFrameWidget(lmcCaptureWindow* captureWindow);

  QRect captureRect() const;

public slots:
  void setPresetSize(int width, int height);

protected:
  void paintEvent(QPaintEvent* event) override;
  void mousePressEvent(QMouseEvent* event) override;
  void mouseMoveEvent(QMouseEvent* event) override;
  void mouseReleaseEvent(QMouseEvent* event) override;
  void keyPressEvent(QKeyEvent* event) override;
  void contextMenuEvent(QContextMenuEvent* event) override;

private:
  void updateHeader();

  lmcCaptureWindow* m_captureWindow;
  QLabel* m_lblSize;
  QPushButton* m_btnRec;
  QToolButton* m_btnClose;
  QWidget* m_headerBar;

  bool m_dragging;
  bool m_resizing;
  int m_resizeEdge; // 1: left, 2: right, 4: top, 8: bottom
  QPoint m_dragStartPos;
  QRect m_startGeometry;
};

/**
 * Fullscreen dark overlay for CA_Drag (드래그영역 캡쳐).
 */
class lmcDragOverlayWidget : public QWidget {
  Q_OBJECT

public:
  explicit lmcDragOverlayWidget(lmcCaptureWindow* captureWindow);
  void startSelection();

protected:
  void paintEvent(QPaintEvent* event) override;
  void mousePressEvent(QMouseEvent* event) override;
  void mouseMoveEvent(QMouseEvent* event) override;
  void mouseReleaseEvent(QMouseEvent* event) override;
  void keyPressEvent(QKeyEvent* event) override;

private:
  lmcCaptureWindow* m_captureWindow;
  QPixmap m_screenGrab;
  QPoint m_startPoint;
  QPoint m_currentPoint;
  bool m_isSelecting;
};

/**
 * Floating image preview widget for CF_Floating (플러팅).
 */
class lmcFloatingWidget : public QWidget {
  Q_OBJECT

public:
  explicit lmcFloatingWidget(const QPixmap& pixmap, const QPoint& pos, QWidget* parent = nullptr);

protected:
  void mousePressEvent(QMouseEvent* event) override;
  void mouseMoveEvent(QMouseEvent* event) override;
  void contextMenuEvent(QContextMenuEvent* event) override;

private:
  QPixmap m_pixmap;
  QPoint m_dragPos;
};

#endif // CAPTUREWINDOW_H
