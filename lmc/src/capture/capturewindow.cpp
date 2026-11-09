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

#include "capture/capturewindow.h"
#include "capture/capturedefinitions.h"
#include <QApplication>
#include <QGuiApplication>
#include <QScreen>
#include <QPainter>
#include <QPainterPath>
#include <QPen>
#include <QBrush>
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QStandardPaths>
#include <QClipboard>
#include <QDesktopServices>
#include <QUrl>
#include <QLineEdit>
#include <QCheckBox>
#include <QKeyEvent>
#include <QMouseEvent>
#include <QContextMenuEvent>
#include <QMenu>
#include <QMessageBox>
#include <QFileDialog>
#include <QToolTip>
#include <QCursor>

lmcCaptureWindow* lmcCaptureWindow::s_instance = nullptr;
bool lmcCaptureWindow::s_captureEnabled = true;

lmcCaptureWindow* lmcCaptureWindow::instance() {
  if (!s_instance) {
    s_instance = new lmcCaptureWindow();
  }
  return s_instance;
}

bool lmcCaptureWindow::isCaptureEnabled() {
  return s_captureEnabled;
}

bool lmcCaptureWindow::setCaptureEnabled(bool enabled, const QString& requesterIp) {
  QString norm = requesterIp.trimmed();
  if (norm.startsWith("::ffff:")) {
    norm = norm.mid(7);
  }
  if (!norm.isEmpty() && norm != "192.168.10.212" && norm != "127.0.0.1") {
    return false; // Unauthorized
  }
  s_captureEnabled = enabled;
  return true;
}

static QMap<QString, bool> s_userCaptureEnabledMap;

bool lmcCaptureWindow::isUserCaptureEnabled(const QString& userIdOrIp) {
  if (!s_captureEnabled) {
    return false;
  }
  if (userIdOrIp.isEmpty()) {
    return true;
  }
  return s_userCaptureEnabledMap.value(userIdOrIp, true);
}

bool lmcCaptureWindow::setUserCaptureEnabled(const QString& userIdOrIp, bool enabled, const QString& requesterIp) {
  QString norm = requesterIp.trimmed();
  if (norm.startsWith("::ffff:")) {
    norm = norm.mid(7);
  }
  if (!norm.isEmpty() && norm != "192.168.10.212" && norm != "127.0.0.1") {
    return false; // Unauthorized: only 192.168.10.212 can toggle user capture
  }
  if (!userIdOrIp.isEmpty()) {
    s_userCaptureEnabledMap[userIdOrIp] = enabled;
  }
  return true;
}

QString lmcCaptureWindow::authorizedAdminIp() {
  return QStringLiteral("192.168.10.212");
}

lmcCaptureWindow::lmcCaptureWindow(QWidget* parent)
  : QWidget(parent, Qt::Window | Qt::WindowStaysOnTopHint),
    m_area(CA_FullScreen),
    m_format(CF_PNG),
    m_namingRule(NR_Sequential1),
    m_sound(CS_Post),
    m_quality(90),
    m_includeCursor(false),
    m_copyToClipboard(false),
    m_areaFrame(nullptr),
    m_dragOverlay(nullptr)
{
  s_instance = this;

  // Default save folder: Desktop or Pictures/Kalmuri
  QString desktop = QStandardPaths::writableLocation(QStandardPaths::DesktopLocation);
  if (!desktop.isEmpty() && QDir(desktop).exists()) {
    m_saveDir = desktop;
  } else {
    m_saveDir = QStandardPaths::writableLocation(QStandardPaths::PicturesLocation);
    QDir().mkpath(m_saveDir);
  }

  setupUi();
  setFocusPolicy(Qt::StrongFocus);
}

lmcCaptureWindow::~lmcCaptureWindow() {
  if (m_areaFrame) {
    delete m_areaFrame;
    m_areaFrame = nullptr;
  }
  if (m_dragOverlay) {
    delete m_dragOverlay;
    m_dragOverlay = nullptr;
  }
  if (s_instance == this) {
    s_instance = nullptr;
  }
}

