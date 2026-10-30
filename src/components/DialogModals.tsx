import React, { useState, useEffect, useRef } from 'react';
import {
  ChatMessage,
  FileTransferItem,
  Group,
  HistoryRecord,
  LmcSettings,
  ProtocolHeaderMode,
  STATUS_LIST,
  ThemeName,
  User,
  WireFrameLog,
} from '../types/lmc';
import {
  CryptoUnitTestResult,
  FIXTURE_RSA1024_PUB_PKCS1,
  FIXTURE_RSA2048_PUB_PKCS1,
  FIXTURE_RSA2048_PUB_SPKI,
  runTstCryptoSuite,
} from '../services/cryptoEngine';
import { ThemedMessageLog } from './ChatWindow';

// Shared Classic Window Frame wrapper
const WindowFrame: React.FC<{
  title: string;
  icon: string;
  onClose: () => void;
  widthClass?: string;
  children: React.ReactNode;
}> = ({ title, icon, onClose, widthClass = 'max-w-2xl w-full', children }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
      <div
        className={`${widthClass} bg-[#ece9d8] border-2 border-[#0054e3] rounded-t-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh]`}
      >
        <div className="h-7 px-2.5 bg-gradient-to-r from-[#0054e3] via-[#2673f2] to-[#0046c7] text-white flex items-center justify-between select-none shrink-0">
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
  onSendBroadcast: (recipientIds: string[], text: string) => void;
  onClose: () => void;
}> = ({ users, groups, protocolMode, onSendBroadcast, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(users.map((u) => u.id));
  const [messageText, setMessageText] = useState('');

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
      title="Send Broadcast Message"
      icon="/resources/images/broadcastmsg.png"
      onClose={onClose}
      widthClass="max-w-xl w-full"
    >
      <div className="p-3 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {/* Message editor */}
          <div className="sm:col-span-3 flex flex-col">
            <label className="text-xs font-semibold text-slate-800 mb-1">
              Broadcast Message ({protocolMode === 'Legacy v1.0' ? 'BRDCST' : 'BRDv30'}):
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Enter broadcast announcement for selected LAN peers..."
              className="flex-1 min-h-[160px] bg-white border border-[#7f9db9] p-2 text-xs focus:outline-none focus:border-[#0054e3] resize-none"
            />
          </div>

          {/* Recipient Tree */}
          <div className="sm:col-span-2 flex flex-col">
            <label className="text-xs font-semibold text-slate-800 mb-1">
              Select Recipients ({selectedIds.length}/{users.length}):
            </label>
            <div className="flex-1 min-h-[160px] max-h-48 overflow-y-auto bg-white border border-[#7f9db9] p-1.5 space-y-1.5">
              {groups.map((grp) => {
                const groupUsers = users.filter((u) => u.group === grp.id);
                if (groupUsers.length === 0) return null;
                return (
                  <div key={grp.id}>
                    <div className="text-[11px] font-bold text-slate-700 bg-gray-100 px-1 py-0.5">
                      ▾ {grp.name}
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
                Select All
              </button>
              <button
                type="button"
                onClick={handleSelectNone}
                className="px-2 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-[11px] cursor-pointer"
              >
                Select None
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
            Send
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
          >
            Cancel
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

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendPublicMessage(trimmed);
    setText('');
  };

  return (
    <WindowFrame
      title="Public Chat - LAN Multicast Room (239.255.100.100)"
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
              <span>Participants ({users.length + 1})</span>
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
                      {u.name} {u.id === localUser.id ? '(You)' : ''}
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
            placeholder="Send message to Public Chat Room..."
            className="flex-1 bg-white border border-[#7f9db9] px-2 py-1.5 text-xs focus:outline-none focus:border-[#0054e3]"
          />
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-1.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold text-xs cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 3. File Transfers Window (lmcTransferWindow)
export const TransferWindowModal: React.FC<{
  transfers: FileTransferItem[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
  onClearCompleted: () => void;
  onClose: () => void;
}> = ({ transfers, onAccept, onDecline, onCancel, onClearCompleted, onClose }) => {
  return (
    <WindowFrame
      title="File Transfers"
      icon="/resources/images/transfer.png"
      onClose={onClose}
      widthClass="max-w-xl w-full"
    >
      <div className="flex flex-col h-[380px]">
        <div className="px-2.5 py-1.5 bg-[#f5f4ee] border-b border-[#aca899] flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Active & Completed Transfers ({transfers.length})
          </span>
          <button
            type="button"
            onClick={onClearCompleted}
            className="px-2.5 py-0.5 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
          >
            Clear List
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white divide-y divide-gray-200">
          {transfers.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
              No file transfers recorded.
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
                        {tr.mode === 'send' ? `To ${tr.peerName}` : `From ${tr.peerName}`}
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
                          title="Accept"
                          className="p-1 bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 rounded cursor-pointer"
                        >
                          <img src="/resources/images/accept.png" alt="Accept" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDecline(tr.id)}
                          title="Decline"
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
                        title="Cancel"
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-400 text-[11px] rounded cursor-pointer"
                      >
                        Cancel
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
            Close
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

  const filtered = history.filter(
    (h) =>
      h.peerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.messages.some((m) => m.text.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const selectedRecord = filtered.find((h) => h.id === selectedId) || filtered[0];

  return (
    <WindowFrame
      title="Message History"
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
            placeholder="Filter conversations by user or keyword..."
            className="w-64 bg-white border border-[#7f9db9] px-2 py-1 text-xs focus:outline-none focus:border-[#0054e3]"
          />
          <button
            type="button"
            onClick={onClearHistory}
            className="px-3 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
          >
            Clear History
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left Tree: Conversation list */}
          <div className="w-60 bg-white border-r border-[#aca899] overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="p-4 text-xs text-gray-400 italic text-center">No saved history</div>
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
                Select a conversation on the left to inspect its message log.
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
            Close
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 5. User Info Window (lmcUserInfoWindow)
export const UserInfoWindowModal: React.FC<{
  user: User;
  onClose: () => void;
}> = ({ user, onClose }) => {
  const [tab, setTab] = useState<'general' | 'system'>('general');
  const st = STATUS_LIST.find((s) => s.code === user.status) || STATUS_LIST[0];

  return (
    <WindowFrame
      title={`${user.name} - User Information`}
      icon="/resources/images/usersettings.png"
      onClose={onClose}
      widthClass="max-w-lg w-full"
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
            General & Personal
          </button>
          <button
            type="button"
            onClick={() => setTab('system')}
            className={`px-3 py-1 text-xs font-semibold border-t border-x rounded-t cursor-pointer ${
              tab === 'system'
                ? 'bg-white border-[#aca899] text-slate-900'
                : 'bg-[#e1dfd2] border-transparent text-gray-600'
            }`}
          >
            System & OpenSSL Crypto
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
                  <span>{st.label}</span>
                </div>
                {user.note && <div className="text-gray-500 italic mt-0.5">"{user.note}"</div>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-gray-600">First Name:</span>
              <span className="col-span-2">{user.firstName || 'N/A'}</span>

              <span className="font-semibold text-gray-600">Last Name:</span>
              <span className="col-span-2">{user.lastName || 'N/A'}</span>

              <span className="font-semibold text-gray-600">About:</span>
              <span className="col-span-2">{user.about || 'No description provided.'}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#aca899] p-3 space-y-2.5 text-xs">
            <div className="grid grid-cols-3 gap-1.5">
              <span className="font-semibold text-gray-600">IP Address:</span>
              <span className="col-span-2 font-mono">{user.address}</span>

              <span className="font-semibold text-gray-600">Host Name:</span>
              <span className="col-span-2 font-mono">{user.hostName}</span>

              <span className="font-semibold text-gray-600">Logon Name:</span>
              <span className="col-span-2 font-mono">{user.logonName}</span>

              <span className="font-semibold text-gray-600">Operating System:</span>
              <span className="col-span-2">{user.osName}</span>

              <span className="font-semibold text-gray-600">LMC Version:</span>
              <span className="col-span-2">{user.version}</span>

              <span className="font-semibold text-gray-600">Crypto Stack:</span>
              <span className="col-span-2 font-semibold text-blue-800">{user.opensslVersion}</span>

              <span className="font-semibold text-gray-600">RSA Key Size:</span>
              <span className="col-span-2">
                {user.rsaBits}-bit ({user.rsaBits === 1024 ? '128B OAEP Envelope' : '256B OAEP Envelope'})
              </span>
            </div>

            <div>
              <div className="font-semibold text-gray-600 mb-1">Peer Public Key PEM:</div>
              <pre className="bg-slate-900 text-emerald-400 p-2 rounded text-[10px] font-mono overflow-x-auto max-h-28">
                {user.publicKeyPem}
              </pre>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold text-xs cursor-pointer"
          >
            OK
          </button>
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

  const categories = [
    { name: 'General', icon: '/resources/images/systemsettings.png' },
    { name: 'Account', icon: '/resources/images/usersettings.png' },
    { name: 'Messages', icon: '/resources/images/messagesettings.png' },
    { name: 'History', icon: '/resources/images/historysettings.png' },
    { name: 'Alerts', icon: '/resources/images/alertsettings.png' },
    { name: 'Network', icon: '/resources/images/networksettings.png' },
    { name: 'File Transfer', icon: '/resources/images/transfersettings.png' },
    { name: 'Theme', icon: '/resources/images/themesettings.png' },
    { name: 'Hotkeys', icon: '/resources/images/hotkeysettings.png' },
  ];

  // Sample messages for Theme live preview (matching lmcSettingsDialog::cboTheme_currentIndexChanged)
  const samplePreviewMessages: ChatMessage[] = [
    {
      id: 'prev-1',
      type: 'message',
      senderId: 'jack',
      senderName: 'Jack',
      recipientId: localUser.id,
      text: 'Hello, this is an incoming message.',
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
      text: 'Hello, this is a consecutive incoming message :-)',
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
      text: 'This is a broadcast message!',
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
      text: 'Hi, this is an outgoing message (Y)',
      timestamp: Date.now() - 60000,
      protocolMode: draft.protocolMode,
      wireHeader: draft.protocolMode === 'Legacy v1.0' ? 'MESSAG' : 'MSGv30',
      xmlPayload: '',
      encryptedHex: '',
    },
  ];

  const handleSave = () => {
    onSaveSettings(draft);
    onClose();
  };

  return (
    <WindowFrame
      title="Preferences - LAN Messenger"
      icon="/resources/images/tools.png"
      onClose={onClose}
      widthClass="max-w-2xl w-full"
    >
      <div className="p-3 flex flex-col h-[470px]">
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Left Category List (ui.lvCategories) */}
          <div className="w-40 bg-white border border-[#7f9db9] overflow-y-auto p-1 space-y-0.5 shrink-0">
            {categories.map((cat, idx) => (
              <button
                key={cat.name}
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
                  <legend className="font-semibold px-1 text-slate-700">System</legend>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.autoStart}
                        onChange={(e) => setDraft({ ...draft, autoStart: e.target.checked })}
                      />
                      <span>Start LAN Messenger when computer starts</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.autoShow}
                        onChange={(e) => setDraft({ ...draft, autoShow: e.target.checked })}
                      />
                      <span>Show main window when LAN Messenger starts</span>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="border border-gray-300 p-2.5 rounded">
                  <legend className="font-semibold px-1 text-slate-700">System Tray</legend>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.showSysTray}
                        onChange={(e) => setDraft({ ...draft, showSysTray: e.target.checked })}
                      />
                      <span>Show system tray icon</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.minimizeToTray}
                        onChange={(e) => setDraft({ ...draft, minimizeToTray: e.target.checked })}
                      />
                      <span>Minimize main window to system tray</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.showSysTrayMsg}
                        onChange={(e) => setDraft({ ...draft, showSysTrayMsg: e.target.checked })}
                      />
                      <span>Display balloon notifications in system tray</span>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="border border-gray-300 p-2.5 rounded">
                  <legend className="font-semibold px-1 text-slate-700">Language</legend>
                  <select
                    value={draft.language}
                    onChange={(e) => setDraft({ ...draft, language: e.target.value })}
                    className="w-full border border-gray-400 px-2 py-1 bg-white"
                  >
                    <option value="en_US">English (United States)</option>
                    <option value="ko_KR">Korean (한국어)</option>
                    <option value="ja_JP">Japanese (日本語)</option>
                    <option value="de_DE">German (Deutsch)</option>
                    <option value="fr_FR">French (Français)</option>
                    <option value="es_ES">Spanish (Español)</option>
                    <option value="ru_RU">Russian (Русский)</option>
                  </select>
                </fieldset>
              </div>
            )}

            {/* 1: Account */}
            {categoryIdx === 1 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded space-y-2">
                  <legend className="font-semibold px-1 text-slate-700">Personal Details</legend>
                  <div>
                    <label className="block font-medium mb-0.5">User Name (Display Name):</label>
                    <input
                      type="text"
                      value={draft.userName}
                      onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
                      className="w-full border border-[#7f9db9] px-2 py-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium mb-0.5">First Name:</label>
                      <input
                        type="text"
                        value={draft.firstName}
                        onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                        className="w-full border border-[#7f9db9] px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-0.5">Last Name:</label>
                      <input
                        type="text"
                        value={draft.lastName}
                        onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                        className="w-full border border-[#7f9db9] px-2 py-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium mb-0.5">About:</label>
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
                  <legend className="font-semibold px-1 text-slate-700">Message Window</legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showEmoticons}
                      onChange={(e) => setDraft({ ...draft, showEmoticons: e.target.checked })}
                    />
                    <span>Show emoticons (smileys) in messages</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showMessageTime}
                      onChange={(e) => setDraft({ ...draft, showMessageTime: e.target.checked })}
                    />
                    <span>Show timestamp on messages</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pl-5">
                    <input
                      type="checkbox"
                      disabled={!draft.showMessageTime}
                      checked={draft.showMessageDate}
                      onChange={(e) => setDraft({ ...draft, showMessageDate: e.target.checked })}
                    />
                    <span>Show date with timestamp</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.allowLinks}
                      onChange={(e) => setDraft({ ...draft, allowLinks: e.target.checked })}
                    />
                    <span>Enable hyperlinks in messages</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.trimMessage}
                      onChange={(e) => setDraft({ ...draft, trimMessage: e.target.checked })}
                    />
                    <span>Remove leading and trailing spaces from messages</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showSendButton}
                      onChange={(e) => setDraft({ ...draft, showSendButton: e.target.checked })}
                    />
                    <span>Show Send button in chat window</span>
                  </label>
                </fieldset>

                <fieldset className="border border-gray-300 p-2.5 rounded space-y-2">
                  <legend className="font-semibold px-1 text-slate-700">Font & Size</legend>
                  <div className="flex items-center gap-2">
                    <span>Message Text Size:</span>
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
                      <option value="Small">Small</option>
                      <option value="Medium">Medium</option>
                      <option value="Large">Large</option>
                    </select>
                  </div>
                </fieldset>
              </div>
            )}

            {/* 3: History */}
            {categoryIdx === 3 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded space-y-2">
                  <legend className="font-semibold px-1 text-slate-700">Message History</legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.saveHistory}
                      onChange={(e) => setDraft({ ...draft, saveHistory: e.target.checked })}
                    />
                    <span>Save conversation history when chat window closes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.saveFileHistory}
                      onChange={(e) => setDraft({ ...draft, saveFileHistory: e.target.checked })}
                    />
                    <span>Save file transfer history</span>
                  </label>
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={onClearHistory}
                      className="px-3 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] cursor-pointer"
                    >
                      Clear Message History
                    </button>
                    <button
                      type="button"
                      onClick={onClearTransfers}
                      className="px-3 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] cursor-pointer"
                    >
                      Clear File History
                    </button>
                  </div>
                </fieldset>
              </div>
            )}

            {/* 4: Alerts */}
            {categoryIdx === 4 && (
              <div className="space-y-3">
                <fieldset className="border border-gray-300 p-2.5 rounded space-y-1.5">
                  <legend className="font-semibold px-1 text-slate-700">Notifications & Sounds</legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.showAlerts}
                      onChange={(e) => setDraft({ ...draft, showAlerts: e.target.checked })}
                    />
                    <span>Show status popup alerts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.noBusyAlert}
                      onChange={(e) => setDraft({ ...draft, noBusyAlert: e.target.checked })}
                    />
                    <span>Do not show alerts when I am Busy</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.enableSound}
                      onChange={(e) => setDraft({ ...draft, enableSound: e.target.checked })}
                    />
                    <span>Play sound effects on events</span>
                  </label>
                </fieldset>
              </div>
            )}

            {/* 5: Network */}
            {categoryIdx === 5 && (
              <div className="space-y-2.5">
                <fieldset className="border border-blue-400 bg-blue-50/40 p-2.5 rounded space-y-1.5">
                  <legend className="font-bold px-1 text-blue-900">
                    OpenSSL 3.0 ↔ 1.0 Protocol Compatibility
                  </legend>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Wire Header & RSA Key Encoding Mode:</span>
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
                    Multicast & Ports
                  </legend>
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <span>Multicast Group IP:</span>
                    <input
                      type="text"
                      value={draft.multicastAddress}
                      onChange={(e) => setDraft({ ...draft, multicastAddress: e.target.value })}
                      className="col-span-2 border border-[#7f9db9] px-2 py-1 font-mono"
                    />
                    <span>UDP Port:</span>
                    <input
                      type="number"
                      value={draft.udpPort}
                      onChange={(e) =>
                        setDraft({ ...draft, udpPort: Number(e.target.value) || 50000 })
                      }
                      className="col-span-2 border border-[#7f9db9] px-2 py-1 font-mono"
                    />
                    <span>TCP Port:</span>
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
                    <div className="font-medium mb-1">Broadcast Address List:</div>
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
                        Add
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
                  <legend className="font-semibold px-1 text-slate-700">File Reception</legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.autoReceiveFile}
                      onChange={(e) => setDraft({ ...draft, autoReceiveFile: e.target.checked })}
                    />
                    <span>Automatically accept incoming files</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.autoShowTransferWindow}
                      onChange={(e) =>
                        setDraft({ ...draft, autoShowTransferWindow: e.target.checked })
                      }
                    />
                    <span>Show File Transfers window automatically when transfer starts</span>
                  </label>
                  <div className="pt-2">
                    <label className="block font-medium mb-0.5">Received Files Folder:</label>
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium mb-0.5">Chat Theme:</label>
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
                    <label className="block font-medium mb-0.5">Contact List View:</label>
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
                      <option value="Detailed">Detailed View (36px with Avatars & Notes)</option>
                      <option value="Compact">Compact View (20px)</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 flex flex-col border border-gray-400 rounded overflow-hidden min-h-[190px]">
                  <div className="px-2 py-1 bg-gray-100 border-b border-gray-300 text-[11px] font-semibold text-gray-600">
                    Theme Preview ({draft.theme})
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
                  <legend className="font-semibold px-1 text-slate-700">Send Message Key</legend>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!draft.sendKeyModCtrlEnter}
                      onChange={() => setDraft({ ...draft, sendKeyModCtrlEnter: false })}
                    />
                    <span>Press Enter to send message (Ctrl+Enter inserts new line)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={draft.sendKeyModCtrlEnter}
                      onChange={() => setDraft({ ...draft, sendKeyModCtrlEnter: true })}
                    />
                    <span>Press Ctrl+Enter to send message (Enter inserts new line)</span>
                  </label>
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
            Reset Preferences
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold text-xs cursor-pointer"
            >
              OK
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#7f9db9] text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
};

