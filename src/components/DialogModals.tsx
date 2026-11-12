import React, { useState, useEffect, useRef } from 'react';
import {
  APP_VERSION,
  AppUiTheme,
  AUTHORIZED_ADMIN_IP,
  ChatMessage,
  FileTransferItem,
  Group,
  HistoryRecord,
  LmcSettings,
  ProtocolHeaderMode,
  STATUS_LIST,
  ThemeName,
  User,
  VERSION_CONFIG,
  WireFrameLog,
  AiAgentKey,
  AiAgentProcessInfo,
  REPRESENTATIVE_AI_AGENTS,
  UserAiAgentBlockMap,
  DEFAULT_AI_AGENT_BLOCKS,
} from '../types/lmc';
import {
  CryptoUnitTestResult,
  FIXTURE_RSA1024_PUB_PKCS1,
  FIXTURE_RSA2048_PUB_PKCS1,
  FIXTURE_RSA2048_PUB_SPKI,
  runTstCryptoSuite,
} from '../services/cryptoEngine';
import { ThemedMessageLog } from './ChatWindow';
import {
  getAppThemeConfig,
  getLabels,
  normalizeAppTheme,
  normalizeLanguage,
  saveAppThemeToStorage,
  SupportedLanguage,
} from '../utils/i18n';
import {
  canConfigureUserCapturePolicy,
  isUserFeatureEnabled,
  UtilityFeatureKey,
  UTILITY_ADMIN_PASSWORD,
  UTILITY_FEATURES_LIST,
  validateUtilityPassword,
  REMOTE_DESKTOP_PASSWORD,
  validateRemoteDesktopPassword,
  isAiAgentProcessAllowed,
  validateAiAgentProcess,
} from '../utils/securityPolicy';

// Shared Classic / Dark / High-Contrast Window Frame wrapper
const WindowFrame: React.FC<{
  title: string;
  icon: string;
  onClose: () => void;
  widthClass?: string;
  appTheme?: AppUiTheme;
  children: React.ReactNode;
}> = ({ title, icon, onClose, widthClass = 'max-w-2xl w-full', appTheme, children }) => {
  const domTheme =
    typeof document !== 'undefined'
      ? (document.documentElement.getAttribute('data-app-theme') as AppUiTheme | null)
      : null;
  const themeCfg = getAppThemeConfig(appTheme || domTheme || 'classic');

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-3">
      <div
        style={{
          backgroundColor: themeCfg.windowBg,
          borderColor: themeCfg.borderOuter,
          borderStyle: themeCfg.borderStyle,
          borderWidth: themeCfg.id === 'high-contrast' ? '3px' : '2px',
          color: themeCfg.textPrimary,
        }}
        className={`${widthClass} lmc-window-surface rounded-t-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh] transition-colors duration-150`}
      >
        <div
          style={{
            background: themeCfg.titlebarBg,
            color: themeCfg.titlebarText,
            borderBottom:
              themeCfg.id === 'high-contrast'
                ? '2px solid #ffff00'
                : themeCfg.id === 'dark'
                ? '1px solid #38bdf8'
                : 'none',
          }}
          className="h-7 px-2.5 flex items-center justify-between select-none shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <img src={icon} alt="" className="w-4 h-4" />
            <span className="font-bold text-xs">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded-xs bg-[#e04343] hover:bg-[#f05454] border border-white/40 text-white font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col">{children}</div>
      </div>
    </div>
  );
};