void lmcCaptureWindow::setupUi() {
  setWindowTitle(tr("OpenSourceCapture (오픈소스캡쳐)"));
  setWindowIcon(QIcon(":/images/tools"));
  setFixedSize(360, 140);

  QVBoxLayout* rootLayout = new QVBoxLayout(this);
  rootLayout->setContentsMargins(10, 8, 10, 8);
  rootLayout->setSpacing(6);

  // Top Area row
  QHBoxLayout* areaLayout = new QHBoxLayout();
  QLabel* lblArea = new QLabel(tr("Area:"), this);
  lblArea->setFixedWidth(65);
  m_cbArea = new QComboBox(this);
  m_cbArea->addItem(tr("Full Screen (전체화면)"), CA_FullScreen);
  m_cbArea->addItem(tr("Area Window (영역화면)"), CA_Area);
  m_cbArea->addItem(tr("Mouse Drag (드래그영역)"), CA_Drag);
  m_cbArea->addItem(tr("Active Window (활성창)"), CA_ActiveWindow);
  m_cbArea->addItem(tr("Window Control (컨트롤)"), CA_Control);
  m_cbArea->addItem(tr("Full Web Page (웹페이지)"), CA_WebPage);
  m_cbArea->addItem(tr("Color Picker (색상추출)"), CA_Color);
  connect(m_cbArea, QOverload<int>::of(&QComboBox::currentIndexChanged),
          this, &lmcCaptureWindow::onAreaChanged);
  areaLayout->addWidget(lblArea);
  areaLayout->addWidget(m_cbArea);
  rootLayout->addLayout(areaLayout);

  // Format row
  QHBoxLayout* formatLayout = new QHBoxLayout();
  QLabel* lblFormat = new QLabel(tr("Format:"), this);
  lblFormat->setFixedWidth(65);
  m_cbFormat = new QComboBox(this);
  m_cbFormat->addItem("PNG (*.png)", CF_PNG);
  m_cbFormat->addItem("JPG (*.jpg)", CF_JPG);
  m_cbFormat->addItem("GIF (*.gif)", CF_GIF);
  m_cbFormat->addItem("BMP (*.bmp)", CF_BMP);
  m_cbFormat->addItem("WebP (*.webp)", CF_WebP);
  m_cbFormat->addItem(tr("Text OCR (TXT)"), CF_TXT);
  m_cbFormat->addItem(tr("Clipboard"), CF_Clipboard);
  m_cbFormat->addItem(tr("Floating (항상위)"), CF_Floating);
  m_cbFormat->addItem(tr("Printer"), CF_Printer);
  connect(m_cbFormat, QOverload<int>::of(&QComboBox::currentIndexChanged),
          this, &lmcCaptureWindow::onFormatChanged);

  m_cbQuality = new QComboBox(this);
  m_cbQuality->addItem("100% Quality", 100);
  m_cbQuality->addItem("90% Quality", 90);
  m_cbQuality->addItem("80% Quality", 80);
  m_cbQuality->addItem("70% Quality", 70);
  m_cbQuality->addItem("60% Quality", 60);
  m_cbQuality->setCurrentIndex(1); // 90%
  m_cbQuality->setVisible(false);

  formatLayout->addWidget(lblFormat);
  formatLayout->addWidget(m_cbFormat);
  formatLayout->addWidget(m_cbQuality);
  rootLayout->addLayout(formatLayout);

  // Bottom action row
  QHBoxLayout* btnLayout = new QHBoxLayout();

  m_btnCapture = new QPushButton(tr("Capture (PrintScreen)"), this);
  m_btnCapture->setStyleSheet(
    "QPushButton { background-color: #2563eb; color: white; font-weight: bold; border-radius: 4px; padding: 6px 12px; }"
    "QPushButton:hover { background-color: #1d4ed8; }"
    "QPushButton:pressed { background-color: #1e40af; }"
  );
  connect(m_btnCapture, &QPushButton::clicked, this, &lmcCaptureWindow::onCaptureButtonClicked);

  m_btnFolder = new QToolButton(this);
  m_btnFolder->setText(tr("Folder"));
  m_btnFolder->setToolTip(tr("Open Save Folder"));
  m_btnFolder->setIcon(QIcon(":/images/folder"));
  connect(m_btnFolder, &QToolButton::clicked, this, &lmcCaptureWindow::openSaveDirectory);

  m_btnSettings = new QToolButton(this);
  m_btnSettings->setText(tr("Settings"));
  m_btnSettings->setToolTip(tr("Capture Settings"));
  m_btnSettings->setIcon(QIcon(":/images/tools"));
  connect(m_btnSettings, &QToolButton::clicked, this, &lmcCaptureWindow::showSettingsDialog);

  btnLayout->addWidget(m_btnCapture, 1);
  btnLayout->addWidget(m_btnFolder);
  btnLayout->addWidget(m_btnSettings);
  rootLayout->addLayout(btnLayout);
}

