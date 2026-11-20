// SPDX-License-Identifier: GPL-3.0-or-later
#include "utilitydialog.h"
#include "aiagentblocker.h"
#include "adminauth.h"
#include "adminaudit.h"
#include <QInputDialog>
#include <QMessageBox>
#include <QLineEdit>
#include <QCheckBox>
#include <QDialog>
#include <QDialogButtonBox>
#include <QLabel>
#include <QPushButton>
#include <QScrollArea>
#include <QSignalBlocker>
#include <QVBoxLayout>

void showLocalUtilityDialog(QWidget* parent) {
  auto* dialog = new QDialog(parent);
  dialog->setAttribute(Qt::WA_DeleteOnClose);
  dialog->setObjectName("localUtilityDialog");
  dialog->setWindowTitle(QObject::tr("Local Utilities - AI Agent Settings"));
  dialog->resize(640, 520);
  auto* layout = new QVBoxLayout(dialog);
  auto* notice = new QLabel(QObject::tr(
      "This PC only. Checked = allowed (default). Unchecked = periodically terminate matching processes "
      "while Messenger is running. No system-wide execution ban is installed. "
      "Exiting or uninstalling Messenger stops enforcement; terminated processes must be restarted manually."), dialog);
  notice->setWordWrap(true);
  layout->addWidget(notice);
  auto* password = new QPushButton(QObject::tr("Set / Change Administrator Password..."), dialog);
  password->setObjectName("configureAdminPassword");
  QObject::connect(password, &QPushButton::clicked, dialog, [dialog] { configureLocalAdminPassword(dialog); });
  layout->addWidget(password);
  auto* scroll = new QScrollArea(dialog);
  scroll->setWidgetResizable(true);
  auto* rows = new QWidget(scroll);
  auto* rowLayout = new QVBoxLayout(rows);
  auto* blocker = AiAgentBlocker::instance();
  for(const auto& spec : AiAgentBlocker::specs()) {
    auto* check = new QCheckBox(spec.name + " (" + spec.processBinary + ")", rows);
    check->setObjectName("agent-" + spec.key);
    check->setToolTip(spec.description);
    check->setChecked(blocker->isAllowed(spec.key));
    QObject::connect(check, &QCheckBox::toggled, blocker, [blocker, key = spec.key](bool allowed) {
      blocker->setAgentAllowed(key, allowed);
    });
    QObject::connect(blocker, &AiAgentBlocker::policyChanged, check,
                     [check, key = spec.key](const QMap<QString, bool>& policy) {
      QSignalBlocker guard(check);
      check->setChecked(policy.value(key, true));
    });
    rowLayout->addWidget(check);
  }
  rowLayout->addStretch();
  scroll->setWidget(rows);
  layout->addWidget(scroll);
  auto* allow = new QPushButton(QObject::tr("Allow All"), dialog);
  QObject::connect(allow, &QPushButton::clicked, blocker, [blocker] { blocker->setAllAllowed(true); });
  layout->addWidget(allow);
  auto* status = new QLabel(QObject::tr("Watching for matching processes. Failures and successful terminations appear in /trace logs."), dialog);
  status->setWordWrap(true);
  QObject::connect(blocker, &AiAgentBlocker::agentProcessBlocked, status,
      [status](const QString&, const QString& name, const QString& process, qint64 pid) {
    status->setText(QObject::tr("Last terminated: %1 (%2), PID %3").arg(name, process).arg(pid));
  });
  QObject::connect(blocker, &AiAgentBlocker::agentProcessBlockFailed, status,
      [status](const QString& process, qint64 pid, const QString& reason) {
    status->setText(QObject::tr("Failed to terminate %1 (PID %2): %3").arg(process).arg(pid).arg(reason));
  });
  layout->addWidget(status);
  auto* buttons = new QDialogButtonBox(QDialogButtonBox::Close, dialog);
  QObject::connect(buttons, &QDialogButtonBox::rejected, dialog, &QDialog::close);
  layout->addWidget(buttons);
  dialog->show();
}

void configureLocalAdminPassword(QWidget* dialog) {
    bool ok = false;
    QString current;
    if(AdminAuth::configured()) {
      current = QInputDialog::getText(dialog, QObject::tr("Administrator Password"),
          QObject::tr("Current administrator password:"), QLineEdit::Password, {}, &ok);
      if(!ok) return;
    }
    const QString next = QInputDialog::getText(dialog, QObject::tr("Administrator Password"),
        QObject::tr("New password (at least 12 characters):"), QLineEdit::Password, {}, &ok);
    if(!ok) return;
    const QString confirm = QInputDialog::getText(dialog, QObject::tr("Administrator Password"),
        QObject::tr("Confirm new password:"), QLineEdit::Password, {}, &ok);
    if(!ok) return;
    if(next != confirm || !AdminAuth::setPassword(next, current)) {
      QMessageBox::warning(dialog, QObject::tr("Administrator Password"),
          QObject::tr("Password change failed. Check the current password and use at least 12 characters."));
      return;
    }
    AdminAudit::record("admin", "configuration", "Administrator credential configured locally");
    QMessageBox::information(dialog, QObject::tr("Administrator Password"),
        QObject::tr("Saved. Remote requests and diagnostics now require this PC's administrator password."));
}
