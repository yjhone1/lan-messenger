import React, { useState, useRef, useEffect } from 'react';
import {
  ChatMessage,
  ChatStateType,
  LmcSettings,
  ProtocolHeaderMode,
  SMILEY_LIST,
  STATUS_LIST,
  StatusTypeEnum,
  ThemeName,
  User,
  UserCap,
} from '../types/lmc';

interface ChatWindowProps {
  localUser: User;
  peer: User;
  messages: ChatMessage[];
  settings: LmcSettings;
  connected: boolean;
  peerChatState: ChatStateType;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onSendMessage: (
    peerId: string,
    text: string,
    fontFamily: string,
    fontSize: number,
    fontColor: string,
    protocolMode: ProtocolHeaderMode
  ) => void;
  onSendFile: (peerId: string, isFolder: boolean, customFileName?: string, customFileSize?: number) => void;
  onFileAction: (transferId: string, messageId: string, action: 'accept' | 'decline' | 'cancel') => void;
  onStartRemoteDesktop: (peerId: string) => void;
  onOpenHistory: () => void;
  onOpenTransfers: () => void;
  onToggleProtocolMode: (newMode: ProtocolHeaderMode) => void;
  onSimulateIncomingMessage?: (peerId: string) => void;
}

const FONT_FAMILIES = ['Tahoma', 'Segoe UI', 'Arial', 'Verdana', 'Courier New', 'Georgia', 'Trebuchet MS'];
const PRESET_COLORS = [
  '#000000',
  '#1e3a8a',
  '#047857',
  '#b91c1c',
  '#6d28d9',
  '#c2410c',
  '#0f766e',
  '#4b5563',
];

export function renderTextWithSmileysAndLinks(
  text: string,
  showEmoticons: boolean,
  allowLinks: boolean
): React.ReactNode {
  if (!text) return null;

  // Tokenize smileys if enabled
  let segments: (string | { type: 'smiley'; src: string; alt: string })[] = [text];

  if (showEmoticons) {
    // Sort smileys by code length descending to avoid partial matches
    const sortedSmileys = [...SMILEY_LIST].sort((a, b) => b.code.length - a.code.length);
    for (const smiley of sortedSmileys) {
      const codesToMatch = [smiley.code, ...(smiley.altCode ? [smiley.altCode] : [])];
      for (const code of codesToMatch) {
        const nextSegments: typeof segments = [];
        for (const seg of segments) {
          if (typeof seg !== 'string') {
            nextSegments.push(seg);
            continue;
          }
          const parts = seg.split(code);
          for (let i = 0; i < parts.length; i++) {
            if (parts[i]) nextSegments.push(parts[i]);
            if (i < parts.length - 1) {
              nextSegments.push({ type: 'smiley', src: smiley.image, alt: smiley.code });
            }
          }
        }
        segments = nextSegments;
      }
    }
  }

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return segments.map((seg, idx) => {
    if (typeof seg !== 'string') {
      return (
        <img
          key={`sm-${idx}`}
          src={seg.src}
          alt={seg.alt}
          title={seg.alt}
          className="inline-block w-[18px] h-[18px] align-text-bottom mx-0.5"
        />
      );
    }

    if (!allowLinks) {
      return <React.Fragment key={`txt-${idx}`}>{seg}</React.Fragment>;
    }

    const parts = seg.split(urlRegex);
    return (
      <React.Fragment key={`txt-${idx}`}>
        {parts.map((part, pIdx) => {
          if (urlRegex.test(part)) {
            return (
              <a
                key={`lnk-${pIdx}`}
                href={part}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                {part}
              </a>
            );
          }
          return part;
        })}
      </React.Fragment>
    );
  });
}