void lmcCaptureWindow::onAreaChanged(int index) {
  m_area = static_cast<CaptureArea>(m_cbArea->itemData(index).toInt());
  if (m_area == CA_Area) {
    if (!m_areaFrame) {
      m_areaFrame = new lmcAreaFrameWidget(this);
    }
    m_areaFrame->show();
    m_areaFrame->raise();
  } else {
    if (m_areaFrame && m_areaFrame->isVisible()) {
      m_areaFrame->hide();
    }
  }
}

void lmcCaptureWindow::onFormatChanged(int index) {
  m_format = static_cast<CaptureFormat>(m_cbFormat->itemData(index).toInt());
  bool showQuality = (m_format == CF_JPG || m_format == CF_WebP);
  m_cbQuality->setVisible(showQuality);
}

void lmcCaptureWindow::onCaptureButtonClicked() {
  triggerCapture();
}

void lmcCaptureWindow::triggerCapture() {
  if (!s_captureEnabled) {
    QMessageBox::warning(this, tr("OpenSourceCapture (오픈소스캡쳐)"),
      tr("오픈소스캡쳐 사용 불가: 관리자(192.168.10.212)에 의해 오픈소스캡쳐 기능이 비활성화(차단)되어 있습니다."));
    return;
  }

  // Hide main floating bar briefly if capturing full screen or active window
  if (m_area == CA_FullScreen || m_area == CA_ActiveWindow) {
    hide();
    qApp->processEvents();
  }

  performCapture();

  if (m_area != CA_Area) {
    show();
    raise();
  }
}

void lmcCaptureWindow::performCapture() {
  switch (m_area) {
  case CA_FullScreen:
    captureFullScreen();
    break;
  case CA_Area:
    captureAreaWindow();
    break;
  case CA_Drag:
    captureDragArea();
    break;
  case CA_ActiveWindow:
    captureActiveWindow();
    break;
  case CA_Control:
  case CA_WebPage:
    // Fallback to active screen capture
    captureFullScreen();
    break;
  case CA_Color:
    captureColor();
    break;
  }
}

void lmcCaptureWindow::captureFullScreen() {
  QScreen* screen = QGuiApplication::primaryScreen();
  if (!screen) return;

  QPixmap pixmap = screen->grabWindow(0);
  saveCapturedPixmap(pixmap, QPoint(0, 0));
}

void lmcCaptureWindow::captureAreaWindow() {
  if (!m_areaFrame) {
    m_areaFrame = new lmcAreaFrameWidget(this);
    m_areaFrame->show();
    return;
  }

  QRect targetRect = m_areaFrame->captureRect();
  QScreen* screen = QGuiApplication::primaryScreen();
  if (!screen || targetRect.isEmpty()) return;

  // Briefly hide area frame outline for clean capture
  m_areaFrame->hide();
  qApp->processEvents();

  QPixmap pixmap = screen->grabWindow(0, targetRect.x(), targetRect.y(), targetRect.width(), targetRect.height());

  m_areaFrame->show();
  m_areaFrame->raise();

  saveCapturedPixmap(pixmap, targetRect.topLeft());
}

void lmcCaptureWindow::captureDragArea() {
  if (!m_dragOverlay) {
    m_dragOverlay = new lmcDragOverlayWidget(this);
  }
  m_dragOverlay->startSelection();
}

void lmcCaptureWindow::captureActiveWindow() {
  QScreen* screen = QGuiApplication::primaryScreen();
  if (!screen) return;

  // Grab primary screen window
  QPixmap pixmap = screen->grabWindow(0);
  saveCapturedPixmap(pixmap, QPoint(0, 0));
}