// 1. Broadcast Window (lmcBroadcastWindow)
export const BroadcastWindowModal: React.FC<{
  users: User[];
  groups: Group[];
  protocolMode: ProtocolHeaderMode;
  language?: string;
  onSendBroadcast: (recipientIds: string[], text: string) => void;
  onClose: () => void;
}> = ({ users, groups, protocolMode, language = 'en_US', onSendBroadcast, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(users.map((u) => u.id));
  const [messageText, setMessageText] = useState('');
  const i18n = getLabels(language);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => setSelectedIds(users.map((u) => u.id));
  const handleSelectNone = () => setSelectedIds([]);

  const handleSend = () => {
    if (!messageText.trim() || selectedIds.length === 0) return;
    onSendBroadcast(selectedIds, messageText.trim());
    onClose();
  };

  return (
    <WindowFrame
      title={i18n.modals.broadcast.title}
      icon="/resources/images/broadcastmsg.png"
      onClose={onClose}
      widthClass="max-w-xl w-full"
    >
      <div className="p-3 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {/* Message editor */}
          <div className="sm:col-span-3 flex flex-col">
            <label className="text-xs font-semibold text-slate-800 mb-1">
              {i18n.modals.broadcast.messageLabel} ({protocolMode === 'Legacy v1.0' ? 'BRDCST' : 'BRDv30'}):
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={i18n.modals.broadcast.placeholder}
              className="flex-1 min-h-[160px] bg-white border border-[#7f9db9] p-2 text-xs focus:outline-none focus:border-[#0054e3] resize-none"
            />
          </div>

          {/* Recipient Tree */}
          <div className="sm:col-span-2 flex flex-col">
            <label className="text-xs font-semibold text-slate-800 mb-1">
              {i18n.modals.broadcast.selectRecipientsLabel} ({selectedIds.length}/{users.length}):
            </label>
            <div className="flex-1 min-h-[160px] max-h-48 overflow-y-auto bg-white border border-[#7f9db9] p-1.5 space-y-1.5">
              {groups.map((grp) => {
                const groupUsers = users.filter((u) => u.group === grp.id);
                if (groupUsers.length === 0) return null;
                return (
                  <div key={grp.id}>
                    <div className="text-[11px] font-bold text-slate-700 bg-gray-100 px-1 py-0.5">
                      ▾ {i18n.groups[grp.id] || grp.name}
                    </div>
                    <div className="pl-2 pt-1 space-y-1">
                      {groupUsers.map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(u.id)}
                            onChange={() => toggleUser(u.id)}
                          />
                          <img
                            src={
                              STATUS_LIST.find((s) => s.code === u.status)?.icon ||
                              '/resources/images/online.png'
                            }
                            alt=""
                            className="w-3.5 h-3.5"
                          />
                          <span className="truncate">{u.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-[11px] cursor-pointer"
              >
                {i18n.modals.broadcast.selectAll}
              </button>
              <button
                type="button"
                onClick={handleSelectNone}
                className="px-2 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-[11px] cursor-pointer"
              >
                {i18n.modals.broadcast.selectNone}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#aca899]">
          <button
            type="button"
            disabled={!messageText.trim() || selectedIds.length === 0}
            onClick={handleSend}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] disabled:opacity-40 border border-[#0054e3] font-semibold text-xs cursor-pointer"
          >
            {i18n.modals.broadcast.send}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
          >
            {i18n.modals.broadcast.cancel}
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 2. Public Chat / Group Chat Room Window (lmcChatRoomWindow)
export const ChatRoomWindowModal: React.FC<{
  localUser: User;
  users: User[];
  messages: ChatMessage[];
  settings: LmcSettings;
  onSendPublicMessage: (text: string) => void;
  onOpenUserInfo: (user: User) => void;
  onClose: () => void;
}> = ({ localUser, users, messages, settings, onSendPublicMessage, onOpenUserInfo, onClose }) => {
  const [text, setText] = useState('');
  const i18n = getLabels(settings.language);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendPublicMessage(trimmed);
    setText('');
  };

  return (
    <WindowFrame
      title={i18n.modals.publicChat.title}
      icon="/resources/images/chatroom.png"
      onClose={onClose}
      widthClass="max-w-3xl w-full"
    >
      <div className="flex flex-col h-[460px]">
        <div className="flex-1 flex min-h-0">
          {/* Left: Message Log */}
          <div className="flex-1 flex flex-col border-r border-[#aca899] min-w-0">
            <ThemedMessageLog
              messages={messages}
              localUser={localUser}
              peer={localUser}
              settings={settings}
            />
          </div>

          {/* Right: Participants List */}
          <div className="w-52 bg-white flex flex-col shrink-0">
            <div className="px-2 py-1.5 bg-[#f5f4ee] border-b border-[#d4d0c8] font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>
                {i18n.modals.publicChat.participantsLabel} ({users.length + 1})
              </span>
              <img src="/resources/images/addcontact.png" alt="" className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {[localUser, ...users].map((u) => {
                const st = STATUS_LIST.find((s) => s.code === u.status) || STATUS_LIST[0];
                return (
                  <div
                    key={u.id}
                    onClick={() => onOpenUserInfo(u)}
                    className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-blue-50 cursor-pointer text-xs"
                  >
                    <img src={st.icon} alt="" className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium truncate">
                      {u.name} {u.id === localUser.id ? i18n.modals.publicChat.youSuffix : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-2 bg-[#ece9d8] border-t border-[#aca899] flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={i18n.modals.publicChat.inputPlaceholder}
            className="flex-1 bg-white border border-[#7f9db9] px-2 py-1.5 text-xs focus:outline-none focus:border-[#0054e3]"
          />
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-1.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold text-xs cursor-pointer"
          >
            {i18n.modals.publicChat.send}
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 3. File Transfers Window (lmcTransferWindow)
export const TransferWindowModal: React.FC<{
  transfers: FileTransferItem[];
  language?: string;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
  onClearCompleted: () => void;
  onClose: () => void;
}> = ({ transfers, language = 'en_US', onAccept, onDecline, onCancel, onClearCompleted, onClose }) => {
  const i18n = getLabels(language);
  return (
    <WindowFrame
      title={i18n.modals.transfers.title}
      icon="/resources/images/transfer.png"
      onClose={onClose}
      widthClass="max-w-xl w-full"
    >
      <div className="flex flex-col h-[380px]">
        <div className="px-2.5 py-1.5 bg-[#f5f4ee] border-b border-[#aca899] flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            {i18n.modals.transfers.headerCount} ({transfers.length})
          </span>
          <button
            type="button"
            onClick={onClearCompleted}
            className="px-2.5 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
          >
            {i18n.modals.transfers.clearList}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white divide-y divide-gray-200">
          {transfers.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
              {i18n.modals.transfers.emptyText}
            </div>
          ) : (
            transfers.map((tr) => {
              const pct =
                tr.fileSize > 0
                  ? Math.min(100, Math.round((tr.transferredBytes / tr.fileSize) * 100))
                  : 0;
              const sizeKb = (tr.fileSize / 1024).toFixed(1);
              const doneKb = (tr.transferredBytes / 1024).toFixed(1);

              return (
                <div key={tr.id} className="p-2.5 hover:bg-blue-50/40 flex items-center gap-3">
                  <img
                    src={
                      tr.isFolder
                        ? '/resources/images/sendfolder.png'
                        : '/resources/images/file.png'
                    }
                    alt=""
                    className="w-7 h-7 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {tr.fileName}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {tr.mode === 'send'
                          ? `${i18n.modals.transfers.toPrefix} ${tr.peerName}`
                          : `${i18n.modals.transfers.fromPrefix} ${tr.peerName}`}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-gray-200 border border-gray-400 rounded-xs overflow-hidden my-1">
                      <div
                        className={`h-full transition-all ${
                          tr.status === 'complete'
                            ? 'bg-emerald-600'
                            : tr.status === 'declined' || tr.status === 'cancelled'
                            ? 'bg-red-500'
                            : 'bg-[#0054e3]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-600">
                      <span>
                        {doneKb} KB / {sizeKb} KB ({pct}%)
                      </span>
                      <span className="font-semibold capitalize">
                        {tr.status === 'transferring'
                          ? `${(tr.speedBps / 1024).toFixed(0)} KB/s`
                          : tr.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {tr.status === 'request' && tr.mode === 'receive' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onAccept(tr.id)}
                          title={i18n.chatWindow.accept}
                          className="p-1 bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 rounded cursor-pointer"
                        >
                          <img src="/resources/images/accept.png" alt="Accept" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDecline(tr.id)}
                          title={i18n.chatWindow.decline}
                          className="p-1 bg-red-100 hover:bg-red-200 border border-red-400 rounded cursor-pointer"
                        >
                          <img src="/resources/images/stop.png" alt="Decline" className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {(tr.status === 'request' || tr.status === 'transferring') && (
                      <button
                        type="button"
                        onClick={() => onCancel(tr.id)}
                        title={i18n.chatWindow.cancel}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-400 text-[11px] rounded cursor-pointer"
                      >
                        {i18n.chatWindow.cancel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-2 bg-[#ece9d8] border-t border-[#aca899] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
          >
            {i18n.modals.transfers.close}
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 4. Message History Window (lmcHistoryWindow)
export const HistoryWindowModal: React.FC<{
  history: HistoryRecord[];
  localUser: User;
  settings: LmcSettings;
  onClearHistory: () => void;
  onClose: () => void;
}> = ({ history, localUser, settings, onClearHistory, onClose }) => {
  const [selectedId, setSelectedId] = useState<string>(history[0]?.id || '');
  const [searchFilter, setSearchFilter] = useState('');
  const i18n = getLabels(settings.language);

  const filtered = history.filter(
    (h) =>
      h.peerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.messages.some((m) => m.text.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const selectedRecord = filtered.find((h) => h.id === selectedId) || filtered[0];

  return (
    <WindowFrame
      title={i18n.modals.history.title}
      icon="/resources/images/history.png"
      onClose={onClose}
      widthClass="max-w-3xl w-full"
    >
      <div className="flex flex-col h-[440px]">
        <div className="p-2 bg-[#f5f4ee] border-b border-[#aca899] flex items-center justify-between gap-2">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={i18n.modals.history.searchPlaceholder}
            className="w-64 bg-white border border-[#7f9db9] px-2 py-1 text-xs focus:outline-none focus:border-[#0054e3]"
          />
          <button
            type="button"
            onClick={onClearHistory}
            className="px-3 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
          >
            {i18n.modals.history.clearHistory}
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left Tree: Conversation list */}
          <div className="w-60 bg-white border-r border-[#aca899] overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="p-4 text-xs text-gray-400 italic text-center">
                {i18n.modals.history.emptyText}
              </div>
            ) : (
              filtered.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedId(rec.id)}
                  className={`px-2.5 py-2 cursor-pointer text-xs ${
                    selectedRecord?.id === rec.id
                      ? 'bg-[#0054e3] text-white'
                      : 'hover:bg-blue-50 text-slate-800'
                  }`}
                >
                  <div className="font-bold truncate">{rec.peerName}</div>
                  <div
                    className={`text-[10px] ${
                      selectedRecord?.id === rec.id ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(rec.timestamp).toLocaleString()} ({rec.messages.length} msgs)
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Pane: Message Viewer */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            {selectedRecord ? (
              <ThemedMessageLog
                messages={selectedRecord.messages}
                localUser={localUser}
                peer={localUser}
                settings={settings}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic">
                {i18n.modals.history.selectPrompt}
              </div>
            )}
          </div>
        </div>

        <div className="p-2 bg-[#ece9d8] border-t border-[#aca899] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
          >
            {i18n.modals.history.close}
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 5. User Info Window (lmcUserInfoWindow)
export const UserInfoWindowModal: React.FC<{
  user: User;
  currentIp?: string;
  isSelf?: boolean;
  language?: string;
  onToggleUserCapturePolicy?: (targetUser: User, nextState: boolean) => void;
  onToggleUtilityFeature?: (targetUser: User, featureKey: UtilityFeatureKey, nextState: boolean) => void;
  onSetAllUtilityFeatures?: (targetUser: User, nextState: boolean) => void;
  onToggleAiAgentProcess?: (targetUser: User, agentKey: AiAgentKey, nextState: boolean) => void;
  onSetAllAiAgentProcesses?: (targetUser: User, nextState: boolean) => void;
  onStartRemoteDesktop?: (targetUser: User) => void;
  onClose: () => void;
}> = ({
  user,
  currentIp = '192.168.1.42',
  isSelf = false,
  language = 'en_US',
  onToggleUserCapturePolicy,
  onToggleUtilityFeature,
  onSetAllUtilityFeatures,
  onToggleAiAgentProcess,
  onSetAllAiAgentProcesses,
  onStartRemoteDesktop,
  onClose,
}) => {
  const isCurrentUser = isSelf || (currentIp && user.address === currentIp);
  const [tab, setTab] = useState<'general' | 'system' | 'utility'>('general');
  const [utilityUnlocked, setUtilityUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Remote desktop password state for System tab
  const [remotePasswordInput, setRemotePasswordInput] = useState('');
  const [remotePasswordError, setRemotePasswordError] = useState('');
  const [remoteUnlocked, setRemoteUnlocked] = useState(user.remoteDesktopUnlocked || false);

  const st = STATUS_LIST.find((s) => s.code === user.status) || STATUS_LIST[0];
  const i18n = getLabels(language);

  const handleUnlockUtility = () => {
    if (validateUtilityPassword(passwordInput)) {
      setUtilityUnlocked(true);
      setPasswordError('');
    } else {
      setPasswordError('비밀번호가 올바르지 않습니다. (비밀번호: 192.168.10.212)');
    }
  };

  const handleVerifyRemotePassword = () => {
    if (validateRemoteDesktopPassword(remotePasswordInput)) {
      setRemoteUnlocked(true);
      setRemotePasswordError('');
      onStartRemoteDesktop?.(user);
    } else {
      setRemotePasswordError(`비밀번호가 올바르지 않습니다. (비밀번호: ${REMOTE_DESKTOP_PASSWORD})`);
    }
  };

  return (
    <WindowFrame
      title={`${user.name} - ${i18n.modals.userInfo.titleSuffix}${
        isCurrentUser ? ' (내 정보 / 로컬 단말)' : ''
      }`}
      icon="/resources/images/usersettings.png"
      onClose={onClose}
      widthClass="max-w-2xl w-full"
    >
      <div className="p-3">
        {/* Tabs */}
        <div className="flex border-b border-[#aca899] mb-3">
          <button
            type="button"
            onClick={() => setTab('general')}
            className={`px-3 py-1 text-xs font-semibold border-t border-x rounded-t mr-1 cursor-pointer ${
              tab === 'general'
                ? 'bg-white border-[#aca899] text-slate-900'
                : 'bg-[#e1dfd2] border-transparent text-gray-600'
            }`}
          >
            {i18n.modals.userInfo.tabGeneral}
          </button>
          <button
            type="button"
            data-testid="tab-userinfo-system"
            onClick={() => setTab('system')}
            className={`px-3 py-1 text-xs font-semibold border-t border-x rounded-t mr-1 cursor-pointer ${
              tab === 'system'
                ? 'bg-white border-[#aca899] text-slate-900'
                : 'bg-[#e1dfd2] border-transparent text-gray-600'
            }`}
          >
            {i18n.modals.userInfo.tabSystem}
          </button>
          <button
            type="button"
            data-testid="tab-userinfo-utility"
            onClick={() => setTab('utility')}
            className={`px-3 py-1 text-xs font-semibold border-t border-x rounded-t cursor-pointer flex items-center gap-1.5 ${
              tab === 'utility'
                ? 'bg-white border-[#aca899] text-blue-900 font-bold'
                : 'bg-[#e1dfd2] border-transparent text-gray-600'
            }`}
          >
            <span>🤖</span>
            <span>AI Agent 차단 (유틸리티)</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-mono">
              비번: 192.168.10.212
            </span>
          </button>
        </div>

        {tab === 'general' ? (
          <div className="bg-white border border-[#aca899] p-3 space-y-3 text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <img
                src={user.avatarPath}
                alt={user.name}
                className="w-14 h-14 rounded border border-gray-400 object-cover"
              />
              <div>
                <div className="font-bold text-sm text-slate-900">{user.name}</div>
                <div className="flex items-center gap-1.5 text-gray-600 mt-0.5">
                  <img src={st.icon} alt="" className="w-3.5 h-3.5" />
                  <span>{i18n.status[user.status] || st.label}</span>
                </div>
                {user.note && <div className="text-gray-500 italic mt-0.5">"{user.note}"</div>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pb-2.5 border-b border-gray-200">
              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.firstName}</span>
              <span className="col-span-2">{user.firstName || 'N/A'}</span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.lastName}</span>
              <span className="col-span-2">{user.lastName || 'N/A'}</span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.about}</span>
              <span className="col-span-2">{user.about || 'No description provided.'}</span>
            </div>

            {/* Hardware & OS Summary directly visible in General tab */}
            <div className="space-y-1.5 pt-0.5" data-testid="user-info-hardware-summary">
              <div className="font-bold text-blue-900 text-[11px] uppercase tracking-wide">
                {i18n.modals.userInfo.hardwareSectionTitle}
              </div>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-50 border border-gray-200 rounded p-2">
                <span className="font-semibold text-gray-600">{i18n.modals.userInfo.osDetail}</span>
                <span className="col-span-2 font-medium text-slate-900" data-testid="userinfo-os-detail">
                  {user.osVersionDetail || user.osName}
                </span>

                <span className="font-semibold text-gray-600">{i18n.modals.userInfo.cpu}</span>
                <span className="col-span-2 text-slate-800" data-testid="userinfo-cpu">
                  {user.cpuInfo}
                </span>

                <span className="font-semibold text-gray-600">{i18n.modals.userInfo.memory}</span>
                <span className="col-span-2 text-slate-800" data-testid="userinfo-memory">
                  {user.memoryInfo}
                </span>

                <span className="font-semibold text-gray-600">{i18n.modals.userInfo.gpu}</span>
                <span className="col-span-2 text-slate-800" data-testid="userinfo-gpu">
                  {user.gpuInfo}
                </span>

                <span className="font-semibold text-gray-600">{i18n.modals.userInfo.macAddress}</span>
                <span className="col-span-2 font-mono font-semibold text-emerald-800" data-testid="userinfo-mac">
                  {user.macAddress}
                </span>

                <span className="font-semibold text-gray-600">{i18n.modals.userInfo.ipAddress}</span>
                <span className="col-span-2 font-mono">{user.address} ({user.hostName})</span>

                <span className="font-semibold text-gray-600">{i18n.modals.userInfo.version}</span>
                <span className="col-span-2 font-semibold text-blue-900" data-testid="userinfo-version">
                  {user.version || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ) : tab === 'system' ? (
          <div className="bg-white border border-[#aca899] p-3 space-y-2.5 text-xs">
            <div className="grid grid-cols-3 gap-1.5">
              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.ipAddress}</span>
              <span className="col-span-2 font-mono">{user.address}</span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.macAddress}</span>
              <span className="col-span-2 font-mono font-semibold text-emerald-800">
                {user.macAddress}
              </span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.hostName}</span>
              <span className="col-span-2 font-mono">{user.hostName}</span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.logonName}</span>
              <span className="col-span-2 font-mono">{user.logonName}</span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.osDetail}</span>
              <span className="col-span-2 font-medium text-slate-900">
                {user.osVersionDetail || user.osName}
              </span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.cpu}</span>
              <span className="col-span-2">{user.cpuInfo}</span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.memory}</span>
              <span className="col-span-2">{user.memoryInfo}</span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.gpu}</span>
              <span className="col-span-2">{user.gpuInfo}</span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.version}</span>
              <span className="col-span-2 font-semibold text-blue-900" data-testid="userinfo-system-version">
                {user.version || 'N/A'}
              </span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.cryptoStack}</span>
              <span className="col-span-2 font-semibold text-blue-800">{user.opensslVersion}</span>

              <span className="font-semibold text-gray-600">{i18n.modals.userInfo.rsaKeySize}</span>
              <span className="col-span-2">
                {user.rsaBits}-bit ({user.rsaBits === 1024 ? '128B OAEP Envelope' : '256B OAEP Envelope'})
              </span>
            </div>

            <div>
              <div className="font-semibold text-gray-600 mb-1">
                {i18n.modals.userInfo.publicKeyPem}
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-2 rounded text-[10px] font-mono overflow-x-auto max-h-24">
                {user.publicKeyPem}
              </pre>
            </div>

            {/* Remote Desktop Section (Bottom of System Tab) - Password 192.168.10.212 required regardless of IP */}
            <div className="pt-2.5 border-t border-gray-200" data-testid="user-info-remote-desktop-section">
              {isCurrentUser ? (
                <div className="bg-blue-50/80 border border-blue-200 rounded p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                      <span className="text-base">🖥️</span>
                      <span>원격 제어 (Remote Desktop) - 본인 로컬 단말</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                      ● 로컬 단말 (본인)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 leading-relaxed">
                    현재 열린 창은 <strong>본인의 로컬 단말 (내 컴퓨터)</strong> 정보입니다. 원격 제어는 다른 원격 대화상대(피어)에게 연결을 요청할 수 있으며, 본인 PC에 대해서는 원격 제어를 시도하지 않습니다.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-300 rounded p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <span className="text-base">🖥️</span>
                      <span>원격 제어 (Remote Desktop) - {user.name}</span>
                    </div>
                    <span
                      data-testid="userinfo-remote-status-badge"
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        remoteUnlocked
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {remoteUnlocked ? '● 원격 제어 인증 완료' : '🔒 비밀번호 인증 필요'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    원격 제어 기능은 접속 단말의 IP 주소와 무관하게, 보안 비밀번호(<strong>{REMOTE_DESKTOP_PASSWORD}</strong>)를 입력해야 세션이 활성화되어 원격 제어가 가능합니다.
                  </div>

                  {!remoteUnlocked ? (
                    <div className="p-2.5 bg-white border border-slate-200 rounded space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          data-testid="input-remote-desktop-password"
                          value={remotePasswordInput}
                          onChange={(e) => {
                            setRemotePasswordInput(e.target.value);
                            setRemotePasswordError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleVerifyRemotePassword();
                            }
                          }}
                          placeholder="비밀번호 입력 (192.168.10.212)"
                          className="flex-1 bg-white border border-[#7f9db9] px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-[#0054e3]"
                        />
                        <button
                          type="button"
                          data-testid="btn-verify-remote-desktop-password"
                          onClick={handleVerifyRemotePassword}
                          className="px-3 py-1 bg-[#0054e3] hover:bg-blue-700 text-white font-bold text-xs rounded-xs cursor-pointer shadow-xs"
                        >
                          인증 및 원격제어 시작
                        </button>
                      </div>
                      {remotePasswordError && (
                        <div className="text-rose-600 text-[11px] font-semibold" data-testid="remote-password-error">
                          ⚠️ {remotePasswordError}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                        <span>대상 사용자: {user.name} ({user.address})</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRemotePasswordInput(REMOTE_DESKTOP_PASSWORD);
                            setRemotePasswordError('');
                          }}
                          className="text-blue-600 hover:underline cursor-pointer"
                        >
                          [비밀번호 자동 입력]
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded">
                      <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>원격 제어 권한 승인됨 (비밀번호: {REMOTE_DESKTOP_PASSWORD} 인증 완료)</span>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-start-remote-desktop-system-tab"
                        onClick={() => {
                          onStartRemoteDesktop?.(user);
                          onClose();
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer shadow-xs"
                      >
                        🖥️ 원격 제어 화면 열기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab: Utility - 10 Representative AI Agent Local Process Blocker (Password: 192.168.10.212) */
          <div className="space-y-3" data-testid="userinfo-utility-tab">
            {!utilityUnlocked ? (
              <div
                className="bg-white border border-[#aca899] p-4 text-xs space-y-3.5"
                data-testid="userinfo-utility-locked"
              >
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 rounded">
                  <div className="text-3xl shrink-0 mt-0.5">🤖</div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 text-sm">
                      {isCurrentUser
                        ? '내 PC AI Agent 로컬 프로세스 차단 관리 - 보안 인증'
                        : `AI Agent 로컬 프로세스 차단 관리 (${user.name}) - 보안 인증`}
                    </div>
                    <div className="text-[11px] text-slate-700 leading-relaxed">
                      {isCurrentUser
                        ? 'LLM 클라우드 질의 API는 정상 사용 가능하지만, 내 컴퓨터(로컬 엔드포인트)에서 백그라운드 데몬 및 프로세스로 구동되어 쉘 명령/파일을 임의 조작하는 자율 AI Agent의 구동 및 설치를 프로세스단에서 차단(OFF)/허용(ON)하기 위해 관리자 비밀번호를 입력해야 합니다.'
                        : 'LLM 클라우드 질의 API는 정상 사용 가능하지만, 로컬 엔드포인트에서 데몬이나 백그라운드 프로세스로 구동되어 쉘 명령/파일을 임의 조작하는 자율 AI Agent의 구동 및 설치를 프로세스단에서 차단(OFF)/허용(ON)하기 위해 관리자 비밀번호를 입력해야 합니다.'}
                    </div>
                    <div className="text-[11px] font-mono font-bold text-blue-800 pt-0.5">
                      ※ 관리자 비밀번호: <span className="underline">{UTILITY_ADMIN_PASSWORD}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <label className="block font-semibold text-slate-700">
                    관리자 비밀번호 입력 (비번: 192.168.10.212)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      data-testid="utility-password-input"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUnlockUtility();
                        }
                      }}
                      placeholder="비밀번호 입력 (192.168.10.212)"
                      className="flex-1 bg-white border border-[#7f9db9] px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0054e3]"
                    />
                    <button
                      type="button"
                      data-testid="btn-unlock-utility"
                      onClick={handleUnlockUtility}
                      className="px-4 py-1.5 bg-[#0054e3] hover:bg-blue-700 text-white font-bold text-xs rounded-xs cursor-pointer shadow-xs"
                    >
                      인증 및 잠금해제
                    </button>
                  </div>
                  {passwordError && (
                    <div
                      className="text-rose-600 text-[11px] font-semibold"
                      data-testid="utility-password-error"
                    >
                      ⚠️ {passwordError}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                  <span>
                    대상: <strong className="text-slate-800">{isCurrentUser ? `본인 컴퓨터 (${user.name})` : user.name}</strong> ({user.address})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordInput(UTILITY_ADMIN_PASSWORD);
                      setUtilityUnlocked(true);
                      setPasswordError('');
                    }}
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    [비밀번호 자동 입력 및 잠금해제]
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="bg-white border border-[#aca899] p-3 text-xs space-y-3"
                data-testid="userinfo-utility-unlocked"
              >
                {/* Header with admin badge and quick bulk actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-800">
                      {isCurrentUser
                        ? `내 PC AI Agent 로컬 프로세스 차단 설정 (본인 단말)`
                        : `AI Agent 로컬 프로세스 차단 설정 (${user.name})`}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                      인증됨 (비번: {UTILITY_ADMIN_PASSWORD})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="btn-utility-block-all"
                      onClick={() => onSetAllAiAgentProcesses?.(user, false)}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer"
                      title="11종 AI Agent의 로컬 프로세스 구동을 모두 차단(OFF)합니다."
                    >
                      ✕ 전체 프로세스 차단
                    </button>
                    <button
                      type="button"
                      data-testid="btn-utility-allow-all"
                      onClick={() => onSetAllAiAgentProcesses?.(user, true)}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                      title="11종 AI Agent의 로컬 프로세스 구동을 모두 허용(ON)합니다."
                    >
                      ✓ 전체 프로세스 허용
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUtilityUnlocked(false);
                        setPasswordInput('');
                      }}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-slate-700 rounded text-[11px] font-semibold cursor-pointer border border-gray-300"
                      title="설정을 다시 잠급니다."
                    >
                      🔒 잠금
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 leading-relaxed bg-blue-50/60 border border-blue-200 rounded p-2">
                  💡 <strong>엔드포인트 보안 정책</strong>: 일반 LLM 텍스트 질의(OpenAI/Claude API)는 정상 사용 가능하나, 단말 로컬에서 자율 구동되는 백그라운드 데몬 및 프로세스는 관리 리스크가 크므로 <strong>프로세스단에서 차단(OFF)</strong>을 권장합니다.
                </div>

                {/* 10 Representative AI Agents List */}
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {REPRESENTATIVE_AI_AGENTS.map((agent, idx) => {
                    const isAllowed = user.aiAgentBlocks?.[agent.key] === true;
                    return (
                      <div
                        key={agent.key}
                        data-testid={`utility-row-${agent.key}`}
                        className={`p-2.5 rounded border flex items-center justify-between gap-3 transition-colors ${
                          isAllowed
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-rose-50/40 border-rose-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="text-xl shrink-0 mt-0.5">{agent.icon}</span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {idx + 1}. {agent.name}
                              </span>
                              <span
                                data-testid={`utility-badge-${agent.key}`}
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  isAllowed
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                              >
                                {isAllowed ? '● 로컬 구동 허용 (ON)' : '■ 프로세스 차단 (OFF)'}
                              </span>
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                                  agent.riskLevel === 'High'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}
                              >
                                위험도: {agent.riskLevel}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-500 font-mono bg-slate-100 px-1 py-0.2 rounded border border-gray-200">
                                프로세스: {agent.processBinary}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                              {agent.description}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <button
                            type="button"
                            data-testid={`btn-toggle-agent-${agent.key}`}
                            onClick={() => {
                              const next = !isAllowed;
                              onToggleAiAgentProcess?.(user, agent.key, next);
                            }}
                            className={`px-3 py-1 rounded text-xs font-bold border cursor-pointer transition-colors shadow-xs ${
                              isAllowed
                                ? 'bg-[#e04343] hover:bg-[#c93030] text-white border-red-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-800'
                            }`}
                          >
                            {isAllowed ? '프로세스 차단(OFF)' : '로컬 구동 허용(ON)'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold text-xs cursor-pointer"
          >
            {i18n.modals.userInfo.ok}
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// Standalone Remote Desktop Password Authentication Modal (Invoked from Chat or Contact Menus)
export const RemoteDesktopAuthModal: React.FC<{
  targetUser: User;
  onSuccess: () => void;
  onClose: () => void;
}> = ({ targetUser, onSuccess, onClose }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (validateRemoteDesktopPassword(password)) {
      onSuccess();
    } else {
      setError(`비밀번호가 올바르지 않습니다. (비밀번호: ${REMOTE_DESKTOP_PASSWORD})`);
    }
  };

  return (
    <WindowFrame
      title="원격 제어 보안 인증 (Remote Desktop)"
      icon="/resources/images/remote_desktop.png"
      onClose={onClose}
      widthClass="max-w-md w-full"
    >
      <div className="p-3 text-xs space-y-3">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 rounded">
          <div className="text-3xl shrink-0">🖥️</div>
          <div className="space-y-1">
            <div className="font-bold text-slate-800 text-sm">
              원격 제어 세션 인증
            </div>
            <div className="text-[11px] text-slate-700 leading-relaxed">
              원격 제어는 접속 IP와 관계없이 보안 비밀번호(<strong>{REMOTE_DESKTOP_PASSWORD}</strong>)를 입력해야 원격 세션이 활성화되어 사용할 수 있습니다.
            </div>
            <div className="text-[11px] text-blue-900 font-semibold">
              대상 사용자: {targetUser.name} ({targetUser.address})
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
          <label className="block font-semibold text-slate-700">
            원격 제어 비밀번호 입력 (192.168.10.212)
          </label>
          <input
            type="password"
            data-testid="input-remote-auth-modal-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleVerify();
            }}
            placeholder="비밀번호 입력 (192.168.10.212)"
            className="w-full bg-white border border-[#7f9db9] px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0054e3]"
            autoFocus
          />
          {error && (
            <div className="text-rose-600 text-[11px] font-semibold" data-testid="remote-auth-modal-error">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => {
              setPassword(REMOTE_DESKTOP_PASSWORD);
              setError('');
            }}
            className="text-[11px] text-blue-600 hover:underline cursor-pointer"
          >
            [비밀번호 자동 입력]
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs font-semibold cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              data-testid="btn-remote-auth-modal-confirm"
              onClick={handleVerify}
              className="px-4 py-1 bg-[#0054e3] hover:bg-blue-700 text-white text-xs font-bold rounded-xs cursor-pointer shadow-xs"
            >
              원격 제어 연결
            </button>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
};

// 6. Remote Desktop Viewer Window (RemoteViewerWindow & RemoteCanvasWidget from remoteviewerwindow.cpp)
export const RemoteViewerWindowModal: React.FC<{
  peer: User;
  onClose: () => void;
}> = ({ peer, onClose }) => {
  const [enableControl, setEnableControl] = useState(true);
  const [fitToWindow, setFitToWindow] = useState(true);
  const [frameCount, setFrameCount] = useState(1);
  const [remoteCursor, setRemoteCursor] = useState({ x: 320, y: 180 });
  const [remoteLogs, setRemoteLogs] = useState<string[]>([
    `Connected to ${peer.address}:50000 (${peer.hostName})`,
    `Negotiated JPEG Frame Stream (1280x720)`,
  ]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameCount((f) => f + 1);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render simulated remote peer desktop (Ubuntu / Windows workstation)
    const w = canvas.width;
    const h = canvas.height;
    const isLinux = peer.osName.toLowerCase().includes('linux') || peer.osName.toLowerCase().includes('ubuntu');

    // Desktop wallpaper
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (isLinux) {
      grad.addColorStop(0, '#4f194b');
      grad.addColorStop(1, '#dd4814');
    } else {
      grad.addColorStop(0, '#004e98');
      grad.addColorStop(1, '#3a6ea5');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Top bar / Taskbar
    ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
    ctx.fillRect(0, 0, w, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      `${peer.hostName} (${peer.osName}) - ${peer.opensslVersion}`,
      12,
      17
    );

    // Simulated Terminal Window on remote peer
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(60, 55, 580, 280);
    ctx.fillStyle = '#333333';
    ctx.fillRect(60, 55, 580, 24);
    ctx.fillStyle = '#e5e5e5';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`terminal — ${peer.logonName}@${peer.hostName}: ~/lan-messenger`, 72, 71);

    ctx.fillStyle = '#4ade80';
    ctx.font = '12px monospace';
    ctx.fillText(`$ openssl version -a`, 76, 100);
    ctx.fillStyle = '#d4d4d8';
    ctx.fillText(peer.opensslVersion, 76, 120);
    ctx.fillText(`RSA Key Modulus: ${peer.rsaBits}-bit | TCP Port: 50000 | Multicast: 239.255.100.100`, 76, 142);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`[RemoteServer] Streaming desktop frames to peer... Frame #${frameCount}`, 76, 170);
    ctx.fillStyle = '#fde047';
    ctx.fillText(
      `[RemoteInput] Last Cursor: (${remoteCursor.x}, ${remoteCursor.y}) | Control: ${
        enableControl ? 'ENABLED' : 'VIEW-ONLY'
      }`,
      76,
      194
    );

    remoteLogs.slice(-4).forEach((line, idx) => {
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(`> ${line}`, 76, 224 + idx * 20);
    });

    // Remote cursor indicator
    ctx.beginPath();
    ctx.arc(remoteCursor.x, remoteCursor.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = enableControl ? 'rgba(56, 189, 248, 0.85)' : 'rgba(239, 68, 68, 0.7)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [frameCount, remoteCursor, enableControl, peer, remoteLogs]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enableControl || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * canvasRef.current.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * canvasRef.current.height);
    setRemoteCursor({ x, y });
  };

  const handleCanvasClick = () => {
    if (!enableControl) return;
    setRemoteLogs((prev) => [
      ...prev,
      `REMOTE_MOUSE_PRESS at (${remoteCursor.x}, ${remoteCursor.y})`,
    ]);
  };

  return (
    <WindowFrame
      title={`Remote Desktop - ${peer.name} (${peer.address})`}
      icon="/resources/images/networksettings.png"
      onClose={onClose}
      widthClass="max-w-3xl w-full"
    >
      <div className="flex flex-col h-[460px]">
        {/* Security & Authorization Banner */}
        <div className="px-3 py-1 bg-[#1e293b] text-white border-b border-[#334155] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-sky-400">원격 제어 세션 (정상 인가됨)</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">요청자 IP: <b className="text-emerald-400">192.168.10.212</b> (인가된 관리자)</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">원격 대상: <b className="text-white">{peer.name} ({peer.address})</b></span>
          </div>
          <span className="text-[11px] text-amber-300 font-medium">
            보안 정책: 192.168.10.212 전용
          </span>
        </div>

        {/* Toolbar matching RemoteViewerWindow::RemoteViewerWindow */}
        <div className="px-3 py-1.5 bg-[#f5f4ee] border-b border-[#aca899] flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={enableControl}
                onChange={(e) => setEnableControl(e.target.checked)}
              />
              <span>Enable Control</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={fitToWindow}
                onChange={(e) => setFitToWindow(e.target.checked)}
              />
              <span>Fit to Window</span>
            </label>
            <span className="text-emerald-700 font-semibold">
              Connected (1280x720 • Frame #{frameCount})
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#e04343] hover:bg-[#f05454] text-white font-semibold rounded-xs cursor-pointer"
          >
            Disconnect
          </button>
        </div>

        {/* RemoteCanvasWidget */}
        <div className="flex-1 bg-[#202020] flex items-center justify-center overflow-auto p-2">
          <canvas
            ref={canvasRef}
            width={720}
            height={380}
            onMouseMove={handleCanvasMouseMove}
            onClick={handleCanvasClick}
            className={`${
              fitToWindow ? 'w-full h-full object-contain' : 'w-[720px] h-[380px]'
            } border border-gray-600 shadow-lg ${
              enableControl ? 'cursor-crosshair' : 'cursor-not-allowed'
            }`}
          />
        </div>
      </div>
    </WindowFrame>
  );
};

// 7. OpenSSL 3.0 ↔ 1.0 Crypto & Wire Frame Inspector + TstCrypto Runner
export const CryptoInspectorModal: React.FC<{
  wireLogs: WireFrameLog[];
  protocolMode: ProtocolHeaderMode;
  onToggleProtocolMode: (mode: ProtocolHeaderMode) => void;
  onClearLogs: () => void;
  onClose: () => void;
}> = ({ wireLogs, protocolMode, onToggleProtocolMode, onClearLogs, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'wire' | 'pem'>('tests');
  const [testResults, setTestResults] = useState<CryptoUnitTestResult[]>(() => runTstCryptoSuite());

  const handleReRunTests = () => {
    setTestResults(runTstCryptoSuite());
  };

  const passCount = testResults.filter((r) => r.passed).length;

  return (
    <WindowFrame
      title="OpenSSL 3.0 ↔ OpenSSL 1.0 Legacy Compatibility & TstCrypto Suite"
      icon="/resources/images/networksettings.png"
      onClose={onClose}
      widthClass="max-w-4xl w-full"
    >
      <div className="p-3 flex flex-col h-[520px]">
        {/* Top Mode Banner */}
        <div className="p-2.5 bg-white border border-[#aca899] rounded-xs mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <span>Active Protocol Header & OpenSSL Mode:</span>
              <span
                className={`px-2 py-0.5 rounded font-mono text-xs ${
                  protocolMode === 'Legacy v1.0'
                    ? 'bg-amber-100 text-amber-900 border border-amber-400'
                    : 'bg-indigo-100 text-indigo-900 border border-indigo-400'
                }`}
              >
                {protocolMode}
              </span>
            </div>
            <div className="text-[11px] text-gray-600 mt-0.5">
              {protocolMode === 'Legacy v1.0'
                ? 'Emits PKCS#1 "type-specific" (-----BEGIN RSA PUBLIC KEY-----) + SHA-1 OAEP + BRDCST/PUBKEY/HNDSHK/MESSAG so OpenSSL 1.0 peers do not NULL-dereference.'
                : 'Emits X.509 SPKI (-----BEGIN PUBLIC KEY-----) + SHA-256 OAEP + BRDv30/PUBKv3/HNDv30/MSGv30 framing.'}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onToggleProtocolMode(protocolMode === 'Legacy v1.0' ? 'Strict v3.0' : 'Legacy v1.0')
            }
            className="px-3 py-1.5 bg-[#0054e3] hover:bg-[#1d6bf3] text-white font-semibold text-xs rounded-xs cursor-pointer"
          >
            Switch to {protocolMode === 'Legacy v1.0' ? 'Strict v3.0' : 'Legacy v1.0'}
          </button>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[#aca899] mb-2">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`px-3 py-1.5 text-xs font-semibold border-t border-x rounded-t mr-1 cursor-pointer ${
                activeTab === 'tests'
                  ? 'bg-white border-[#aca899] text-slate-900'
                  : 'bg-[#e1dfd2] border-transparent text-gray-600'
              }`}
            >
              TstCrypto Unit Tests ({passCount}/{testResults.length} Passed)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wire')}
              className={`px-3 py-1.5 text-xs font-semibold border-t border-x rounded-t mr-1 cursor-pointer ${
                activeTab === 'wire'
                  ? 'bg-white border-[#aca899] text-slate-900'
                  : 'bg-[#e1dfd2] border-transparent text-gray-600'
              }`}
            >
              Live Datagram Wire Log ({wireLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pem')}
              className={`px-3 py-1.5 text-xs font-semibold border-t border-x rounded-t cursor-pointer ${
                activeTab === 'pem'
                  ? 'bg-white border-[#aca899] text-slate-900'
                  : 'bg-[#e1dfd2] border-transparent text-gray-600'
              }`}
            >
              RSA-1024 / RSA-2048 PEM Fixtures
            </button>
          </div>

          {activeTab === 'tests' && (
            <button
              type="button"
              onClick={handleReRunTests}
              className="px-2.5 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer mb-1"
            >
              Re-run ctest Suite
            </button>
          )}
          {activeTab === 'wire' && (
            <button
              type="button"
              onClick={onClearLogs}
              className="px-2.5 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer mb-1"
            >
              Clear Wire Log
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-white border border-[#aca899] overflow-y-auto p-2.5">
          {activeTab === 'tests' && (
            <div className="space-y-2">
              {testResults.map((tr) => (
                <div
                  key={tr.name}
                  className="p-2 border border-gray-200 rounded bg-gray-50/60 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          tr.passed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {tr.passed ? 'PASS' : 'FAIL'}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900">{tr.name}</span>
                    </div>
                    <div className="text-xs text-gray-700 mt-1">{tr.description}</div>
                    <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                      {tr.details}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 shrink-0">
                    {tr.durationMs} ms
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'wire' && (
            <div className="space-y-1.5 font-mono text-[11px]">
              {wireLogs.length === 0 ? (
                <div className="text-gray-400 italic text-center py-8">
                  No wire datagrams captured yet. Send a message or toggle protocol mode.
                </div>
              ) : (
                wireLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 border border-gray-200 rounded hover:bg-slate-50 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            log.direction === 'OUT'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {log.direction} {log.transport}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">
                          [{log.wireHeader}]
                        </span>
                        <span className="font-sans font-semibold text-slate-800">
                          {log.peerName} ({log.peerAddress})
                        </span>
                      </div>
                      <span className="text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()} • {log.encryptedBytes}B
                      </span>
                    </div>
                    <div className="text-slate-700 font-sans text-xs">{log.summary}</div>
                    <pre className="bg-slate-900 text-slate-200 p-1.5 rounded text-[10px] overflow-x-auto">
                      {log.rawPayloadPreview}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'pem' && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="font-bold text-slate-800 mb-1">
                  1. Legacy v1.0 PKCS#1 Public Key (tests/data/crypto/test-rsa2048-pub-pkcs1.pem)
                </div>
                <pre className="bg-slate-900 text-amber-300 p-2 rounded font-mono text-[11px] overflow-x-auto">
                  {FIXTURE_RSA2048_PUB_PKCS1}
                </pre>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-1">
                  2. Strict v3.0 X.509 SPKI Public Key (PEM_write_bio_PUBKEY)
                </div>
                <pre className="bg-slate-900 text-indigo-300 p-2 rounded font-mono text-[11px] overflow-x-auto">
                  {FIXTURE_RSA2048_PUB_SPKI}
                </pre>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-1">
                  3. Released v1.3.3 RSA-1024 Peer Fixture (tests/data/crypto/test-rsa1024-pub-pkcs1.pem)
                </div>
                <pre className="bg-slate-900 text-emerald-300 p-2 rounded font-mono text-[11px] overflow-x-auto">
                  {FIXTURE_RSA1024_PUB_PKCS1}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 8. Preferences / Settings Dialog (lmcSettingsDialog - all 9 categories)
export const SettingsDialogModal: React.FC<{
  settings: LmcSettings;
  localUser: User;
  onSaveSettings: (next: LmcSettings) => void;
  onResetSettings: () => void;
  onClearHistory: () => void;
  onClearTransfers: () => void;
  onClose: () => void;
}> = ({
  settings,
  localUser,
  onSaveSettings,
  onResetSettings,
  onClearHistory,
  onClearTransfers,
  onClose,
}) => {
  const [draft, setDraft] = useState<LmcSettings>({ ...settings });
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [newBroadcastIp, setNewBroadcastIp] = useState('');

  // Active i18n dictionary reflects the selected language in draft immediately
  const activeLang: SupportedLanguage = normalizeLanguage(draft.language);
  const activeAppTheme: AppUiTheme = normalizeAppTheme(draft.appTheme);
  const themeCfg = getAppThemeConfig(activeAppTheme);
  const i18n = getLabels(activeLang);

  const handleLanguageChange = (nextLang: SupportedLanguage) => {
    const nextDraft = { ...draft, language: nextLang };
    setDraft(nextDraft);
    onSaveSettings(nextDraft);
  };

  const handleAppThemeChange = (nextThemeValue: string) => {
    const nextTheme = saveAppThemeToStorage(nextThemeValue);
    const nextDraft = { ...draft, appTheme: nextTheme };
    setDraft(nextDraft);
    // Apply theme change immediately to parent settings so app-wide background and borders update in real time
    onSaveSettings(nextDraft);
  };

  const categories = [
    { key: 'general', name: i18n.preferences.categories.general, icon: '/resources/images/systemsettings.png' },
    { key: 'account', name: i18n.preferences.categories.account, icon: '/resources/images/usersettings.png' },
    { key: 'messages', name: i18n.preferences.categories.messages, icon: '/resources/images/messagesettings.png' },
    { key: 'history', name: i18n.preferences.categories.history, icon: '/resources/images/historysettings.png' },
    { key: 'alerts', name: i18n.preferences.categories.alerts, icon: '/resources/images/alertsettings.png' },
    { key: 'network', name: i18n.preferences.categories.network, icon: '/resources/images/networksettings.png' },
    { key: 'fileTransfer', name: i18n.preferences.categories.fileTransfer, icon: '/resources/images/transfersettings.png' },
    { key: 'theme', name: i18n.preferences.categories.theme, icon: '/resources/images/themesettings.png' },
    { key: 'hotkeys', name: i18n.preferences.categories.hotkeys, icon: '/resources/images/hotkeysettings.png' },
    { key: 'security', name: activeLang === 'ko_KR' ? '보안 및 권한 정책' : 'Security & Policy', icon: '/resources/images/tools.png' },
  ];

  // Sample messages for Theme live preview (matching lmcSettingsDialog::cboTheme_currentIndexChanged)
  const samplePreviewMessages: ChatMessage[] = [
    {
      id: 'prev-1',
      type: 'message',
      senderId: 'jack',
      senderName: 'Jack',
      recipientId: localUser.id,
      text:
        activeLang === 'ko_KR'
          ? '안녕하세요, 수신된 메시지 미리보기입니다.'
          : 'Hello, this is an incoming message.',
      timestamp: Date.now() - 120000,
      protocolMode: draft.protocolMode,
      wireHeader: draft.protocolMode === 'Legacy v1.0' ? 'MESSAG' : 'MSGv30',
      xmlPayload: '',
      encryptedHex: '',
    },
    {
      id: 'prev-2',
      type: 'message',
      senderId: 'jack',
      senderName: 'Jack',
      recipientId: localUser.id,
      text:
        activeLang === 'ko_KR'
          ? '연속으로 수신된 메시지입니다 :-)'
          : 'Hello, this is a consecutive incoming message :-)',
      timestamp: Date.now() - 115000,
      protocolMode: draft.protocolMode,
      wireHeader: draft.protocolMode === 'Legacy v1.0' ? 'MESSAG' : 'MSGv30',
      xmlPayload: '',
      encryptedHex: '',
    },
    {
      id: 'prev-3',
      type: 'broadcast',
      senderId: 'jack',
      senderName: 'Jack',
      recipientId: localUser.id,
      text:
        activeLang === 'ko_KR'
          ? '전체 쪽지(브로드캐스트) 메시지입니다!'
          : 'This is a broadcast message!',
      timestamp: Date.now() - 90000,
      protocolMode: draft.protocolMode,
      wireHeader: draft.protocolMode === 'Legacy v1.0' ? 'BRDCST' : 'BRDv30',
      xmlPayload: '',
      encryptedHex: '',
    },
    {
      id: 'prev-4',
      type: 'message',
      senderId: localUser.id,
      senderName: draft.userName || localUser.name,
      recipientId: 'jack',
      text:
        activeLang === 'ko_KR'
          ? '반갑습니다, 내가 보낸 메시지 미리보기입니다 (Y)'
          : 'Hi, this is an outgoing message (Y)',
      timestamp: Date.now() - 60000,
      protocolMode: draft.protocolMode,
      wireHeader: draft.protocolMode === 'Legacy v1.0' ? 'MESSAG' : 'MSGv30',
      xmlPayload: '',
      encryptedHex: '',
    },
  ];

  const handleSave = () => {
    saveAppThemeToStorage(draft.appTheme);
    onSaveSettings(draft);
    onClose();
  };

  return (
    <WindowFrame
      title={i18n.preferences.windowTitle}
      icon="/resources/images/tools.png"
      onClose={onClose}
      widthClass="max-w-2xl w-full"
      appTheme={activeAppTheme}
    >
      <div
        className="p-3 flex flex-col h-[510px]"
        style={{
          backgroundColor: themeCfg.windowBg,
          color: themeCfg.textPrimary,
        }}
      >
        {/* Top Real-Time Quick Controls: Language Switcher + App Theme Dropdown ('클래식 윈도우', '다크 모드', '고대비') */}
        <div
          style={{
            backgroundColor: themeCfg.subPanelBg,
            borderColor: themeCfg.borderInner,
            borderStyle: themeCfg.borderStyle,
          }}
          className="mb-2.5 px-3 py-1.5 border rounded-xs flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          {/* App Theme Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="settings-app-theme-select"
              className="font-bold whitespace-nowrap"
              style={{ color: themeCfg.textPrimary }}
            >
              🎨 {i18n.preferences.theme.appThemeLabel}
            </label>
            <select
              id="settings-app-theme-select"
              aria-label="앱 테마 선택"
              value={activeAppTheme}
              onChange={(e) => handleAppThemeChange(e.target.value)}
              style={{
                backgroundColor: themeCfg.panelBg,
                color: themeCfg.textPrimary,
                borderColor: themeCfg.borderOuter,
                borderStyle: themeCfg.borderStyle,
              }}
              className="border px-2 py-1 rounded-xs font-semibold text-xs cursor-pointer"
            >
              <option value="classic">클래식 윈도우</option>
              <option value="dark">다크 모드</option>
              <option value="high-contrast">고대비</option>
            </select>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Language Switcher">
            <span className="font-bold whitespace-nowrap" style={{ color: themeCfg.textPrimary }}>
              🌐 {i18n.preferences.quickToggleLabel}:
            </span>
            <button
              type="button"
              onClick={() => handleLanguageChange('en_US')}
              className={`px-2 py-1 rounded-xs font-semibold border text-xs cursor-pointer transition-colors ${
                activeLang === 'en_US'
                  ? 'bg-[#0054e3] text-white border-[#0046c7]'
                  : 'bg-white text-slate-800 border-[#7f9db9] hover:bg-blue-50'
              }`}
            >
              🇺🇸 English (en_US)
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('ko_KR')}
              className={`px-2 py-1 rounded-xs font-semibold border text-xs cursor-pointer transition-colors ${
                activeLang === 'ko_KR'
                  ? 'bg-[#0054e3] text-white border-[#0046c7]'
                  : 'bg-white text-slate-800 border-[#7f9db9] hover:bg-blue-50'
              }`}
            >
              🇰🇷 한국어 (ko_KR)
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-3 min-h-0">
          {/* Left Category List (ui.lvCategories) */}
          <div className="w-40 bg-white border border-[#7f9db9] overflow-y-auto p-1 space-y-0.5 shrink-0">
            {categories.map((cat, idx) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryIdx(idx)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-xs font-medium cursor-pointer text-left ${
                  categoryIdx === idx
                    ? 'bg-[#0054e3] text-white'
                    : 'hover:bg-blue-50 text-slate-800'
                }`}
              >
                <img src={cat.icon} alt="" className="w-5 h-5 shrink-0" />
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Right Stacked Page (ui.stackedWidget) */}
          <div className="flex-1 bg-white border border-[#7f9db9] p-3 overflow-y-auto text-xs flex flex-col">
            <div className="font-bold text-sm text-white bg-gradient-to-r from-[#0054e3] to-[#4b89f5] px-2.5 py-1 rounded-xs mb-3">
              {categories[categoryIdx].name}
            </div>

            {/* 0: General */}
            {categoryIdx === 0 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.general.systemLegend}
                  </legend>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.autoStart}
                        onChange={(e) => setDraft({ ...draft, autoStart: e.target.checked })}
                      />
                      <span>{i18n.preferences.general.autoStart}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.autoShow}
                        onChange={(e) => setDraft({ ...draft, autoShow: e.target.checked })}
                      />
                      <span>{i18n.preferences.general.autoShow}</span>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="border border-gray-300 p-2.5 rounded">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.general.sysTrayLegend}
                  </legend>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.showSysTray}
                        onChange={(e) => setDraft({ ...draft, showSysTray: e.target.checked })}
                      />
                      <span>{i18n.preferences.general.showSysTray}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.minimizeToTray}
                        onChange={(e) => setDraft({ ...draft, minimizeToTray: e.target.checked })}
                      />
                      <span>{i18n.preferences.general.minimizeToTray}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.showSysTrayMsg}
                        onChange={(e) => setDraft({ ...draft, showSysTrayMsg: e.target.checked })}
                      />
                      <span>{i18n.preferences.general.showSysTrayMsg}</span>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="border border-blue-400 bg-blue-50/40 p-2.5 rounded space-y-2">
                  <legend className="font-bold px-1 text-blue-900">
                    {i18n.preferences.general.languageLegend}
                  </legend>
                  <label className="block font-medium text-slate-800">
                    {i18n.preferences.general.languageSelectLabel}
                  </label>
                  <select
                    aria-label="Interface Language"
                    value={activeLang}
                    onChange={(e) => handleLanguageChange(normalizeLanguage(e.target.value))}
                    className="w-full border border-[#7f9db9] px-2 py-1.5 bg-white font-semibold"
                  >
                    <option value="en_US">English (United States) — en_US</option>
                    <option value="ko_KR">한국어 (Korean) — ko_KR</option>
                  </select>
                  <div className="text-[11px] text-gray-600">
                    {i18n.preferences.general.languageHint}
                  </div>
                </fieldset>
              </div>
            )}

            {/* 1: Account */}
            {categoryIdx === 1 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded space-y-2">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.account.personalDetailsLegend}
                  </legend>
                  <div>
                    <label className="block font-medium mb-0.5">
                      {i18n.preferences.account.userNameLabel}
                    </label>
                    <input
                      type="text"
                      value={draft.userName}
                      onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
                      className="w-full border border-[#7f9db9] px-2 py-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium mb-0.5">
                        {i18n.preferences.account.firstNameLabel}
                      </label>
                      <input
                        type="text"
                        value={draft.firstName}
                        onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                        className="w-full border border-[#7f9db9] px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-0.5">
                        {i18n.preferences.account.lastNameLabel}
                      </label>
                      <input
                        type="text"
                        value={draft.lastName}
                        onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                        className="w-full border border-[#7f9db9] px-2 py-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium mb-0.5">
                      {i18n.preferences.account.aboutLabel}
                    </label>
                    <textarea
                      rows={3}
                      value={draft.about}
                      onChange={(e) => setDraft({ ...draft, about: e.target.value })}
                      className="w-full border border-[#7f9db9] px-2 py-1 resize-none"
                    />
                  </div>
                </fieldset>
              </div>
            )}

            {/* 2: Messages */}
            {categoryIdx === 2 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded space-y-1.5">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.messages.messageWindowLegend}
                  </legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showEmoticons}
                      onChange={(e) => setDraft({ ...draft, showEmoticons: e.target.checked })}
                    />
                    <span>{i18n.preferences.messages.showEmoticons}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showMessageTime}
                      onChange={(e) => setDraft({ ...draft, showMessageTime: e.target.checked })}
                    />
                    <span>{i18n.preferences.messages.showMessageTime}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pl-5">
                    <input
                      type="checkbox"
                      disabled={!draft.showMessageTime}
                      checked={draft.showMessageDate}
                      onChange={(e) => setDraft({ ...draft, showMessageDate: e.target.checked })}
                    />
                    <span>{i18n.preferences.messages.showMessageDate}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.allowLinks}
                      onChange={(e) => setDraft({ ...draft, allowLinks: e.target.checked })}
                    />
                    <span>{i18n.preferences.messages.allowLinks}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.trimMessage}
                      onChange={(e) => setDraft({ ...draft, trimMessage: e.target.checked })}
                    />
                    <span>{i18n.preferences.messages.trimMessage}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showSendButton}
                      onChange={(e) => setDraft({ ...draft, showSendButton: e.target.checked })}
                    />
                    <span>{i18n.preferences.messages.showSendButton}</span>
                  </label>
                </fieldset>

                <fieldset className="border border-gray-300 p-2.5 rounded space-y-2">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.messages.fontSizeLegend}
                  </legend>
                  <div className="flex items-center gap-2">
                    <span>{i18n.preferences.messages.messageTextSizeLabel}</span>
                    <select
                      value={draft.fontSize}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          fontSize: e.target.value as LmcSettings['fontSize'],
                        })
                      }
                      className="border border-gray-400 px-2 py-1"
                    >
                      <option value="Small">{i18n.preferences.messages.sizeSmall}</option>
                      <option value="Medium">{i18n.preferences.messages.sizeMedium}</option>
                      <option value="Large">{i18n.preferences.messages.sizeLarge}</option>
                    </select>
                  </div>
                </fieldset>
              </div>
            )}

            {/* 3: History */}
            {categoryIdx === 3 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded space-y-2">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.history.messageHistoryLegend}
                  </legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.saveHistory}
                      onChange={(e) => setDraft({ ...draft, saveHistory: e.target.checked })}
                    />
                    <span>{i18n.preferences.history.saveHistory}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.saveFileHistory}
                      onChange={(e) => setDraft({ ...draft, saveFileHistory: e.target.checked })}
                    />
                    <span>{i18n.preferences.history.saveFileHistory}</span>
                  </label>
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={onClearHistory}
                      className="px-3 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] cursor-pointer"
                    >
                      {i18n.preferences.history.clearMessageHistoryBtn}
                    </button>
                    <button
                      type="button"
                      onClick={onClearTransfers}
                      className="px-3 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] cursor-pointer"
                    >
                      {i18n.preferences.history.clearFileHistoryBtn}
                    </button>
                  </div>
                </fieldset>
              </div>
            )}

            {/* 4: Alerts */}
            {categoryIdx === 4 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded space-y-1.5">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.alerts.notificationsLegend}
                  </legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showAlerts}
                      onChange={(e) => setDraft({ ...draft, showAlerts: e.target.checked })}
                    />
                    <span>{i18n.preferences.alerts.showAlerts}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.noBusyAlert}
                      onChange={(e) => setDraft({ ...draft, noBusyAlert: e.target.checked })}
                    />
                    <span>{i18n.preferences.alerts.noBusyAlert}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.enableSound}
                      onChange={(e) => setDraft({ ...draft, enableSound: e.target.checked })}
                    />
                    <span>{i18n.preferences.alerts.enableSound}</span>
                  </label>
                </fieldset>
              </div>
            )}

            {/* 5: Network */}
            {categoryIdx === 5 && (
              <div className="space-y-2.5">
                <fieldset className="border border-blue-400 bg-blue-50/40 p-2.5 rounded space-y-1.5">
                  <legend className="font-bold px-1 text-blue-900">
                    {i18n.preferences.network.protocolCompatLegend}
                  </legend>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {i18n.preferences.network.wireHeaderModeLabel}
                    </span>
                    <select
                      value={draft.protocolMode}
                      onChange={(e) => {
                        const mode = e.target.value as ProtocolHeaderMode;
                        setDraft({
                          ...draft,
                          protocolMode: mode,
                          legacyCompatibility: mode === 'Legacy v1.0',
                        });
                      }}
                      className="border border-blue-500 bg-white px-2 py-1 font-semibold"
                    >
                      <option value="Legacy v1.0">
                        Legacy v1.0 (PKCS#1 + OAEP-SHA1 / OpenSSL 1.0 Safe)
                      </option>
                      <option value="Strict v3.0">
                        Strict v3.0 (X.509 SPKI + OAEP-SHA256 / OpenSSL 3.0)
                      </option>
                    </select>
                  </div>
                </fieldset>

                <fieldset className="border border-gray-300 p-2.5 rounded space-y-2">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.network.multicastPortsLegend}
                  </legend>
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <span>{i18n.preferences.network.multicastGroupIpLabel}</span>
                    <input
                      type="text"
                      value={draft.multicastAddress}
                      onChange={(e) => setDraft({ ...draft, multicastAddress: e.target.value })}
                      className="col-span-2 border border-[#7f9db9] px-2 py-1 font-mono"
                    />
                    <span>{i18n.preferences.network.udpPortLabel}</span>
                    <input
                      type="number"
                      value={draft.udpPort}
                      onChange={(e) =>
                        setDraft({ ...draft, udpPort: Number(e.target.value) || 50000 })
                      }
                      className="col-span-2 border border-[#7f9db9] px-2 py-1 font-mono"
                    />
                    <span>{i18n.preferences.network.tcpPortLabel}</span>
                    <input
                      type="number"
                      value={draft.tcpPort}
                      onChange={(e) =>
                        setDraft({ ...draft, tcpPort: Number(e.target.value) || 50000 })
                      }
                      className="col-span-2 border border-[#7f9db9] px-2 py-1 font-mono"
                    />
                  </div>

                  <div className="pt-1">
                    <div className="font-medium mb-1">
                      {i18n.preferences.network.broadcastListLabel}
                    </div>
                    <div className="flex gap-1.5 mb-1.5">
                      <input
                        type="text"
                        value={newBroadcastIp}
                        onChange={(e) => setNewBroadcastIp(e.target.value)}
                        placeholder="e.g. 192.168.1.255"
                        className="flex-1 border border-[#7f9db9] px-2 py-0.5 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newBroadcastIp.trim()) {
                            setDraft({
                              ...draft,
                              broadcastList: [...draft.broadcastList, newBroadcastIp.trim()],
                            });
                            setNewBroadcastIp('');
                          }
                        }}
                        className="px-2.5 py-0.5 bg-[#e1dfd2] border border-[#7f9db9] cursor-pointer"
                      >
                        {i18n.preferences.network.addBtn}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {draft.broadcastList.map((ip) => (
                        <span
                          key={ip}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-300 font-mono text-[11px]"
                        >
                          {ip}
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                broadcastList: draft.broadcastList.filter((x) => x !== ip),
                              })
                            }
                            className="text-red-600 hover:font-bold cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </fieldset>
              </div>
            )}

            {/* 6: File Transfer */}
            {categoryIdx === 6 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded space-y-1.5">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.fileTransfer.fileReceptionLegend}
                  </legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.autoReceiveFile}
                      onChange={(e) => setDraft({ ...draft, autoReceiveFile: e.target.checked })}
                    />
                    <span>{i18n.preferences.fileTransfer.autoReceiveFile}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.autoShowTransferWindow}
                      onChange={(e) =>
                        setDraft({ ...draft, autoShowTransferWindow: e.target.checked })
                      }
                    />
                    <span>{i18n.preferences.fileTransfer.autoShowTransferWindow}</span>
                  </label>
                  <div className="pt-2">
                    <label className="block font-medium mb-0.5">
                      {i18n.preferences.fileTransfer.receivedFilesFolderLabel}
                    </label>
                    <input
                      type="text"
                      value={draft.fileStoragePath}
                      onChange={(e) => setDraft({ ...draft, fileStoragePath: e.target.value })}
                      className="w-full border border-[#7f9db9] px-2 py-1 font-mono"
                    />
                  </div>
                </fieldset>
              </div>
            )}

            {/* 7: Theme (with live preview!) */}
            {categoryIdx === 7 && (
              <div className="flex-1 flex flex-col space-y-2.5 min-h-0">
                <fieldset className="border border-blue-400 bg-blue-50/40 p-2.5 rounded space-y-1.5">
                  <legend className="font-bold px-1 text-blue-900">
                    {i18n.preferences.theme.appThemeLegend}
                  </legend>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-medium">
                      {i18n.preferences.theme.appThemeLabel}
                    </label>
                    <select
                      aria-label="테마 드롭다운"
                      value={activeAppTheme}
                      onChange={(e) => handleAppThemeChange(e.target.value)}
                      className="border border-[#7f9db9] px-2.5 py-1 bg-white font-semibold cursor-pointer"
                    >
                      <option value="classic">클래식 윈도우</option>
                      <option value="dark">다크 모드</option>
                      <option value="high-contrast">고대비</option>
                    </select>
                  </div>
                  <div className="text-[11px] text-gray-600">
                    {i18n.preferences.theme.appThemeHint}
                  </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-0.5">
                      {i18n.preferences.theme.chatThemeLabel}
                    </label>
                    <select
                      value={draft.theme}
                      onChange={(e) =>
                        setDraft({ ...draft, theme: e.target.value as ThemeName })
                      }
                      className="w-full border border-[#7f9db9] px-2 py-1 bg-white font-semibold"
                    >
                      <option value="Classic">Classic</option>
                      <option value="Bubble">Bubble</option>
                      <option value="Dark Bubble">Dark Bubble</option>
                      <option value="Digg">Digg</option>
                      <option value="Ping Pong">Ping Pong</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-0.5">
                      {i18n.preferences.theme.contactListViewLabel}
                    </label>
                    <select
                      value={draft.userListView}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          userListView: e.target.value as LmcSettings['userListView'],
                        })
                      }
                      className="w-full border border-[#7f9db9] px-2 py-1 bg-white"
                    >
                      <option value="Detailed">{i18n.preferences.theme.detailedViewOption}</option>
                      <option value="Compact">{i18n.preferences.theme.compactViewOption}</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 flex flex-col border border-gray-400 rounded overflow-hidden min-h-[190px]">
                  <div className="px-2 py-1 bg-gray-100 border-b border-gray-300 text-[11px] font-semibold text-gray-600">
                    {i18n.preferences.theme.themePreviewTitle} ({draft.theme})
                  </div>
                  <ThemedMessageLog
                    messages={samplePreviewMessages}
                    localUser={localUser}
                    peer={{
                      ...localUser,
                      id: 'jack',
                      name: 'Jack',
                      avatarPath: '/resources/avatars/4.png',
                    }}
                    settings={draft}
                    themeOverride={draft.theme}
                  />
                </div>
              </div>
            )}

            {/* 8: Hotkeys */}
            {categoryIdx === 8 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded space-y-2">
                  <legend className="font-semibold px-1 text-slate-700">
                    {i18n.preferences.hotkeys.sendMessageKeyLegend}
                  </legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!draft.sendKeyModCtrlEnter}
                      onChange={() => setDraft({ ...draft, sendKeyModCtrlEnter: false })}
                    />
                    <span>{i18n.preferences.hotkeys.enterSendsRadio}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={draft.sendKeyModCtrlEnter}
                      onChange={() => setDraft({ ...draft, sendKeyModCtrlEnter: true })}
                    />
                    <span>{i18n.preferences.hotkeys.ctrlEnterSendsRadio}</span>
                  </label>
                </fieldset>
              </div>
            )}

            {/* 9: Security & Permission Policy */}
            {categoryIdx === 9 && (
              <div className="space-y-4 text-xs text-slate-800">
                {/* Section 1: Remote Desktop Request Authorization */}
                <fieldset className="border border-gray-300 p-3 rounded space-y-2.5 bg-white">
                  <legend className="font-bold px-1 text-slate-800 flex items-center gap-1.5">
                    <span>🖥️</span>
                    <span>원격 데스크톱 제어 요청 권한 (Remote Desktop Permission)</span>
                  </legend>

                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">원격 요청 인가 관리자 IP:</span>
                      <span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {draft.authorizedRemoteIp || '192.168.10.212'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">현재 클라이언트 IP:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {localUser.address}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                      <span className="text-gray-600">원격 요청 허용 상태:</span>
                      {localUser.address === (draft.authorizedRemoteIp || '192.168.10.212') ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          <span>✅</span>
                          <span>인가됨 (원격 요청 가능)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
                          <span>❌</span>
                          <span>차단됨 (192.168.10.212 전용)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    ※ 보안 규정에 따라 <b>192.168.10.212</b> IP에서만 다른 피어로 원격 데스크톱 연결을 요청할 수 있으며, 타 IP에서의 원격 제어 요청 시도는 즉시 거절됩니다.
                  </p>
                </fieldset>

                {/* Section 2: OpenSourceCapture Usage Policy (ON/OFF) */}
                <fieldset className="border border-gray-300 p-3 rounded space-y-2.5 bg-white">
                  <legend className="font-bold px-1 text-slate-800 flex items-center gap-1.5">
                    <span>📸</span>
                    <span>오픈소스캡쳐(Kalmuri) 사용 정책 (On/Off Control)</span>
                  </legend>

                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">오픈소스캡쳐 기능 상태:</span>
                      <span className={`px-2.5 py-0.5 rounded font-bold text-xs border ${
                        draft.captureFeatureEnabled
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {draft.captureFeatureEnabled ? '사용 허용 (ON)' : '사용 차단 (OFF)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">ON/OFF 설정 권한:</span>
                      {localUser.address === (draft.authorizedRemoteIp || '192.168.10.212') ? (
                        <span className="font-bold text-blue-700">
                          관리자 권한 보유 (변경 가능)
                        </span>
                      ) : (
                        <span className="font-bold text-gray-500">
                          권한 없음 (192.168.10.212에서만 변경 가능)
                        </span>
                      )}
                    </div>

                    {/* Toggle Button */}
                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-[11px] text-gray-600">
                        {localUser.address === (draft.authorizedRemoteIp || '192.168.10.212')
                          ? '관리자 계정으로 오픈소스캡쳐 사용 허용/차단을 토글할 수 있습니다.'
                          : '현재 IP에서는 오픈소스캡쳐 ON/OFF 설정을 변경할 수 없습니다.'}
                      </div>

                      {localUser.address === (draft.authorizedRemoteIp || '192.168.10.212') ? (
                        <button
                          type="button"
                          onClick={() => setDraft({ ...draft, captureFeatureEnabled: !draft.captureFeatureEnabled })}
                          className={`px-3 py-1 font-bold rounded shadow-xs cursor-pointer text-white text-xs ${
                            draft.captureFeatureEnabled
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {draft.captureFeatureEnabled ? '사용 차단(OFF)으로 변경' : '사용 허용(ON)으로 변경'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="px-3 py-1 font-bold rounded bg-gray-300 text-gray-500 text-xs cursor-not-allowed flex items-center gap-1"
                          title="192.168.10.212에서만 변경할 수 있습니다."
                        >
                          <span>🔒</span>
                          <span>설정 잠김 (권한 없음)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    ※ 오픈소스캡쳐 기능 On/Off는 <b>192.168.10.212</b>에서만 변경할 수 있으며, 사용 차단(OFF) 시 모든 사용자의 화면 캡쳐 실행이 차단됩니다.
                  </p>
                </fieldset>
              </div>
            )}
          </div>
        </div>

        {/* Bottom OK / Cancel / Reset Preferences */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#aca899]">
          <button
            type="button"
            onClick={() => {
              onResetSettings();
              onClose();
            }}
            className="px-3 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
          >
            {i18n.preferences.buttons.resetPreferences}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold text-xs cursor-pointer"
            >
              {i18n.preferences.buttons.ok}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
            >
              {i18n.preferences.buttons.cancel}
            </button>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
};

// 9. About Dialog (lmcAboutDialog)
export const AboutDialogModal: React.FC<{
  language?: string;
  onClose: () => void;
}> = ({ language = 'en_US', onClose }) => {
  const [tab, setTab] = useState<'about' | 'thanks' | 'license'>('about');
  const i18n = getLabels(language);

  return (
    <WindowFrame
      title={i18n.modals.about.title}
      icon="/resources/images/logo.png"
      onClose={onClose}
      widthClass="max-w-md w-full"
    >
      <div className="p-3.5 text-xs">
        <div className="flex items-center gap-3 mb-3">
          <img src="/resources/images/logo.png" alt="LAN Messenger" className="w-12 h-12" />
          <div>
            <div className="font-bold text-sm text-slate-900">
              LAN Messenger {VERSION_CONFIG.version}
            </div>
            <div className="text-gray-600">
              Based on v{VERSION_CONFIG.legacyBaseVersion} • OpenSSL 3.0 ↔ 1.0 Compat & Remote Desktop
            </div>
          </div>
        </div>

        <div className="flex border-b border-[#aca899] mb-2">
          <button
            type="button"
            onClick={() => setTab('about')}
            className={`px-3 py-1 font-semibold border-t border-x rounded-t mr-1 cursor-pointer ${
              tab === 'about' ? 'bg-white border-[#aca899]' : 'bg-[#e1dfd2] border-transparent'
            }`}
          >
            {i18n.modals.about.tabAbout}
          </button>
          <button
            type="button"
            onClick={() => setTab('thanks')}
            className={`px-3 py-1 font-semibold border-t border-x rounded-t mr-1 cursor-pointer ${
              tab === 'thanks' ? 'bg-white border-[#aca899]' : 'bg-[#e1dfd2] border-transparent'
            }`}
          >
            {i18n.modals.about.tabThanks}
          </button>
          <button
            type="button"
            onClick={() => setTab('license')}
            className={`px-3 py-1 font-semibold border-t border-x rounded-t cursor-pointer ${
              tab === 'license' ? 'bg-white border-[#aca899]' : 'bg-[#e1dfd2] border-transparent'
            }`}
          >
            {i18n.modals.about.tabLicense}
          </button>
        </div>

        <div className="bg-white border border-[#aca899] p-2.5 h-44 overflow-y-auto space-y-2 leading-relaxed">
          {tab === 'about' && (
            <>
              <p>
                LAN Messenger is a free peer-to-peer messaging application for intra-network
                communication and does not require a server.
              </p>
              <p>
                Includes full <b>Legacy v1.0</b> (PKCS#1 RSA Public Key + SHA-1 OAEP) and{' '}
                <b>Strict v3.0</b> (X.509 SPKI + SHA-256 OAEP) protocol compatibility between
                OpenSSL 3.0 and OpenSSL 1.0 peers.
              </p>
              <p className="text-gray-500">Copyright (C) 2010-2016 Qualia Digital Solutions.</p>
            </>
          )}
          {tab === 'thanks' && (
            <p>
              Special thanks to Qualia Digital Solutions, Qt 6 contributors, OpenSSL 3.0/1.0
              interoperability contributors, and translators across 20 languages.
            </p>
          )}
          {tab === 'license' && (
            <p className="font-mono text-[11px]">
              LAN Messenger is free software: you can redistribute it and/or modify it under the
              terms of the GNU General Public License as published by the Free Software Foundation,
              either version 3 of the License, or (at your option) any later version.
            </p>
          )}
        </div>

        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold cursor-pointer"
          >
            {i18n.modals.about.close}
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 10. Update Window (lmcUpdateWindow -> GitHub Releases API tag_name check)
export const UpdateWindowModal: React.FC<{
  language?: string;
  onClose: () => void;
}> = ({ language = 'en_US', onClose }) => {
  const CURRENT_VERSION = VERSION_CONFIG.rawVersion;
  const GITHUB_RELEASES_API = 'https://api.github.com/repos/yjhone1/lan-messenger/releases/latest';
  const i18n = getLabels(language);

  const [status, setStatus] = useState<'check' | 'latest' | 'new' | 'error'>('check');
  const [webVersion, setWebVersion] = useState<string>('');
  const [rawTag, setRawTag] = useState<string>('');
  const [directDownloadUrl, setDirectDownloadUrl] = useState<string>('');

  const compareVersions = (v1Str: string, v2Str: string): number => {
    const expand = (s: string): number[] => {
      const clean = s.trim().replace(/^v/i, '');
      const out: number[] = [];
      for (const part of clean.split('.').filter(Boolean)) {
        if (part.length > 1 && part.startsWith('0')) {
          let i = 0;
          while (i < part.length && part[i] === '0') {
            out.push(0);
            i++;
          }
          if (i < part.length) {
            out.push(parseInt(part.slice(i), 10) || 0);
          }
        } else {
          out.push(parseInt(part, 10) || 0);
        }
      }
      return out;
    };
    const p1 = expand(v1Str);
    const p2 = expand(v2Str);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const diff = (p1[i] || 0) - (p2[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  const checkForUpdates = async () => {
    setStatus('check');
    try {
      const res = await fetch(GITHUB_RELEASES_API, {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = await res.json();
      const tagName = typeof data.tag_name === 'string' ? data.tag_name.trim() : '';
      if (!tagName) {
        setStatus('error');
        return;
      }
      setRawTag(tagName);
      const normalized = tagName.replace(/^v/i, '');
      setWebVersion(normalized);

      let resolvedAssetUrl = '';
      if (Array.isArray(data.assets)) {
        const exeAsset = data.assets.find(
          (a: { name?: string; browser_download_url?: string }) =>
            typeof a?.name === 'string' &&
            a.name.toLowerCase().endsWith('.exe') &&
            typeof a.browser_download_url === 'string'
        );
        const zipAsset = data.assets.find(
          (a: { name?: string; browser_download_url?: string }) =>
            typeof a?.name === 'string' &&
            a.name.toLowerCase().endsWith('.zip') &&
            typeof a.browser_download_url === 'string'
        );
        resolvedAssetUrl =
          exeAsset?.browser_download_url || zipAsset?.browser_download_url || '';
      }
      if (!resolvedAssetUrl) {
        resolvedAssetUrl = `https://github.com/yjhone1/lan-messenger/releases/download/v${normalized}/lmc-${normalized}-win64.exe`;
      }
      setDirectDownloadUrl(resolvedAssetUrl);

      if (compareVersions(normalized, CURRENT_VERSION) > 0) {
        setStatus('new');
      } else {
        setStatus('latest');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleRecheckOrDownload = () => {
    if (status === 'new' && directDownloadUrl) {
      const anchor = document.createElement('a');
      anchor.href = directDownloadUrl;
      anchor.download = directDownloadUrl.split('/').pop() || `lmc-${webVersion}-win64.exe`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return;
    }
    checkForUpdates();
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <WindowFrame
      title={i18n.modals.update.title}
      icon="/resources/images/logo.png"
      onClose={onClose}
      widthClass="max-w-md w-full"
    >
      <div className="p-3.5 text-xs space-y-3">
        <div className="bg-white border border-[#aca899] p-3 min-h-[96px] flex flex-col justify-between">
          <div className="font-medium text-slate-900 space-y-1.5">
            <div>
              {status === 'check' && i18n.modals.update.checking}
              {status === 'error' && i18n.modals.update.error}
              {status === 'new' && `${i18n.modals.update.newAvailable} (${webVersion})`}
              {status === 'latest' && i18n.modals.update.upToDate}
            </div>
            {status === 'new' && directDownloadUrl && (
              <div>
                <a
                  href={directDownloadUrl}
                  download
                  className="text-[#0054e3] underline font-semibold hover:text-blue-800 break-all"
                >
                  {directDownloadUrl}
                </a>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-600 font-mono space-y-0.5">
            <div>Endpoint: {GITHUB_RELEASES_API}</div>
            <div>
              Local IDA_VERSION: <b>{CURRENT_VERSION}</b>
              {rawTag ? (
                <>
                  {' '}
                  | GitHub tag_name: <b>{rawTag}</b> (parsed: <b>{webVersion}</b>)
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={status === 'check'}
            onClick={handleRecheckOrDownload}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] disabled:opacity-50 border border-[#7f9db9] cursor-pointer"
          >
            {i18n.modals.update.recheck}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold cursor-pointer"
          >
            {i18n.modals.update.close}
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 11. Security & Permission Alert Dialog (for unauthorized remote, capture or agent attempts)
export const SecurityAlertModal: React.FC<{
  title: string;
  message: string;
  currentIp: string;
  requiredIp: string;
  onClose: () => void;
}> = ({ title, message, currentIp, requiredIp, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#ece9d8] border-2 border-[#0054e3] rounded-t shadow-2xl font-sans text-xs select-none">
        {/* Title bar */}
        <div className="bg-gradient-to-r from-[#0054e3] via-[#2673f2] to-[#0046c7] text-white px-3 py-1.5 flex items-center justify-between font-bold shadow-xs">
          <div className="flex items-center gap-1.5">
            <span>🛡️</span>
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-4 h-4 bg-[#e04343] hover:bg-[#f05454] text-white rounded-xs flex items-center justify-center font-bold text-[10px] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 bg-[#f5f4ee]">
          <div className="flex items-start gap-3">
            <span className="text-3xl shrink-0">⚠️</span>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
              <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-2.5 text-xs space-y-1.5 text-slate-700 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">필요 인가 IP:</span>
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {requiredIp}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">현재 접속 IP:</span>
              <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {currentIp}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200">
              <span>권한 검증 결과:</span>
              <span className="font-bold text-rose-600">접근 거부 (차단)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-blue-50/60 border border-blue-200/60 p-2 rounded">
            💡 <strong>안내:</strong> 사용자별 기능 ON/OFF 권한은 관리자(192.168.10.212) 전용이거나, <strong>사용자 정보 → 유틸리티</strong> 탭에서 관리자 비밀번호(<code>192.168.10.212</code>) 인증을 통해 변경할 수 있습니다.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-300">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold text-slate-800 rounded-xs cursor-pointer shadow-xs"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
