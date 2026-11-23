// SPDX-License-Identifier: GPL-3.0-or-later
#include "utilitydialog.h"
#include "aiagentblocker.h"
#include "adminauth.h"
#include "adminaudit.h"
#include <QInputDialog>
#include <QElapsedTimer>
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
#include <QHBoxLayout>
#include <QFormLayout>
#include <QRegularExpression>
#include <QCoreApplication>

namespace {
void editCustomAgent(QWidget* parent, const AiAgentSpec& existing = {}) {
  QDialog editor(parent);
  editor.setWindowTitle(existing.key.isEmpty() ? QObject::tr("Add AI Agent") : QObject::tr("Edit AI Agent"));
  auto* layout = new QVBoxLayout(&editor);
  auto* form = new QFormLayout;
  auto* name = new QLineEdit(existing.name, &editor);
  name->setObjectName("customAgentName");
  name->setMaxLength(100);
  auto* executables = new QLineEdit(existing.matchExecutables.join(", "), &editor);
  executables->setObjectName("customAgentExecutables");
  executables->setPlaceholderText("myagent.exe, myagent-cli.exe");
  form->addRow(QObject::tr("Display name:"), name);
  form->addRow(QObject::tr("Executable names:"), executables);
  layout->addLayout(form);
  auto* help = new QLabel(QObject::tr("Enter exact process executable names, separated by commas. No paths or commands. "
      "Find the name in Task Manager > Details. Shared runtimes (python.exe, node.exe), browsers and system processes cannot be added. "
      "Saving an entry sets it to Allowed; uncheck it in the list to block."), &editor);
  help->setWordWrap(true);
  layout->addWidget(help);
  auto* buttons = new QDialogButtonBox(QDialogButtonBox::Save | QDialogButtonBox::Cancel, &editor);
  QObject::connect(buttons, &QDialogButtonBox::rejected, &editor, &QDialog::reject);
  QObject::connect(buttons, &QDialogButtonBox::accepted, &editor, [&] {
    QString error;
    if(!AiAgentBlocker::instance()->saveCustomAgent(existing.key, name->text(),
          executables->text().split(QRegularExpression("[,;\\n]"), Qt::KeepEmptyParts), &error)) {
      QMessageBox::warning(&editor, QObject::tr("AI Agent"), error);
      return;
    }
    AdminAudit::record("agents", "configuration", existing.key.isEmpty() ? "Custom agent added locally" : "Custom agent updated locally");
    editor.accept();
  });
  layout->addWidget(buttons);
  editor.resize(560, 280);
  editor.exec();
}
}

void showLocalUtilityDialog(QWidget* parent) {
  if(!AdminAuth::configured()) {
    QMessageBox::information(parent, QObject::tr("Administrator Password"),
        QObject::tr("Set an administrator password in Utilities > Administrator Password before opening AI Agent Settings."));
    return;
  }
  static QElapsedTimer failedAttempt;
  if(failedAttempt.isValid() && failedAttempt.elapsed() < 30000) {
    QMessageBox::warning(parent, QObject::tr("Administrator Password"),
        QObject::tr("Please wait 30 seconds after an incorrect password before trying again."));
    return;
  }
  bool accepted = false;
  const QString credential = QInputDialog::getText(parent, QObject::tr("Administrator Password"),
      QObject::tr("Enter this PC's administrator password to open AI Agent Settings:"),
      QLineEdit::Password, {}, &accepted);
  if(!accepted) return;
  if(!AdminAuth::verifyLocalPassword(credential)) {
    failedAttempt.start();
    AdminAudit::record("admin", "authentication", "Local AI agent settings authentication failed");
    QMessageBox::warning(parent, QObject::tr("Administrator Password"), QObject::tr("Incorrect administrator password."));
    return;
  }
  failedAttempt.invalidate();
  auto* dialog = new QDialog(parent);
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
  const auto rebuildRows = [rows, rowLayout, blocker, dialog] {
    while(auto* item = rowLayout->takeAt(0)) {
      delete item->widget();
      delete item;
    }
    for(const auto& spec : AiAgentBlocker::specs()) {
      auto* row = new QWidget(rows);
      auto* line = new QHBoxLayout(row);
      line->setContentsMargins(0, 0, 0, 0);
      auto* check = new QCheckBox(spec.name + " (" + spec.processBinary + ")", row);
      check->setObjectName("agent-" + spec.key);
      check->setToolTip(QCoreApplication::translate("AiAgentBlocker", spec.description.toUtf8().constData()));
      check->setChecked(blocker->isAllowed(spec.key));
      QObject::connect(check, &QCheckBox::toggled, blocker, [blocker, key = spec.key](bool allowed) {
        blocker->setAgentAllowed(key, allowed);
      });
      QObject::connect(blocker, &AiAgentBlocker::policyChanged, check,
                       [check, key = spec.key](const QMap<QString, bool>& policy) {
        QSignalBlocker guard(check);
        check->setChecked(policy.value(key, true));
      });
      line->addWidget(check, 1);
      if(AiAgentBlocker::isCustomAgent(spec.key)) {
        auto* edit = new QPushButton(QObject::tr("Edit..."), row);
        edit->setObjectName("edit-" + spec.key);
        QObject::connect(edit, &QPushButton::clicked, dialog, [dialog, spec] { editCustomAgent(dialog, spec); });
        line->addWidget(edit);
        auto* remove = new QPushButton(QObject::tr("Delete"), row);
        remove->setObjectName("delete-" + spec.key);
        QObject::connect(remove, &QPushButton::clicked, dialog, [dialog, blocker, spec] {
          if(QMessageBox::question(dialog, QObject::tr("Delete AI Agent"),
              QObject::tr("Delete %1? Messenger will stop blocking this custom entry.").arg(spec.name)) != QMessageBox::Yes) return;
          if(blocker->removeCustomAgent(spec.key)) AdminAudit::record("agents", "configuration", "Custom agent removed locally");
        });
        line->addWidget(remove);
      }
      rowLayout->addWidget(row);
    }
    rowLayout->addStretch();
  };
  rebuildRows();
  QObject::connect(blocker, &AiAgentBlocker::specsChanged, dialog, rebuildRows, Qt::QueuedConnection);
  scroll->setWidget(rows);
  layout->addWidget(scroll);
  auto* add = new QPushButton(QObject::tr("Add Agent..."), dialog);
  add->setObjectName("addCustomAgent");
  QObject::connect(add, &QPushButton::clicked, dialog, [dialog] { editCustomAgent(dialog); });
  layout->addWidget(add);
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
  // Keep an authenticated settings window from being left accessible behind the main window.
  dialog->exec();
  delete dialog;
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
