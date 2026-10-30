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


#ifndef DEFINITIONS_H
#define DEFINITIONS_H

//	Information about the application
#define IDA_TITLE "LAN Messenger"
#ifdef Q_OS_WIN
#define IDA_PRODUCT "LAN Messenger"
#define IDA_COMPANY "LAN Messenger"
#else
#define IDA_PRODUCT "lmc"
#define IDA_COMPANY "lmc"
#endif
//	Injected by CMake (-DLMC_VERSION); defaults to 1.3.0.
#ifndef IDA_VERSION
#define IDA_VERSION "1.3.0"
#endif
#define IDA_DESCRIPTION "LAN Messenger is a free peer-to-peer messaging application for intra-network communication " \
                        "and does not require a server.\n"                                                            \
                        "Version 1.3.0 (based on v1.2.39) adds OpenSSL 3.0 <-> 1.0 Legacy Compatibility and Remote Desktop Control."
#define IDA_COPYRIGHT "Copyright (C) 2010-2016 Qualia Digital Solutions."
#define IDA_CONTACT "lanmsngr@gmail.com"
#define IDA_DOMAIN "https://github.com/yjhone1/lan-messenger"
#define IDA_UPDATE_URL "https://api.github.com/repos/yjhone1/lan-messenger/releases/latest"

#if defined Q_OS_WIN
#define IDA_PLATFORM "Windows"
#elif defined Q_OS_MAC
#define IDA_PLATFORM "Macintosh"
#elif defined Q_OS_LINUX
#define IDA_PLATFORM "Linux"
#endif

#define DELIMITER "||"
#define DELIMITER_ESC "\\|\\|"
#define APP_MARKER "lmcmessage"

/****************************************************************************
**	Protocol Compatibility Mode definitions (Legacy v1.0 vs Strict v3.0)
****************************************************************************/
enum ProtocolHeaderMode {
  PHM_Legacy_v1_0 = 0,
  PHM_Strict_v3_0 = 1
};

const QString ProtocolHeaderModeNames[] = {
  "Legacy v1.0",
  "Strict v3.0"
};

/****************************************************************************
**	Datagram type definitions
**	The enum and the string array should always be synced
****************************************************************************/
enum DatagramType {
  DT_None = 0,
  DT_Broadcast,
  DT_PublicKey,
  DT_Handshake,
  DT_Message,
  DT_Max
};

// Legacy v1.0 6-byte wire headers (OpenSSL 1.0 compatible)
const QString DatagramTypeNames[] = {
  "",
  "BRDCST",
  "PUBKEY",
  "HNDSHK",
  "MESSAG"};

// Strict v3.0 6-byte wire headers (OpenSSL 3.0 explicit framing)
const QString DatagramTypeNamesV3[] = {
  "",
  "BRDv30",
  "PUBKv3",
  "HNDv30",
  "MSGv30"};

/****************************************************************************
**	Message type definitions
**	The enum and the string array should always be synced
****************************************************************************/
enum MessageType {
  MT_Blank = 0,
  MT_Announce,
  MT_Depart,
  MT_UserData,
  MT_Broadcast,
  MT_Status,
  MT_Avatar,
  MT_UserName,
  MT_Ping,
  MT_Message,
  MT_GroupMessage,
  MT_PublicMessage,
  MT_File,
  MT_Acknowledge,
  MT_Failed,
  MT_Error,
  MT_OldVersion,
  MT_Query,
  MT_Info,
  MT_ChatState,
  MT_Note,
  MT_Folder,
  MT_RemoteRequest,
  MT_RemoteAccept,
  MT_RemoteReject,
  MT_RemoteClose,
  //	These are used only for local communication between layers
  MT_Group,
  MT_Version,
  MT_WebFailed,
  MT_Refresh,
  MT_Join,
  MT_Leave,
  MT_Max
};