// 9. About Dialog (lmcAboutDialog)
export const AboutDialogModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const [tab, setTab] = useState<'about' | 'thanks' | 'license'>('about');

  return (
    <WindowFrame
      title="About LAN Messenger"
      icon="/resources/images/logo.png"
      onClose={onClose}
      widthClass="max-w-md w-full"
    >
      <div className="p-3.5 text-xs">
        <div className="flex items-center gap-3 mb-3">
          <img src="/resources/images/logo.png" alt="LAN Messenger" className="w-12 h-12" />
          <div>
            <div className="font-bold text-sm text-slate-900">LAN Messenger v1.3.0</div>
            <div className="text-gray-600">
              Based on v1.2.39 • OpenSSL 3.0 ↔ 1.0 Compat & Remote Desktop
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
            About
          </button>
          <button
            type="button"
            onClick={() => setTab('thanks')}
            className={`px-3 py-1 font-semibold border-t border-x rounded-t mr-1 cursor-pointer ${
              tab === 'thanks' ? 'bg-white border-[#aca899]' : 'bg-[#e1dfd2] border-transparent'
            }`}
          >
            Thanks
          </button>
          <button
            type="button"
            onClick={() => setTab('license')}
            className={`px-3 py-1 font-semibold border-t border-x rounded-t cursor-pointer ${
              tab === 'license' ? 'bg-white border-[#aca899]' : 'bg-[#e1dfd2] border-transparent'
            }`}
          >
            License
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
            Close
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};