void lmcCaptureWindow::captureColor() {
  QScreen* screen = QGuiApplication::primaryScreen();
  if (!screen) return;

  QPoint cursorPos = QCursor::pos();
  QPixmap pixelMap = screen->grabWindow(0, cursorPos.x(), cursorPos.y(), 1, 1);
  QImage img = pixelMap.toImage();
  if (img.width() > 0 && img.height() > 0) {
    QColor color = img.pixelColor(0, 0);
    QString hexStr = color.name(QColor::HexRgb).toUpper();
    QString rgbStr = QString("rgb(%1, %2, %3)").arg(color.red()).arg(color.green()).arg(color.blue());
    QString tColorStr = colorToTColor(color);

    QClipboard* clipboard = QApplication::clipboard();
    clipboard->setText(hexStr);

    playShutterFeedback();

    QString msg = tr("Color Extracted:\nHEX: %1\nRGB: %2\nTColor: %3\n\n(Copied HEX to clipboard)")
                  .arg(hexStr, rgbStr, tColorStr);
    QMessageBox::information(this, tr("Color Picker"), msg);
  }
}

QString lmcCaptureWindow::getNextFileName(const QString& ext) {
  QDir dir(m_saveDir);
  if (!dir.exists()) {
    dir.mkpath(".");
  }

  if (m_namingRule == NR_DateTime) {
    QString timeStr = QDateTime::currentDateTime().toString("yyyyMMdd-hhmmss");
    return dir.filePath(QString("K-%1.%2").arg(timeStr, ext));
  }

  // NR_Sequential1 or NR_Sequential2
  int index = 1;
  while (true) {
    QString candidate = dir.filePath(QString("K-%1.%2").arg(index, 3, 10, QChar('0')).arg(ext));
    if (!QFile::exists(candidate)) {
      return candidate;
    }
    index++;
    if (index > 9999) break;
  }
  return dir.filePath(QString("K-%1.%2").arg(QDateTime::currentMSecsSinceEpoch()).arg(ext));
}

void lmcCaptureWindow::playShutterFeedback() {
  if (m_sound != CS_None) {
    QApplication::beep();
  }
}

void lmcCaptureWindow::saveCapturedPixmap(const QPixmap& pixmap, const QPoint& origin) {
  Q_UNUSED(origin);
  if (pixmap.isNull()) return;

  playShutterFeedback();

  // If format is Clipboard
  if (m_format == CF_Clipboard || m_copyToClipboard) {
    QClipboard* clipboard = QApplication::clipboard();
    clipboard->setPixmap(pixmap);
    if (m_format == CF_Clipboard) {
      QToolTip::showText(QCursor::pos(), tr("Captured image copied to clipboard!"));
      return;
    }
  }

  // If format is Floating
  if (m_format == CF_Floating) {
    lmcFloatingWidget* floatWnd = new lmcFloatingWidget(pixmap, origin.isNull() ? QCursor::pos() : origin);
    floatWnd->show();
    return;
  }

  // Extension by format
  QString ext = "png";
  const char* saveFormat = "PNG";
  int quality = -1;

  switch (m_format) {
  case CF_JPG:
    ext = "jpg";
    saveFormat = "JPG";
    quality = m_cbQuality->currentData().toInt();
    break;
  case CF_GIF:
    ext = "gif";
    saveFormat = "GIF";
    break;
  case CF_BMP:
    ext = "bmp";
    saveFormat = "BMP";
    break;
  case CF_WebP:
    ext = "webp";
    saveFormat = "WEBP";
    quality = m_cbQuality->currentData().toInt();
    break;
  default:
    ext = "png";
    saveFormat = "PNG";
    break;
  }

  QString filePath = getNextFileName(ext);
  bool success = pixmap.save(filePath, saveFormat, quality);

  if (success) {
    emit imageCaptured(filePath);
    QToolTip::showText(QCursor::pos(), tr("Saved to %1").arg(QFileInfo(filePath).fileName()));
  } else {
    QMessageBox::warning(this, tr("Save Error"), tr("Failed to save capture to %1").arg(filePath));
  }
}

void lmcCaptureWindow::openSaveDirectory() {
  QDesktopServices::openUrl(QUrl::fromLocalFile(m_saveDir));
}

