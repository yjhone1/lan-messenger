QT       += core gui widgets network xml
unix: QT += multimedia

greaterThan(QT_MAJOR_VERSION, 4): QT += widgets

TARGET = lan-messenger
TEMPLATE = app

CONFIG += c++17

DEFINES += QT_DISABLE_DEPRECATED_BEFORE=0x060000
DEFINES += "IDA_VERSION=\\\"1.3.0\\\""
win32: DEFINES += UNICODE _UNICODE

INCLUDEPATH += \
    $$PWD/lmcapp/src \
    $$PWD/lmc/src

LIBS += -lcrypto
win32: LIBS += -ladvapi32

SOURCES += \
    lmcapp/src/application.cpp \
    lmcapp/src/qtlocalpeer.cpp \
    lmcapp/src/qtsingleapplication.cpp \
    lmc/src/app/main.cpp \
    lmc/src/app/apprunner.cpp \
    lmc/src/app/lmc.cpp \
    lmc/src/core/crypto.cpp \
    lmc/src/core/lmcstrings.cpp \
    lmc/src/core/settings.cpp \
    lmc/src/core/shared.cpp \
    lmc/src/core/soundplayer.cpp \
    lmc/src/core/theme.cpp \
    lmc/src/core/trace.cpp \
    lmc/src/gui/chat/broadcastwindow.cpp \
    lmc/src/gui/chat/chathelper.cpp \
    lmc/src/gui/chat/chatroomwindow.cpp \
    lmc/src/gui/chat/chatwindow.cpp \
    lmc/src/gui/chat/messagelog.cpp \
    lmc/src/gui/contacts/userinfowindow.cpp \
    lmc/src/gui/contacts/userselectdialog.cpp \
    lmc/src/gui/contacts/usertreewidget.cpp \
    lmc/src/gui/files/filemodelview.cpp \
    lmc/src/gui/files/transferlistview.cpp \
    lmc/src/gui/files/transferwindow.cpp \
    lmc/src/gui/history/historywindow.cpp \
    lmc/src/gui/main/aboutdialog.cpp \
    lmc/src/gui/main/helpwindow.cpp \
    lmc/src/gui/main/mainwindow.cpp \
    lmc/src/gui/main/settingsdialog.cpp \
    lmc/src/gui/main/updatewindow.cpp \
    lmc/src/gui/widgets/imagepicker.cpp \
    lmc/src/gui/widgets/imagepickeraction.cpp \
    lmc/src/gui/widgets/qmessagebrowser.cpp \
    lmc/src/gui/widgets/subcontrols.cpp \
    lmc/src/messaging/filemessagingproc.cpp \
    lmc/src/messaging/history.cpp \
    lmc/src/messaging/message.cpp \
    lmc/src/messaging/messaging.cpp \
    lmc/src/messaging/messagingproc.cpp \
    lmc/src/messaging/xmlmessage.cpp \
    lmc/src/network/datagram.cpp \
    lmc/src/network/netstreamer.cpp \
    lmc/src/network/network.cpp \
    lmc/src/network/tcpnetwork.cpp \
    lmc/src/network/udpnetwork.cpp \
    lmc/src/network/webnetwork.cpp \
    lmc/src/remote/remoteclient.cpp \
    lmc/src/remote/remoteserver.cpp \
    lmc/src/remote/remoteviewerwindow.cpp

HEADERS += \
    lmcapp/src/application.h \
    lmcapp/src/qtlocalpeer.h \
    lmcapp/src/qtlockedfile.h \
    lmcapp/src/qtsingleapplication.h \
    lmc/src/app/apprunner.h \
    lmc/src/app/lmc.h \
    lmc/src/app/resource.h \
    lmc/src/core/crypto.h \
    lmc/src/core/definitions.h \
    lmc/src/core/lmcstrings.h \
    lmc/src/core/settings.h \
    lmc/src/core/shared.h \
    lmc/src/core/soundplayer.h \
    lmc/src/core/stdlocation.h \
    lmc/src/core/theme.h \
    lmc/src/core/trace.h \
    lmc/src/core/uidefinitions.h \
    lmc/src/gui/chat/broadcastwindow.h \
    lmc/src/gui/chat/chatdefinitions.h \
    lmc/src/gui/chat/chathelper.h \
    lmc/src/gui/chat/chatroomwindow.h \
    lmc/src/gui/chat/chatwindow.h \
    lmc/src/gui/chat/messagelog.h \
    lmc/src/gui/contacts/userinfowindow.h \
    lmc/src/gui/contacts/userselectdialog.h \
    lmc/src/gui/contacts/usertreewidget.h \
    lmc/src/gui/files/filemodelview.h \
    lmc/src/gui/files/transferlistview.h \
    lmc/src/gui/files/transferwindow.h \
    lmc/src/gui/history/historytreewidget.h \
    lmc/src/gui/history/historywindow.h \
    lmc/src/gui/main/aboutdialog.h \
    lmc/src/gui/main/helpwindow.h \
    lmc/src/gui/main/mainwindow.h \
    lmc/src/gui/main/settingsdialog.h \
    lmc/src/gui/main/updatewindow.h \
    lmc/src/gui/widgets/actionhelper.h \
    lmc/src/gui/widgets/imagepicker.h \
    lmc/src/gui/widgets/imagepickeraction.h \
    lmc/src/gui/widgets/qmessagebrowser.h \
    lmc/src/gui/widgets/subcontrols.h \
    lmc/src/messaging/history.h \
    lmc/src/messaging/message.h \
    lmc/src/messaging/messaging.h \
    lmc/src/messaging/xmlmessage.h \
    lmc/src/network/datagram.h \
    lmc/src/network/netstreamer.h \
    lmc/src/network/network.h \
    lmc/src/network/tcpnetwork.h \
    lmc/src/network/udpnetwork.h \
    lmc/src/network/webnetwork.h \
    lmc/src/remote/remoteclient.h \
    lmc/src/remote/remotedefinitions.h \
    lmc/src/remote/remoteserver.h \
    lmc/src/remote/remoteviewerwindow.h

FORMS += \
    lmc/src/gui/chat/broadcastwindow.ui \
    lmc/src/gui/chat/chatroomwindow.ui \
    lmc/src/gui/chat/chatwindow.ui \
    lmc/src/gui/contacts/userinfowindow.ui \
    lmc/src/gui/contacts/userselectdialog.ui \
    lmc/src/gui/files/transferwindow.ui \
    lmc/src/gui/history/historywindow.ui \
    lmc/src/gui/main/aboutdialog.ui \
    lmc/src/gui/main/helpwindow.ui \
    lmc/src/gui/main/mainwindow.ui \
    lmc/src/gui/main/settingsdialog.ui \
    lmc/src/gui/main/updatewindow.ui

RESOURCES += \
    lmc/src/resource.qrc