const QString MessageTypeNames[] = {
  "",
  "announce",
  "depart",
  "userdata",
  "broadcast",
  "status",
  "avatar",
  "name",
  "ping",
  "message",
  "groupmessage",
  "publicmessage",
  "file",
  "acknowledge",
  "failed",
  "error",
  "oldversion",
  "query",
  "info",
  "chatstate",
  "note",
  "folder",
  "remoterequest",
  "remoteaccept",
  "remotereject",
  "remoteclose",
  //	These are used only for local communication between layers
  "group",
  "version",
  "webfailed",
  "refresh",
  "join",
  "leave"};

enum FileMode {
  FM_Blank = 0,
  FM_Send,
  FM_Receive,
  FM_Max
};

const QString FileModeNames[] = {
  "",
  "send",
  "receive"};

/****************************************************************************
**	File operation definitions
**	The enum and the string array should always be synced
****************************************************************************/
enum FileOp {
  FO_Blank = 0,
  FO_Init, // Id assigned, but request not yet sent. Used for files that are part of a folder transfer
  FO_Request,
  FO_Accept,
  FO_Decline,
  FO_Cancel,
  FO_Progress,
  FO_Error,
  FO_Abort,
  FO_Complete,
  FO_Next,
  FO_Max
};

const QString FileOpNames[] = {
  "",
  "init",
  "request",
  "accept",
  "decline",
  "cancel",
  "progress",
  "error",
  "abort",
  "complete",
  "next"};

/****************************************************************************
**	File operation definitions
**	The enum and the string array should always be synced
****************************************************************************/
enum FileType {
  FT_None = 0,
  FT_Normal,
  FT_Avatar,
  FT_Folder,
  FT_Max
};

const QString FileTypeNames[] = {
  "",
  "normal",
  "avatar",
  "folder"};

/****************************************************************************
**	Query operation definitions
**	The enum and the string array should always be synced
****************************************************************************/
enum QueryOp {
  QO_None = 0,
  QO_Get,
  QO_Result,
  QO_Max
};

const QString QueryOpNames[] = {
  "",
  "get",
  "result"};

/****************************************************************************
**	Group Message operation definitions
**	The enum and the string array should always be synced
****************************************************************************/
enum GroupMsgOp {
  GMO_None = 0,
  GMO_Request,
  GMO_Join,
  GMO_Message,
  GMO_Leave,
  GMO_Max
};

const QString GroupMsgOpNames[] = {
  "",
  "request",
  "join",
  "message",
  "leave"};

enum GroupOp {
  GO_None = 0,
  GO_New,
  GO_Rename,
  GO_Move,
  GO_Delete,
  GO_Max
};

enum TrayMessageType {
  TM_Connection,
  TM_Status,
  TM_Transfer,
  TM_Minimize,
  TM_Max
};
enum TrayMessageIcon {
  TMI_Info,
  TMI_Warning,
  TMI_Error,
  TMI_Max
};

//	User status definitions
enum StatusType {
  StatusTypeOnline = 0,
  StatusTypeBusy,
  StatusTypeOffline,
  StatusTypeAway,
  StatusTypeMax
};

#define ST_COUNT 6
const QString statusCode[] = {
  "chat",
  "busy",
  "dnd",
  "brb",
  "away",
  "gone"};
const int statusType[] = {
  StatusTypeOnline,
  StatusTypeBusy,
  StatusTypeBusy,
  StatusTypeAway,
  StatusTypeAway,
  StatusTypeOffline};

enum UserCap {
  UC_None = 0x00000000,
  UC_File = 0x00000001,
  UC_GroupMessage = 0x00000002,
  UC_Folder = 0x00000004,
  UC_Max = 0xFFFFFFFF
};

#define GRP_DEFAULT "General"
#define GRP_DEFAULT_ID "1CD75C10048C4E65F6082539A32DC111"

#define AUTO_CONNECTION "Auto"

#define LMC_TRUE "true"
#define LMC_FALSE "false"

#define PROGRESS_TIMEOUT 1500

#endif // DEFINITIONS_H