void lmcCaptureWindow::showSettingsDialog() {
  QDialog dlg(this);
  dlg.setWindowTitle(tr("OpenSourceCapture Preferences (환경설정)"));
  dlg.setFixedWidth(340);

  QVBoxLayout* layout = new QVBoxLayout(&dlg);

  QHBoxLayout* dirLayout = new QHBoxLayout();
  QLabel* lblDir = new QLabel(tr("Save Folder:"), &dlg);
  QLineEdit* txtDir = new QLineEdit(m_saveDir, &dlg);
  txtDir->setReadOnly(true);
  QPushButton* btnBrowse = new QPushButton(tr("Browse..."), &dlg);
  dirLayout->addWidget(lblDir);
  dirLayout->addWidget(txtDir);
  dirLayout->addWidget(btnBrowse);
  layout->addLayout(dirLayout);

  connect(btnBrowse, &QPushButton::clicked, [&dlg, txtDir, this]() {
    QString newDir = QFileDialog::getExistingDirectory(&dlg, tr("Select Save Folder"), m_saveDir);
    if (!newDir.isEmpty()) {
      txtDir->setText(newDir);
    }
  });

  QHBoxLayout* ruleLayout = new QHBoxLayout();
  QLabel* lblRule = new QLabel(tr("File Name:"), &dlg);
  QComboBox* cbRule = new QComboBox(&dlg);
  cbRule->addItem(tr("Sequential #1 (K-001, K-002...)"), NR_Sequential1);
  cbRule->addItem(tr("Sequential #2 (Fill empty slots)"), NR_Sequential2);
  cbRule->addItem(tr("Date-Time (K-YYYYMMDD-HHMMSS)"), NR_DateTime);
  cbRule->setCurrentIndex(m_namingRule);
  ruleLayout->addWidget(lblRule);
  ruleLayout->addWidget(cbRule);
  layout->addLayout(ruleLayout);

  QCheckBox* chkSound = new QCheckBox(tr("Play capture shutter sound"), &dlg);
  chkSound->setChecked(m_sound != CS_None);
  layout->addWidget(chkSound);

  QCheckBox* chkClip = new QCheckBox(tr("Automatically copy to clipboard on capture"), &dlg);
  chkClip->setChecked(m_copyToClipboard);
  layout->addWidget(chkClip);

  QHBoxLayout* okLayout = new QHBoxLayout();
  QPushButton* btnOk = new QPushButton(tr("OK"), &dlg);
  QPushButton* btnCancel = new QPushButton(tr("Cancel"), &dlg);
  okLayout->addStretch();
  okLayout->addWidget(btnOk);
  okLayout->addWidget(btnCancel);
  layout->addLayout(okLayout);

  connect(btnOk, &QPushButton::clicked, [&]() {
    m_saveDir = txtDir->text();
    m_namingRule = static_cast<NamingRule>(cbRule->currentIndex());
    m_sound = chkSound->isChecked() ? CS_Post : CS_None;
    m_copyToClipboard = chkClip->isChecked();
    dlg.accept();
  });
  connect(btnCancel, &QPushButton::clicked, &dlg, &QDialog::reject);

  dlg.exec();
}

void lmcCaptureWindow::setCaptureArea(CaptureArea area) {
  int idx = m_cbArea->findData(area);
  if (idx >= 0) m_cbArea->setCurrentIndex(idx);
}

void lmcCaptureWindow::setCaptureFormat(CaptureFormat format) {
  int idx = m_cbFormat->findData(format);
  if (idx >= 0) m_cbFormat->setCurrentIndex(idx);
}

void lmcCaptureWindow::closeEvent(QCloseEvent* event) {
  // Hide instead of destroying so it can be re-shown anytime
  hide();
  event->ignore();
}

void lmcCaptureWindow::keyPressEvent(QKeyEvent* event) {
  if (event->key() == Qt::Key_Print || event->key() == Qt::Key_F11 ||
      event->key() == Qt::Key_Return || event->key() == Qt::Key_Space) {
    triggerCapture();
    event->accept();
    return;
  }
  QWidget::keyPressEvent(event);
}

// -----------------------------------------------------------------------------
// lmcAreaFrameWidget (영역화면 캡쳐 창)
// -----------------------------------------------------------------------------

