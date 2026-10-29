import React, { useState, useMemo, useRef } from 'react';
import {
  Copy,
  Search,
  FolderOpen,
  QrCode,
  X,
  Upload,
  FileText,
  Pin,
  Trash2,
  Check,
  Plus,
  Lightbulb,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { copyToClipboard } from '../../../utils/clipboard';
import { IdeaTag } from '../../../types';

export interface BridgeTabProps {
  onOpenQrModal: () => void;
  copiedId?: string | null;
  onCopyText?: (id: string, text: string) => void;
}

/**
 * Tab Bridge & Ide (Clipboard Sync, File Transfer, & Gudang Ide/Catatan)
 */
export const BridgeTab: React.FC<BridgeTabProps> = ({
  onOpenQrModal,
  copiedId: externalCopiedId,
  onCopyText: externalOnCopyText,
}) => {
  const {
    clipboardHistory,
    bridgeFiles,
    pushClipboardText,
    sendBridgeFile,
    deleteBridgeFile,
    togglePinBridgeFile,
    openBridgeFolder,
    settings,
    t,
    ideas,
    addIdea,
    updateIdea,
    deleteIdea,
    togglePinIdea,
    ideaCategories,
    addIdeaCategory,
    deleteIdeaCategory,
  } = useApp();

  const isEn = (settings.language || 'en') === 'en';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local Copy State (used if no external handler is passed)
  const [localCopiedId, setLocalCopiedId] = useState<string | null>(null);
  const copiedId = externalCopiedId !== undefined ? externalCopiedId : localCopiedId;

  const handleCopyText = (id: string, text: string) => {
    if (externalOnCopyText) {
      externalOnCopyText(id, text);
    } else {
      copyToClipboard(text);
      setLocalCopiedId(id);
      window.setTimeout(() => setLocalCopiedId(null), 1300);
    }
  };

  // Bridge Search & Input States
  const [showBridgeSearch, setShowBridgeSearch] = useState(false);
  const [bridgeSearchQuery, setBridgeSearchQuery] = useState('');
  const [pasteText, setPasteText] = useState('');

  // Ideas & Categories States
  const [selectedTag, setSelectedTag] = useState<IdeaTag | 'ALL'>('ALL');
  const [showIdeaSearch, setShowIdeaSearch] = useState(false);
  const [ideaSearchQuery, setIdeaSearchQuery] = useState('');
  const [showAddIdea, setShowAddIdea] = useState(false);
  const [newIdeaText, setNewIdeaText] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Inline Edit State for Ideas
  const [editingItem, setEditingItem] = useState<{
    id: string;
    text: string;
    secondary?: string;
  } | null>(null);

  // Filtered Lists
  const filteredBridgeFiles = useMemo(() => {
    const q = bridgeSearchQuery.trim().toLowerCase();
    if (!q) return bridgeFiles;
    return bridgeFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [bridgeFiles, bridgeSearchQuery]);

  const filteredClipboardHistory = useMemo(() => {
    const q = bridgeSearchQuery.trim().toLowerCase();
    if (!q) return clipboardHistory;
    return clipboardHistory.filter((c) => c.content.toLowerCase().includes(q));
  }, [clipboardHistory, bridgeSearchQuery]);

  const filteredIdeas = useMemo(() => {
    const q = ideaSearchQuery.trim().toLowerCase();
    return ideas.filter((item) => {
      const matchTag = selectedTag === 'ALL' ? true : item.tag === selectedTag;
      const matchQuery =
        !q ||
        item.content.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q);
      return matchTag && matchQuery;
    });
  }, [ideas, selectedTag, ideaSearchQuery]);

  // Handlers
  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;
    pushClipboardText(pasteText);
    setPasteText('');
  };

  const handleAddIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaText.trim()) return;
    const defaultCategory = ideaCategories[0] || '#Catatan';
    addIdea(newIdeaText.trim(), selectedTag === 'ALL' ? defaultCategory : selectedTag);
    setNewIdeaText('');
    setShowAddIdea(false);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const added = addIdeaCategory(newCategoryName.trim());
    setSelectedTag(added);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const handleDeleteCategoryTag = (tag: IdeaTag) => {
    deleteIdeaCategory(tag);
    if (selectedTag === tag) {
      setSelectedTag('ALL');
    }
  };

  const handleCommitInlineEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem) return;
    const trimmed = editingItem.text.trim();
    if (trimmed) {
      updateIdea(editingItem.id, { content: trimmed });
    }
    setEditingItem(null);
  };

  return (
    <div className="h-full min-h-0 grid grid-cols-12 gap-6 overflow-hidden">
      {/* Kiri (6/12): Clipboard & File Bridge */}
      <div className="col-span-6 h-full min-h-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/[0.05] shrink-0 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 shrink-0 whitespace-nowrap">
            <Copy className="w-3.5 h-3.5 text-violet-400/90" />
            <span>{isEn ? 'Bridge History' : 'Riwayat Bridge'}</span>
            <span className="text-[10px] font-normal text-zinc-500 font-mono px-1.5 py-0.5 rounded bg-white/[0.03]">
              {filteredBridgeFiles.length + filteredClipboardHistory.length}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowBridgeSearch((p) => {
                  if (p) setBridgeSearchQuery('');
                  return !p;
                });
              }}
              title={isEn ? 'Search text or files' : 'Cari teks atau file'}
              className={`p-1.5 rounded-lg cursor-pointer transition shrink-0 ${
                showBridgeSearch
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openBridgeFolder()}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 flex items-center justify-center cursor-pointer transition shrink-0"
              title={isEn ? 'Open LoonyBridge Folder on Computer' : 'Buka Folder LoonyBridge di Laptop'}
            >
              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            <button
              type="button"
              onClick={onOpenQrModal}
              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition border border-white/[0.06] shrink-0 whitespace-nowrap"
              title={isEn ? 'Scan QR to connect mobile phone' : 'Scan QR untuk membuka di HP'}
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isEn ? 'Connect Phone' : 'Hubungkan HP'}</span>
            </button>
          </div>
        </div>

        {showBridgeSearch && (
          <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-white/[0.04] shrink-0">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              autoFocus
              value={bridgeSearchQuery}
              onChange={(e) => setBridgeSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setBridgeSearchQuery('');
                  setShowBridgeSearch(false);
                }
              }}
              placeholder={
                isEn
                  ? 'Filter clipboard history or file names...'
                  : 'Filter riwayat clipboard atau nama file...'
              }
              className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            {bridgeSearchQuery && (
              <button
                type="button"
                onClick={() => setBridgeSearchQuery('')}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <form
          onSubmit={handlePasteSubmit}
          className="flex items-center gap-1.5 mb-3 shrink-0 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] focus-within:border-violet-500/40 focus-within:bg-white/[0.05] rounded-xl px-2.5 py-1.5 transition"
        >
          <input
            type="text"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              isEn
                ? 'Type or paste text to bridge...'
                : 'Ketik atau tempel teks untuk dikirim...'
            }
            className="flex-1 min-w-0 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={isEn ? 'Send file to devices' : 'Kirim file ke perangkat'}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] cursor-pointer transition"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              type="submit"
              disabled={!pasteText.trim()}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:hover:bg-zinc-100 text-zinc-950 text-[10.5px] font-semibold cursor-pointer transition"
            >
              {isEn ? 'Send' : 'Kirim'}
            </button>
          </div>
        </form>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              await sendBridgeFile(f);
              e.target.value = '';
            }
          }}
        />

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/[0.03] pr-1">
          {filteredBridgeFiles.length === 0 && filteredClipboardHistory.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-2.5 text-zinc-600">
                <Copy className="w-4 h-4" />
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                {bridgeSearchQuery.trim()
                  ? isEn ? 'No matching items' : 'Tidak ditemukan item cocok'
                  : isEn ? 'Bridge History is Empty' : 'Riwayat Bridge Kosong'}
              </p>
              <p className="text-[11px] text-zinc-600 mt-0.5 max-w-[220px]">
                {bridgeSearchQuery.trim()
                  ? isEn ? 'Try another keyword or clear search.' : 'Coba kata kunci lain atau hapus pencarian.'
                  : isEn
                    ? 'Copied text or files sent between devices will appear here.'
                    : 'Teks yang disalin atau file transit antar-perangkat akan muncul di sini.'}
              </p>
            </div>
          )}

          {filteredBridgeFiles.map((file) => (
            <div
              key={file.id}
              className="group flex items-center justify-between gap-2 py-2 px-2 rounded-xl hover:bg-white/[0.03] transition"
            >
              <div
                onClick={() => openBridgeFolder(file.localPath)}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-xs text-zinc-200 font-medium">{file.name}</span>
                  <span className="text-[10px] text-zinc-500">{isEn ? 'File transit' : 'File transit'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => togglePinBridgeFile(file.id)}
                  title={file.pinned ? (isEn ? 'Unpin' : 'Lepas sematan') : (isEn ? 'Pin' : 'Sematkan')}
                  className={`p-1.5 rounded-lg cursor-pointer transition ${
                    file.pinned
                      ? 'text-amber-400 bg-amber-400/10'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <Pin className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteBridgeFile(file.id)}
                  title={isEn ? 'Delete file' : 'Hapus file'}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {filteredClipboardHistory.map((clip) => (
            <div
              key={clip.id}
              onClick={() => handleCopyText(clip.id, clip.content)}
              className="group flex items-center justify-between gap-2 py-2 px-2 rounded-xl hover:bg-white/[0.03] transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-center shrink-0 text-zinc-500 group-hover:text-zinc-300">
                  <Copy className="w-3.5 h-3.5" />
                </div>
                <span className="truncate text-xs text-zinc-300 group-hover:text-zinc-100">
                  {clip.content}
                </span>
              </div>
              <span className="text-zinc-500 group-hover:text-zinc-300 shrink-0 p-1">
                {copiedId === clip.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition">
                    {isEn ? 'Copy' : 'Salin'}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanan (6/12): Gudang Ide */}
      <div className="col-span-6 h-full min-h-0 flex flex-col pl-6 border-l border-white/[0.04] overflow-hidden">
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/[0.05] shrink-0">
          <div
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth"
          >
            <button
              type="button"
              onClick={() => setSelectedTag('ALL')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium cursor-pointer shrink-0 transition ${
                selectedTag === 'ALL'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.common.all}
            </button>

            {ideaCategories.map((tag) => {
              const active = selectedTag === tag;
              return (
                <div
                  key={tag}
                  className={`group/cat inline-flex items-center rounded-lg text-[10px] font-medium shrink-0 transition ${
                    active
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className="px-2 py-0.5 cursor-pointer"
                  >
                    {tag}
                  </button>
                  {ideaCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategoryTag(tag);
                      }}
                      title={isEn ? `Delete category ${tag}` : `Hapus kategori ${tag}`}
                      className={`pr-1.5 pl-0.5 py-0.5 cursor-pointer transition-opacity ${
                        active
                          ? 'text-zinc-600 hover:text-zinc-950 opacity-80 hover:opacity-100'
                          : 'text-zinc-500 hover:text-rose-400 opacity-0 group-hover/cat:opacity-100'
                      }`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setShowAddCategory((p) => !p)}
              title={isEn ? 'Add new category' : 'Tambah kategori baru'}
              className="px-1.5 py-0.5 rounded-lg text-[10px] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] cursor-pointer shrink-0 transition"
            >
              {isEn ? '+ Category' : '+ Kategori'}
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowIdeaSearch((p) => {
                  if (p) setIdeaSearchQuery('');
                  return !p;
                });
              }}
              title={isEn ? 'Search ideas & notes' : 'Cari catatan ide'}
              className={`p-1 rounded-lg cursor-pointer transition ${
                showIdeaSearch
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowAddIdea((p) => !p)}
              title={isEn ? 'Add new note' : 'Tambah catatan ide'}
              className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showIdeaSearch && (
          <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-white/[0.04] shrink-0">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              autoFocus
              value={ideaSearchQuery}
              onChange={(e) => setIdeaSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIdeaSearchQuery('');
                  setShowIdeaSearch(false);
                }
              }}
              placeholder={isEn ? 'Search keywords...' : 'Cari kata kunci catatan...'}
              className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            {ideaSearchQuery && (
              <button
                type="button"
                onClick={() => setIdeaSearchQuery('')}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {showAddCategory && (
          <form
            onSubmit={handleAddCategorySubmit}
            className="flex gap-1.5 mb-2.5 pb-2 border-b border-white/[0.04] shrink-0"
          >
            <input
              type="text"
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={
                isEn
                  ? 'New category name (e.g. Work, Study)...'
                  : 'Nama kategori baru (misal: Kuliah, Hobi)...'
              }
              className="flex-1 bg-white/[0.04] rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-[11px] font-semibold cursor-pointer"
            >
              {t.common.add}
            </button>
          </form>
        )}

        {showAddIdea && (
          <form
            onSubmit={handleAddIdea}
            className="flex gap-1.5 mb-3 pb-2.5 border-b border-white/[0.04] shrink-0"
          >
            <input
              type="text"
              autoFocus
              value={newIdeaText}
              onChange={(e) => setNewIdeaText(e.target.value)}
              placeholder={isEn ? 'Write a thought, idea, or note...' : 'Tulis catatan ide baru...'}
              className="flex-1 bg-white/[0.04] rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-[11px] font-semibold cursor-pointer"
            >
              {t.common.save}
            </button>
          </form>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/[0.03] pr-1">
          {filteredIdeas.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-2.5 text-zinc-600">
                <Lightbulb className="w-4 h-4" />
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                {ideaSearchQuery.trim()
                  ? isEn ? 'No matching notes' : 'Tidak ditemukan catatan'
                  : isEn ? 'No notes in this category' : 'Belum ada catatan di kategori ini'}
              </p>
              <p className="text-[11px] text-zinc-600 mt-0.5 max-w-[220px]">
                {ideaSearchQuery.trim()
                  ? isEn ? 'Try another search query.' : 'Coba kata kunci lain.'
                  : isEn
                    ? 'Tap + or ask Loony in chat to capture ideas.'
                    : 'Klik + atau tanyakan Loony di chat untuk menyimpan ide.'}
              </p>
            </div>
          ) : (
            filteredIdeas.map((idea) => {
              const isEditing = editingItem?.id === idea.id;
              return (
                <div
                  key={idea.id}
                  className="group flex items-start justify-between gap-2 py-2.5 px-1.5 rounded-lg hover:bg-white/[0.02] transition"
                >
                  {isEditing ? (
                    <form
                      onSubmit={handleCommitInlineEdit}
                      className="flex items-center gap-1.5 w-full"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingItem.text}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            text: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingItem(null);
                        }}
                        className="flex-1 bg-white/[0.06] rounded-md px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-950 text-[10px] font-semibold cursor-pointer"
                      >
                        OK
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div
                          onClick={() =>
                            setEditingItem({
                              id: idea.id,
                              text: idea.content,
                              secondary: idea.tag,
                            })
                          }
                          title="Klik untuk mengedit catatan"
                          className="text-xs text-zinc-200 leading-relaxed cursor-text hover:underline decoration-white/20 underline-offset-2"
                        >
                          {idea.content}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {idea.tag}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePinIdea(idea.id)}
                          className={`p-1 rounded cursor-pointer ${
                            idea.pinned
                              ? 'text-amber-400'
                              : 'opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300'
                          }`}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteIdea(idea.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-zinc-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