export const ThemedMessageLog: React.FC<{
  messages: ChatMessage[];
  localUser: User;
  peer: User;
  settings: LmcSettings;
  themeOverride?: ThemeName;
  peerChatState?: ChatStateType;
  onFileAction?: (transferId: string, messageId: string, action: 'accept' | 'decline' | 'cancel') => void;
}> = ({
  messages,
  localUser,
  peer,
  settings,
  themeOverride,
  peerChatState = 'active',
  onFileAction,
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const activeTheme = themeOverride || settings.theme;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, peerChatState]);

  const formatTimestamp = (ts: number) => {
    if (!settings.showMessageTime) return '';
    const d = new Date(ts);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (settings.showMessageDate) {
      const dateStr = d.toLocaleDateString();
      return `${dateStr} ${timeStr}`;
    }
    return timeStr;
  };

  const fontSizePx =
    settings.fontSize === 'Small' ? '11px' : settings.fontSize === 'Large' ? '14px' : '12px';

  // Group consecutive messages by same sender if type === 'message'
  const groupedMessages: {
    primary: ChatMessage;
    items: ChatMessage[];
  }[] = [];

  for (const msg of messages) {
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (
      lastGroup &&
      msg.type === 'message' &&
      lastGroup.primary.type === 'message' &&
      lastGroup.primary.senderId === msg.senderId
    ) {
      lastGroup.items.push(msg);
    } else {
      groupedMessages.push({ primary: msg, items: [msg] });
    }
  }

  return (
    <div
      className={`flex-1 overflow-y-auto p-2.5 select-text ${
        activeTheme === 'Dark Bubble' ? 'bg-[#121212] text-white' : 'bg-white text-black'
      }`}
      style={{ fontSize: fontSizePx }}
    >
      {groupedMessages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs italic">
          <span>Encrypted P2P session active ({peer.opensslVersion})</span>
          <span className="text-[11px] mt-0.5">
            Active Wire Framing: {settings.protocolMode} ({settings.protocolMode === 'Legacy v1.0' ? 'PKCS#1 / MESSAG' : 'SPKI / MSGv30'})
          </span>
        </div>
      )}

      <div className="space-y-2">
        {groupedMessages.map((group) => {
          const msg = group.primary;
          const isOutgoing = msg.senderId === localUser.id;
          const avatarSrc = isOutgoing ? localUser.avatarPath : peer.avatarPath;

          // System / Error messages
          if (msg.type === 'system' || msg.type === 'error') {
            return (
              <div
                key={msg.id}
                className={`px-2.5 py-1.5 rounded border text-xs flex items-center gap-2 ${
                  msg.type === 'error'
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-[#EAEAFF] border-[#c5c5f0] text-slate-800'
                }`}
              >
                <img
                  src={
                    msg.type === 'error'
                      ? '/resources/images/criticalmsg.png'
                      : '/resources/images/info.png'
                  }
                  alt=""
                  className="w-4 h-4 shrink-0"
                />
                <span>{msg.text}</span>
              </div>
            );
          }

          // Broadcast message
          if (msg.type === 'broadcast') {
            return (
              <div
                key={msg.id}
                className="border border-[#938F5A] rounded bg-gradient-to-b from-[#edffea] to-[#d3f4cc] p-2 text-slate-900 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-[#b6d9af] pb-1 mb-1 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <img src="/resources/images/broadcastmsg.png" alt="" className="w-4 h-4" />
                    <span>Broadcast from {msg.senderName}:</span>
                  </div>
                  <span className="text-[11px] text-gray-600 font-normal">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
                <div className="pl-5 text-xs">
                  {renderTextWithSmileysAndLinks(msg.text, settings.showEmoticons, settings.allowLinks)}
                </div>
              </div>
            );
          }

          // File or Folder Transfer Request
          if (msg.type === 'file' || msg.type === 'folder') {
            const kb = msg.fileSize ? (msg.fileSize / 1024).toFixed(1) : '0';
            return (
              <div
                key={msg.id}
                className="border border-blue-200 bg-blue-50/70 rounded p-2 text-xs text-slate-800"
              >
                <div className="flex items-start gap-2">
                  <img
                    src={
                      msg.isFolder
                        ? '/resources/images/sendfolder.png'
                        : '/resources/images/filemsg.png'
                    }
                    alt=""
                    className="w-5 h-5 mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-600">
                      {msg.fileMode === 'send'
                        ? `Sending ${msg.isFolder ? 'folder' : 'file'} to ${peer.name}:`
                        : `${msg.senderName} is offering a ${msg.isFolder ? 'folder' : 'file'}:`}
                    </div>
                    <div className="text-blue-700 font-semibold truncate mt-0.5">
                      {msg.fileName} ({kb} KB)
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      {msg.fileOp === 'request' && msg.fileMode === 'receive' && onFileAction && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onFileAction(msg.fileTransferId || msg.id, msg.id, 'accept')
                            }
                            className="text-green-700 font-semibold underline hover:text-green-900 cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onFileAction(msg.fileTransferId || msg.id, msg.id, 'decline')
                            }
                            className="text-red-700 font-semibold underline hover:text-red-900 cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {msg.fileOp === 'request' && msg.fileMode === 'send' && onFileAction && (
                        <button
                          type="button"
                          onClick={() =>
                            onFileAction(msg.fileTransferId || msg.id, msg.id, 'cancel')
                          }
                          className="text-red-700 font-semibold underline hover:text-red-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      {msg.fileOp === 'accept' && (
                        <span className="text-blue-700 italic">Transferring file over TCP stream...</span>
                      )}
                      {msg.fileOp === 'complete' && (
                        <span className="text-green-700 font-medium">
                          ✓ File transfer completed successfully.
                        </span>
                      )}
                      {msg.fileOp === 'decline' && (
                        <span className="text-red-700 italic">File transfer declined.</span>
                      )}
                      {msg.fileOp === 'cancel' && (
                        <span className="text-gray-600 italic">File transfer cancelled.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Theme 1: Bubble (Yellow gradient outgoing, Crisp white incoming with olive border)
          if (activeTheme === 'Bubble') {
            return (
              <div
                key={msg.id}
                className={`border border-[#938F5A] rounded px-2.5 py-1.5 ${
                  isOutgoing
                    ? 'bg-gradient-to-b from-[#FFFEEA] to-[#F2F4CC]'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-2">
                  <img
                    src={avatarSrc}
                    alt=""
                    className="w-8 h-8 rounded-xs border border-gray-300 shrink-0 mt-0.5 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between border-b border-[#CDCDCD] pb-0.5 mb-1">
                      <span className="font-bold text-slate-900">{msg.senderName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1 bg-black/5 rounded text-gray-600">
                          {msg.wireHeader}
                        </span>
                        <span className="text-[11px] text-[#777777]">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className={idx > 0 ? 'pt-1 border-t border-dotted border-gray-300' : ''}
                          style={{
                            fontFamily: item.fontFamily || settings.fontFamily,
                            color: item.fontColor || settings.fontColor,
                          }}
                        >
                          {renderTextWithSmileysAndLinks(
                            item.text,
                            settings.showEmoticons,
                            settings.allowLinks
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Theme 2: Dark Bubble (Red border, black-to-navy outgoing, black-to-green incoming)
          if (activeTheme === 'Dark Bubble') {
            return (
              <div
                key={msg.id}
                className={`border border-[#ff0000] rounded px-2.5 py-1.5 text-white ${
                  isOutgoing
                    ? 'bg-gradient-to-b from-black to-[#000055]'
                    : 'bg-gradient-to-b from-black to-[#005500]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <img
                    src={avatarSrc}
                    alt=""
                    className="w-8 h-8 rounded-xs border border-gray-500 shrink-0 mt-0.5 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between border-b border-[#CDCDCD] pb-0.5 mb-1">
                      <span className="font-bold text-white">{msg.senderName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1 bg-white/15 rounded text-gray-200">
                          {msg.wireHeader}
                        </span>
                        <span className="text-[11px] text-[#CCCCCC]">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className={idx > 0 ? 'pt-1 border-t border-white/20' : ''}
                          style={{
                            fontFamily: item.fontFamily || settings.fontFamily,
                          }}
                        >
                          {renderTextWithSmileysAndLinks(
                            item.text,
                            settings.showEmoticons,
                            settings.allowLinks
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Theme 3: Digg (Green/Blue left accent cards)
          if (activeTheme === 'Digg') {
            return (
              <div
                key={msg.id}
                className={`border-l-4 rounded-r px-2.5 py-1.5 ${
                  isOutgoing
                    ? 'border-[#3b5998] bg-[#f4f7fc]'
                    : 'border-[#5b9a28] bg-[#f6fbf2]'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <img src={avatarSrc} alt="" className="w-5 h-5 rounded-xs object-cover" />
                    <span
                      className={`font-bold ${
                        isOutgoing ? 'text-[#2b4478]' : 'text-[#3e6e18]'
                      }`}
                    >
                      {msg.senderName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-gray-500">{msg.wireHeader}</span>
                    <span className="text-[11px] text-gray-500">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 pl-6">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        fontFamily: item.fontFamily || settings.fontFamily,
                        color: item.fontColor || settings.fontColor,
                      }}
                    >
                      {renderTextWithSmileysAndLinks(
                        item.text,
                        settings.showEmoticons,
                        settings.allowLinks
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Theme 4: Ping Pong (Alternating left/right alignment)
          if (activeTheme === 'Ping Pong') {
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-7 h-7 rounded-full border border-gray-300 shrink-0 object-cover"
                />
                <div
                  className={`max-w-[82%] rounded-lg px-2.5 py-1.5 border ${
                    isOutgoing
                      ? 'bg-[#e8f0fe] border-[#bdd2f7] text-right'
                      : 'bg-[#f3f4f6] border-gray-300 text-left'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] text-gray-600 border-b border-black/10 pb-0.5 mb-1">
                    <span className="font-bold text-slate-800">{msg.senderName}</span>
                    <span>
                      {msg.wireHeader} • {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          fontFamily: item.fontFamily || settings.fontFamily,
                          color: item.fontColor || settings.fontColor,
                        }}
                      >
                        {renderTextWithSmileysAndLinks(
                          item.text,
                          settings.showEmoticons,
                          settings.allowLinks
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Default Theme: Classic (LAN Messenger Classic table layout)
          return (
            <div key={msg.id} className="border-b border-gray-100 pb-1.5 last:border-none">
              <div className="flex items-baseline justify-between">
                <span
                  className="font-bold"
                  style={{ color: isOutgoing ? '#004080' : '#800000' }}
                >
                  {msg.senderName} says:
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      msg.protocolMode === 'Legacy v1.0'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    }`}
                    title={`Framed with ${msg.wireHeader} (${msg.protocolMode})`}
                  >
                    {msg.wireHeader}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              </div>
              <div className="pl-3 mt-0.5 space-y-1">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      fontFamily: item.fontFamily || settings.fontFamily,
                      color: item.fontColor || settings.fontColor,
                    }}
                  >
                    {renderTextWithSmileysAndLinks(
                      item.text,
                      settings.showEmoticons,
                      settings.allowLinks
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ChatState Composing / Paused indicator */}
      {peerChatState === 'composing' && (
        <div className="mt-2 text-[11px] text-gray-500 italic flex items-center gap-1.5">
          <img src="/resources/images/paint.png" alt="" className="w-3.5 h-3.5" />
          <span>{peer.name} is typing a message...</span>
        </div>
      )}
      {peerChatState === 'paused' && (
        <div className="mt-2 text-[11px] text-gray-400 italic">
          <span>{peer.name} has entered text.</span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  localUser,
  peer,
  messages,
  settings,
  connected,
  peerChatState,
  isActive,
  onFocus,
  onClose,
  onSendMessage,
  onSendFile,
  onFileAction,
  onStartRemoteDesktop,
  onOpenHistory,
  onOpenTransfers,
  onToggleProtocolMode,
  onSimulateIncomingMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [fontFamily, setFontFamily] = useState(settings.fontFamily || 'Tahoma');
  const [fontSize, setFontSize] = useState<number>(12);
  const [fontColor, setFontColor] = useState(settings.fontColor || '#000000');

  const [showSmileyPicker, setShowSmileyPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const peerStatusMeta =
    STATUS_LIST.find((s) => s.code === peer.status) || STATUS_LIST[0];

  const legacyCompatMode = settings.protocolMode === 'Legacy v1.0';

  const handleSend = () => {
    const text = settings.trimMessage ? inputText.trim() : inputText;
    if (!text) return;
    onSendMessage(peer.id, text, fontFamily, fontSize, fontColor, settings.protocolMode);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      const ctrlPressed = e.ctrlKey || e.metaKey;
      if (settings.sendKeyModCtrlEnter) {
        if (ctrlPressed) {
          e.preventDefault();
          handleSend();
        }
      } else {
        if (!e.shiftKey && !ctrlPressed) {
          e.preventDefault();
          handleSend();
        }
      }
    }
  };

  const handleSaveConversation = () => {
    if (messages.length === 0) return;
    const lines = messages.map((m) => {
      const dt = new Date(m.timestamp).toLocaleString();
      return `[${dt}] (${m.wireHeader}) ${m.senderName}: ${m.text}`;
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${peer.name.replace(/\s+/g, '_')}_Conversation.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      onSendFile(peer.id, false, f.name, f.size);
    }
    e.target.value = '';
  };

  // Determine status bar warning message (matching lmcChatWindow::showStatus in chatwindow.cpp)
  let statusWarning: { text: string; color: string } | null = null;
  if (!connected) {
    statusWarning = { text: 'You are no longer connected.', color: 'rgb(96,96,96)' };
  } else if (peerStatusMeta.type === StatusTypeEnum.StatusTypeOffline) {
    statusWarning = { text: `${peer.name} is offline.`, color: 'rgb(96,96,96)' };
  } else if (peerStatusMeta.type === StatusTypeEnum.StatusTypeAway) {
    statusWarning = { text: `${peer.name} is away.`, color: 'rgb(255,115,0)' };
  } else if (peerStatusMeta.type === StatusTypeEnum.StatusTypeBusy) {
    statusWarning = {
      text: `${peer.name} is busy. You may be interrupting.`,
      color: 'rgb(192,0,0)',
    };
  }

  // Warn if Strict v3.0 is selected while talking to an OpenSSL 1.0 legacy peer
  const isStrictMismatchWithLegacyPeer =
    !legacyCompatMode && peer.opensslVersion.includes('OpenSSL 1.0');

  return (
    <div
      onClick={onFocus}
      className={`flex flex-col bg-[#ece9d8] border-2 rounded-t-md shadow-xl overflow-hidden transition-shadow ${
        isActive ? 'border-[#0054e3] ring-1 ring-[#0054e3]/30' : 'border-[#7a96df]'
      }`}
    >
      {/* Classic Window Titlebar */}
      <div
        className={`h-7 px-2 flex items-center justify-between text-white select-none ${
          isActive
            ? 'bg-gradient-to-r from-[#0054e3] via-[#2673f2] to-[#0046c7]'
            : 'bg-gradient-to-r from-[#7a96df] to-[#5f7bc2]'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <img src={peerStatusMeta.bubbleIcon} alt="" className="w-4 h-4 shrink-0" />
          <span className="font-bold text-xs truncate">
            {peer.name} - Conversation
          </span>
          <span className="text-[10px] opacity-85 truncate hidden sm:inline">
            ({peer.address} • {peer.opensslVersion.split(' ')[0]} {peer.opensslVersion.split(' ')[1]})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onSimulateIncomingMessage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSimulateIncomingMessage(peer.id);
              }}
              title="Simulate incoming encrypted reply from this peer"
              className="px-1.5 py-0.5 text-[10px] bg-white/20 hover:bg-white/30 rounded text-white cursor-pointer"
            >
              Simulate Reply
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close (Esc)"
            className="w-5 h-5 flex items-center justify-center rounded-xs bg-[#e04343] hover:bg-[#f05454] border border-white/40 text-white font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Top Participant Header Bar */}
      <div className="px-2.5 py-1.5 bg-[#f5f4ee] border-b border-[#d4d0c8] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={peer.avatarPath}
            alt={peer.name}
            className="w-9 h-9 rounded border border-gray-400 bg-white object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-slate-900 truncate">{peer.name}</span>
              <span className="text-[11px] text-gray-600">({peerStatusMeta.label})</span>
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              {peer.note || `${peer.osName} • RSA-${peer.rsaBits} • AES-256-CBC`}
            </div>
          </div>
        </div>

        {/* Encryption Session Badge */}
        <div className="text-right shrink-0">
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-[10px] font-medium text-emerald-800">
            <span>🔒 RSA-{peer.rsaBits} OAEP + AES-256</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Envelope: {peer.rsaBits === 1024 ? '128B (v1.3.3)' : '256B (v3.0)'}
          </div>
        </div>
      </div>

      {/* Message Log (pMessageLog) */}
      <ThemedMessageLog
        messages={messages}
        localUser={localUser}
        peer={peer}
        settings={settings}
        peerChatState={peerChatState}
        onFileAction={onFileAction}
      />

      {/* Info / Status Label (ui.lblInfo) */}
      {statusWarning && (
        <div
          className="px-2.5 py-1 bg-white border-t border-gray-300 text-xs font-medium flex items-center gap-1.5"
          style={{ color: statusWarning.color }}
        >
          <img src="/resources/images/info.png" alt="" className="w-3.5 h-3.5" />
          <span>{statusWarning.text}</span>
        </div>
      )}

      {/* OpenSSL 1.0 Strict v3.0 Warning Banner if user toggles Strict v3.0 on a Legacy 1.0 peer */}
      {isStrictMismatchWithLegacyPeer && (
        <div className="px-2.5 py-1 bg-amber-50 border-t border-amber-300 text-[11px] text-amber-900 flex items-center justify-between">
          <span>
            ⚠️ Peer runs <b>OpenSSL 1.0.2u</b> (`PEM_read_bio_RSAPublicKey`). `Strict v3.0` sends SPKI first; dual-PEM fallback keeps peer alive, or switch to `Legacy v1.0`.
          </span>
          <button
            type="button"
            onClick={() => onToggleProtocolMode('Legacy v1.0')}
            className="ml-2 px-1.5 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-[10px] font-semibold cursor-pointer shrink-0"
          >
            Use Legacy v1.0
          </button>
        </div>
      )}

      {/* Divider Top */}
      <div className="h-[1px] bg-white" />

      {/* Chat Toolbar (ui.wgtToolBar: pLeftBar + pRightBar) */}
      <div className="relative px-1.5 py-1 bg-[#ece9d8] border-y border-[#aca899] flex items-center justify-between gap-1">
        {/* Left Toolbar */}
        <div className="flex items-center gap-0.5">
          {/* Change Font */}
          <button
            type="button"
            onClick={() => {
              setShowFontPicker((v) => !v);
              setShowColorPicker(false);
              setShowSmileyPicker(false);
            }}
            title="Change message font"
            className="p-1 rounded hover:bg-[#d6d2c2] active:bg-[#c5c1b0] border border-transparent hover:border-[#aca899] cursor-pointer"
          >
            <img src="/resources/images/font.png" alt="Font" className="w-4 h-4" />
          </button>

          {/* Change Color */}
          <button
            type="button"
            onClick={() => {
              setShowColorPicker((v) => !v);
              setShowFontPicker(false);
              setShowSmileyPicker(false);
            }}
            title="Change message text color"
            className="p-1 rounded hover:bg-[#d6d2c2] active:bg-[#c5c1b0] border border-transparent hover:border-[#aca899] cursor-pointer"
          >
            <img src="/resources/images/fontcolor.png" alt="Color" className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-[#aca899] mx-0.5" />

          {/* Insert Smiley */}
          <button
            type="button"
            onClick={() => {
              setShowSmileyPicker((v) => !v);
              setShowFontPicker(false);
              setShowColorPicker(false);
            }}
            title="Insert Smiley"
            className="p-1 rounded hover:bg-[#d6d2c2] active:bg-[#c5c1b0] border border-transparent hover:border-[#aca899] cursor-pointer"
          >
            <img src="/resources/images/smiley.png" alt="Smiley" className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-[#aca899] mx-0.5" />

          {/* Send A File */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <button
            type="button"
            disabled={(peer.caps & UserCap.UC_File) !== UserCap.UC_File}
            onClick={() => fileInputRef.current?.click()}
            title={`Send a file to ${peer.name}`}
            className="p-1 rounded hover:bg-[#d6d2c2] active:bg-[#c5c1b0] border border-transparent hover:border-[#aca899] disabled:opacity-40 cursor-pointer"
          >
            <img src="/resources/images/file.png" alt="Send File" className="w-4 h-4" />
          </button>

          {/* Send A Folder */}
          <button
            type="button"
            disabled={(peer.caps & UserCap.UC_Folder) !== UserCap.UC_Folder}
            onClick={() => onSendFile(peer.id, true, 'project_release_v1.2.10/', 2457600)}
            title={`Send a folder to ${peer.name}`}
            className="p-1 rounded hover:bg-[#d6d2c2] active:bg-[#c5c1b0] border border-transparent hover:border-[#aca899] disabled:opacity-40 cursor-pointer"
          >
            <img src="/resources/images/sendfolder.png" alt="Send Folder" className="w-4 h-4" />
          </button>

          {/* Remote Desktop */}
          <button
            type="button"
            onClick={() => onStartRemoteDesktop(peer.id)}
            title={`Remote Desktop (${peer.name})`}
            className="p-1 rounded hover:bg-[#d6d2c2] active:bg-[#c5c1b0] border border-transparent hover:border-[#aca899] cursor-pointer"
          >
            <img
              src="/resources/images/networksettings.png"
              alt="Remote Desktop"
              className="w-4 h-4"
            />
          </button>

          <div className="h-4 w-[1px] bg-[#aca899] mx-0.5" />

          {/* Save Conversation */}
          <button
            type="button"
            disabled={messages.length === 0}
            onClick={handleSaveConversation}
            title="Save this conversation (Ctrl+S)"
            className="p-1 rounded hover:bg-[#d6d2c2] active:bg-[#c5c1b0] border border-transparent hover:border-[#aca899] disabled:opacity-40 cursor-pointer"
          >
            <img src="/resources/images/save.png" alt="Save" className="w-4 h-4" />
          </button>
        </div>

        {/* Right Toolbar (pRightBar: pProtocolModeAction, pTransferAction, pHistoryAction) */}
        <div className="flex items-center gap-1">
          {/* Protocol Mode Toggle Button (pProtocolModeAction from chatwindow.cpp) */}
          <button
            type="button"
            onClick={() =>
              onToggleProtocolMode(legacyCompatMode ? 'Strict v3.0' : 'Legacy v1.0')
            }
            title={
              legacyCompatMode
                ? 'Protocol Header Mode: Legacy v1.0 (PKCS#1 BEGIN RSA PUBLIC KEY / PUBKEY / MESSAG - OpenSSL 1.0 compatible)'
                : 'Protocol Header Mode: Strict v3.0 (SPKI BEGIN PUBLIC KEY / PUBKv3 / MSGv30 - OpenSSL 3.0 only)'
            }
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
              legacyCompatMode
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400'
                : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-950 border-indigo-400'
            }`}
          >
            <img src="/resources/images/networksettings.png" alt="" className="w-3.5 h-3.5" />
            <span>{settings.protocolMode}</span>
          </button>

          {/* File Transfers */}
          <button
            type="button"
            onClick={onOpenTransfers}
            title="View File Transfers (Ctrl+J)"
            className="p-1 rounded hover:bg-[#d6d2c2] active:bg-[#c5c1b0] border border-transparent hover:border-[#aca899] cursor-pointer"
          >
            <img src="/resources/images/transfer.png" alt="Transfers" className="w-4 h-4" />
          </button>

          {/* History */}
          <button
            type="button"
            onClick={onOpenHistory}
            title="View History (Ctrl+H)"
            className="p-1 rounded hover:bg-[#d6d2c2] active:bg-[#c5c1b0] border border-transparent hover:border-[#aca899] cursor-pointer"
          >
            <img src="/resources/images/history.png" alt="History" className="w-4 h-4" />
          </button>
        </div>

        {/* Popup: Smiley Picker (lmcImagePickerAction) */}
        {showSmileyPicker && (
          <div className="absolute bottom-full left-2 mb-1 z-30 bg-white border border-gray-400 shadow-lg rounded p-2 w-72">
            <div className="text-[11px] font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Insert Emoticon ({SMILEY_LIST.length})</span>
              <button
                type="button"
                onClick={() => setShowSmileyPicker(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-10 gap-1 max-h-44 overflow-y-auto">
              {SMILEY_LIST.map((sm) => (
                <button
                  key={sm.index}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => `${prev}${sm.code}`);
                    setShowSmileyPicker(false);
                  }}
                  title={`${sm.name} (${sm.code})`}
                  className="p-1 hover:bg-blue-50 border border-transparent hover:border-blue-300 rounded flex items-center justify-center cursor-pointer"
                >
                  <img src={sm.image} alt={sm.code} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popup: Font Picker */}
        {showFontPicker && (
          <div className="absolute bottom-full left-1 mb-1 z-30 bg-white border border-gray-400 shadow-lg rounded p-2 w-56">
            <div className="text-[11px] font-semibold text-gray-700 mb-1">Select Font</div>
            <div className="space-y-1">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFontFamily(f);
                    setShowFontPicker(false);
                  }}
                  style={{ fontFamily: f }}
                  className={`w-full text-left px-2 py-1 text-xs rounded cursor-pointer ${
                    fontFamily === f ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popup: Color Picker */}
        {showColorPicker && (
          <div className="absolute bottom-full left-7 mb-1 z-30 bg-white border border-gray-400 shadow-lg rounded p-2 w-48">
            <div className="text-[11px] font-semibold text-gray-700 mb-1.5">Select Text Color</div>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setFontColor(c);
                    setShowColorPicker(false);
                  }}
                  className={`h-6 rounded border cursor-pointer ${
                    fontColor === c ? 'ring-2 ring-blue-500 border-white' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Message Input Area (ui.txtMessage + ui.btnSend) */}
      <div className="p-1.5 bg-[#ece9d8] flex items-stretch gap-1.5 h-20">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            settings.sendKeyModCtrlEnter
              ? 'Type a message... (Press Ctrl+Enter to send)'
              : 'Type a message... (Press Enter to send)'
          }
          style={{
            fontFamily,
            color: fontColor,
            fontSize: `${fontSize}px`,
          }}
          className="flex-1 bg-white border border-[#7f9db9] rounded-xs p-1.5 resize-none focus:outline-none focus:border-[#0054e3] text-xs"
        />
        {settings.showSendButton && (
          <button
            type="button"
            onClick={handleSend}
            className="px-4 bg-[#e1dfd2] hover:bg-[#d5d2c3] active:bg-[#c8c4b4] border border-[#7f9db9] rounded-xs font-semibold text-xs text-slate-800 cursor-pointer"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
};