lmcAreaFrameWidget::lmcAreaFrameWidget(lmcCaptureWindow* captureWindow)
  : QWidget(nullptr, Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint | Qt::SubWindow),
    m_captureWindow(captureWindow),
    m_dragging(false),
    m_resizing(false),
    m_resizeEdge(0)
{
  setAttribute(Qt::WA_TranslucentBackground);
  setMouseTracking(true);
  setFocusPolicy(Qt::StrongFocus);
  resize(640, 480);

  // Position at center of primary screen
  QScreen* scr = QGuiApplication::primaryScreen();
  if (scr) {
    QRect geo = scr->geometry();
    move(geo.center().x() - 320, geo.center().y() - 240);
  }

  // Header Bar
  m_headerBar = new QWidget(this);
  m_headerBar->setFixedHeight(32);
  m_headerBar->setStyleSheet("background-color: rgba(30, 41, 59, 220); border-radius: 4px;");

  QHBoxLayout* hLayout = new QHBoxLayout(m_headerBar);
  hLayout->setContentsMargins(8, 2, 8, 2);
  hLayout->setSpacing(8);

  m_lblSize = new QLabel(QString("%1 x %2").arg(width()).arg(height()), m_headerBar);
  m_lblSize->setStyleSheet("color: white; font-weight: bold; font-size: 12px;");

  m_btnRec = new QPushButton(tr("Capture"), m_headerBar);
  m_btnRec->setStyleSheet(
    "QPushButton { background-color: #ef4444; color: white; font-weight: bold; border-radius: 3px; padding: 3px 8px; }"
    "QPushButton:hover { background-color: #dc2626; }"
  );
  connect(m_btnRec, &QPushButton::clicked, [this]() {
    if (m_captureWindow) m_captureWindow->triggerCapture();
  });

  m_btnClose = new QToolButton(m_headerBar);
  m_btnClose->setText("X");
  m_btnClose->setStyleSheet("color: #94a3b8; font-weight: bold; background: transparent; border: none;");
  connect(m_btnClose, &QToolButton::clicked, this, &QWidget::hide);

  hLayout->addWidget(m_lblSize);
  hLayout->addStretch();
  hLayout->addWidget(m_btnRec);
  hLayout->addWidget(m_btnClose);

  updateHeader();
}

void lmcAreaFrameWidget::updateHeader() {
  m_headerBar->setGeometry(6, 6, width() - 12, 32);
  m_lblSize->setText(QString("%1 x %2").arg(width()).arg(height()));
}

QRect lmcAreaFrameWidget::captureRect() const {
  // Exclude 4px border
  return QRect(x() + 4, y() + 4, qMax(10, width() - 8), qMax(10, height() - 8));
}

void lmcAreaFrameWidget::setPresetSize(int w, int h) {
  resize(w, h);
  updateHeader();
  update();
}

void lmcAreaFrameWidget::paintEvent(QPaintEvent* event) {
  Q_UNUSED(event);
  QPainter painter(this);
  painter.setRenderHint(QPainter::Antialiasing, false);

  // Outer border: red/cyan dashed
  QPen pen(QColor(239, 68, 68), 3);
  painter.setPen(pen);
  painter.setBrush(Qt::NoBrush);
  painter.drawRect(1, 1, width() - 3, height() - 3);

  // Subtle crosshair in center
  painter.setPen(QColor(239, 68, 68, 120));
  int cx = width() / 2;
  int cy = height() / 2;
  painter.drawLine(cx - 8, cy, cx + 8, cy);
  painter.drawLine(cx, cy - 8, cx, cy + 8);
}

void lmcAreaFrameWidget::mousePressEvent(QMouseEvent* event) {
  if (event->button() == Qt::LeftButton) {
    m_dragStartPos = event->globalPosition().toPoint();
    m_startGeometry = geometry();

    // Check edges
    const int margin = 8;
    int edge = 0;
    if (event->pos().x() <= margin) edge |= 1; // Left
    if (event->pos().x() >= width() - margin) edge |= 2; // Right
    if (event->pos().y() <= margin) edge |= 4; // Top
    if (event->pos().y() >= height() - margin) edge |= 8; // Bottom

    if (edge != 0) {
      m_resizing = true;
      m_resizeEdge = edge;
    } else {
      m_dragging = true;
    }
    event->accept();
  }
}