// 10. Update Window (lmcUpdateWindow -> GitHub Releases API tag_name check)
export const UpdateWindowModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const CURRENT_VERSION = '1.3.0';
  const GITHUB_RELEASES_API = 'https://api.github.com/repos/yjhone1/lan-messenger/releases/latest';

  const [status, setStatus] = useState<'check' | 'latest' | 'new' | 'error'>('check');
  const [webVersion, setWebVersion] = useState<string>('');
  const [rawTag, setRawTag] = useState<string>('');

  const compareVersions = (v1Str: string, v2Str: string): number => {
    const clean1 = v1Str.trim().replace(/^v/i, '');
    const clean2 = v2Str.trim().replace(/^v/i, '');
    const p1 = clean1.split('.').map((n) => parseInt(n, 10) || 0);
    const p2 = clean2.split('.').map((n) => parseInt(n, 10) || 0);
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

      if (compareVersions(normalized, CURRENT_VERSION) > 0) {
        setStatus('new');
      } else {
        setStatus('latest');
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <WindowFrame
      title="LAN Messenger updates"
      icon="/resources/images/logo.png"
      onClose={onClose}
      widthClass="max-w-md w-full"
    >
      <div className="p-3.5 text-xs space-y-3">
        <div className="bg-white border border-[#aca899] p-3 min-h-[96px] flex flex-col justify-between">
          <div className="font-medium text-slate-900">
            {status === 'check' && 'Launching an update request...'}
            {status === 'error' && 'An error occured while checking for updates.'}
            {status === 'new' &&
              `The new version ${webVersion} is available on LAN Messenger web site.`}
            {status === 'latest' && 'You have the latest version of LAN Messenger.'}
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
            onClick={checkForUpdates}
            className="px-4 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] disabled:opacity-50 border border-[#7f9db9] cursor-pointer"
          >
            Recheck
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1 bg-[#e1dfd2] hover:bg-[#d5d2c3] border border-[#0054e3] font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </WindowFrame>
  );
};