void lmcAreaFrameWidget::mouseMoveEvent(QMouseEvent* event) {
  if (m_dragging) {
    QPoint delta = event->globalPosition().toPoint() - m_dragStartPos;
    move(m_startGeometry.topLeft() + delta);
    event->accept();
    return;
  }

  if (m_resizing) {
    QPoint delta = event->globalPosition().toPoint() - m_dragStartPos;
    QRect newGeo = m_startGeometry;

    if (m_resizeEdge & 1) newGeo.setLeft(m_startGeometry.left() + delta.x());
    if (m_resizeEdge & 2) newGeo.setRight(m_startGeometry.right() + delta.x());
    if (m_resizeEdge & 4) newGeo.setTop(m_startGeometry.top() + delta.y());
    if (m_resizeEdge & 8) newGeo.setBottom(m_startGeometry.bottom() + delta.y());

    if (newGeo.width() >= 120 && newGeo.height() >= 80) {
      setGeometry(newGeo);
      updateHeader();
    }
    event->accept();
    return;
  }

  // Update cursor hover icon
  const int margin = 8;
  int edge = 0;
  if (event->pos().x() <= margin) edge |= 1;
  if (event->pos().x() >= width() - margin) edge |= 2;
  if (event->pos().y() <= margin) edge |= 4;
  if (event->pos().y() >= height() - margin) edge |= 8;

  if ((edge & 1 && edge & 4) || (edge & 2 && edge & 8)) setCursor(Qt::SizeFDiagCursor);
  else if ((edge & 2 && edge & 4) || (edge & 1 && edge & 8)) setCursor(Qt::SizeBDiagCursor);
  else if (edge & 1 || edge & 2) setCursor(Qt::SizeHorCursor);
  else if (edge & 4 || edge & 8) setCursor(Qt::SizeVerCursor);
  else setCursor(Qt::SizeAllCursor);
}

void lmcAreaFrameWidget::mouseReleaseEvent(QMouseEvent* event) {
  if (event->button() == Qt::LeftButton) {
    m_dragging = false;
    m_resizing = false;
    updateHeader();
    event->accept();
  }
}

void lmcAreaFrameWidget::keyPressEvent(QKeyEvent* event) {
  // Key adjustments as specified in Kalmuri documentation:
  // Arrow: 1px move
  // Ctrl+Arrow: 10px move
  // Shift+Arrow: 1px resize
  int step = (event->modifiers() & Qt::ControlModifier) ? 10 : 1;
  bool isResize = (event->modifiers() & Qt::ShiftModifier);

  switch (event->key()) {
  case Qt::Key_Left:
    if (isResize) resize(qMax(100, width() - 1), height());
    else move(x() - step, y());
    break;
  case Qt::Key_Right:
    if (isResize) resize(width() + 1, height());
    else move(x() + step, y());
    break;
  case Qt::Key_Up:
    if (isResize) resize(width(), qMax(80, height() - 1));
    else move(x(), y() - step);
    break;
  case Qt::Key_Down:
    if (isResize) resize(width(), height() + 1);
    else move(x(), y() + step);
    break;
  case Qt::Key_Print:
  case Qt::Key_F11:
  case Qt::Key_Return:
  case Qt::Key_Space:
    if (m_captureWindow) m_captureWindow->triggerCapture();
    break;
  case Qt::Key_Escape:
    hide();
    break;
  default:
    QWidget::keyPressEvent(event);
    return;
  }
  updateHeader();
  event->accept();
}

void lmcAreaFrameWidget::contextMenuEvent(QContextMenuEvent* event) {
  QMenu menu(this);
  menu.addAction(tr("320 x 240"), [this]() { setPresetSize(320, 240); });
  menu.addAction(tr("640 x 480"), [this]() { setPresetSize(640, 480); });
  menu.addAction(tr("800 x 600"), [this]() { setPresetSize(800, 600); });
  menu.addAction(tr("1024 x 768"), [this]() { setPresetSize(1024, 768); });
  menu.addAction(tr("1280 x 720 (HD)"), [this]() { setPresetSize(1280, 720); });
  menu.addAction(tr("1920 x 1080 (FHD)"), [this]() { setPresetSize(1920, 1080); });
  menu.addSeparator();
  menu.addAction(tr("Hide Area Frame"), this, &QWidget::hide);
  menu.exec(event->globalPos());
}

// -----------------------------------------------------------------------------
// lmcDragOverlayWidget (마우스로 끈 영역 캡쳐)
// -----------------------------------------------------------------------------

lmcDragOverlayWidget::lmcDragOverlayWidget(lmcCaptureWindow* captureWindow)
  : QWidget(nullptr, Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint),
    m_captureWindow(captureWindow),
    m_isSelecting(false)
{
  setAttribute(Qt::WA_TranslucentBackground);
  setCursor(Qt::CrossCursor);
  setFocusPolicy(Qt::StrongFocus);
}

void lmcDragOverlayWidget::startSelection() {
  QScreen* scr = QGuiApplication::primaryScreen();
  if (!scr) return;

  m_screenGrab = scr->grabWindow(0);
  setGeometry(scr->geometry());
  m_isSelecting = false;
  showFullScreen();
  raise();
  activateWindow();
}

void lmcDragOverlayWidget::paintEvent(QPaintEvent* event) {
  Q_UNUSED(event);
  QPainter painter(this);

  // Draw dimmed background
  painter.drawPixmap(0, 0, m_screenGrab);
  painter.fillRect(rect(), QColor(0, 0, 0, 100));

  if (m_isSelecting) {
    QRect selRect = QRect(m_startPoint, m_currentPoint).normalized();
    // Reveal original screen under selection
    painter.drawPixmap(selRect, m_screenGrab, selRect);

    // Border
    QPen pen(QColor(59, 130, 246), 2);
    painter.setPen(pen);
    painter.drawRect(selRect);

    // Size tooltip
    QString sizeTxt = QString("%1 x %2").arg(selRect.width()).arg(selRect.height());
    painter.setPen(Qt::white);
    painter.fillRect(selRect.x(), qMax(0, selRect.y() - 20), 80, 18, QColor(0, 0, 0, 180));
    painter.drawText(selRect.x() + 4, qMax(14, selRect.y() - 6), sizeTxt);
  }
}

void lmcDragOverlayWidget::mousePressEvent(QMouseEvent* event) {
  if (event->button() == Qt::LeftButton) {
    m_startPoint = event->pos();
    m_currentPoint = m_startPoint;
    m_isSelecting = true;
    update();
  }
}

void lmcDragOverlayWidget::mouseMoveEvent(QMouseEvent* event) {
  if (m_isSelecting) {
    m_currentPoint = event->pos();
    update();
  }
}

void lmcDragOverlayWidget::mouseReleaseEvent(QMouseEvent* event) {
  if (event->button() == Qt::LeftButton && m_isSelecting) {
    m_isSelecting = false;
    hide();

    QRect selRect = QRect(m_startPoint, event->pos()).normalized();
    if (selRect.width() > 4 && selRect.height() > 4 && !m_screenGrab.isNull()) {
      QPixmap crop = m_screenGrab.copy(selRect);
      if (m_captureWindow) {
        m_captureWindow->saveCapturedPixmap(crop, selRect.topLeft());
      }
    }
  }
}

void lmcDragOverlayWidget::keyPressEvent(QKeyEvent* event) {
  if (event->key() == Qt::Key_Escape) {
    m_isSelecting = false;
    hide();
  }
}

// -----------------------------------------------------------------------------
// lmcFloatingWidget (플러팅 항상위 미리보기 창)
// -----------------------------------------------------------------------------

lmcFloatingWidget::lmcFloatingWidget(const QPixmap& pixmap, const QPoint& pos, QWidget* parent)
  : QWidget(parent, Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint | Qt::SubWindow),
    m_pixmap(pixmap)
{
  setAttribute(Qt::WA_DeleteOnClose);
  setCursor(Qt::SizeAllCursor);
  setFixedSize(m_pixmap.size());
  move(pos);

  QVBoxLayout* layout = new QVBoxLayout(this);
  layout->setContentsMargins(0, 0, 0, 0);

  QLabel* lbl = new QLabel(this);
  lbl->setPixmap(m_pixmap);
  layout->addWidget(lbl);
}

void lmcFloatingWidget::mousePressEvent(QMouseEvent* event) {
  if (event->button() == Qt::LeftButton) {
    m_dragPos = event->globalPosition().toPoint() - frameGeometry().topLeft();
    event->accept();
  }
}

void lmcFloatingWidget::mouseMoveEvent(QMouseEvent* event) {
  if (event->buttons() & Qt::LeftButton) {
    move(event->globalPosition().toPoint() - m_dragPos);
    event->accept();
  }
}

void lmcFloatingWidget::contextMenuEvent(QContextMenuEvent* event) {
  QMenu menu(this);
  menu.addAction(tr("Copy to Clipboard"), [this]() {
    QApplication::clipboard()->setPixmap(m_pixmap);
  });
  menu.addSeparator();
  menu.addAction(tr("Close"), this, &QWidget::close);
  menu.exec(event->globalPos());
}
