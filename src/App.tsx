/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, Image as ImageIcon, Search, ChevronLeft, ChevronRight, X, Maximize2, RefreshCcw } from 'lucide-react';
import { parseFile, standardizeData, ProductData } from './services/fileParser';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ProductData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const observerTarget = React.useRef<HTMLDivElement>(null);

  const [lightbox, setLightbox] = useState<{isOpen: boolean, urls: string[], currentIndex: number}>({
    isOpen: false, urls: [], currentIndex: 0
  });

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const resetData = () => {
    setFile(null);
    setData([]);
    setSearchTerm('');
    setVisibleCount(50);
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    try {
      const parsedData = await parseFile(selectedFile);
      const standardData = standardizeData(parsedData);
      setData(standardData);
      setVisibleCount(50); // Reset for new file
    } catch (error) {
      console.error(error);
      alert('读取文件失败，请确保格式正确(CSV/Excel)！');
    } finally {
      setIsParsing(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const openLightbox = (urls: string[]) => {
    if (urls.length > 0) {
      setLightbox({ isOpen: true, urls, currentIndex: 0 });
    }
  };
  
  const closeLightbox = () => setLightbox(prev => ({ ...prev, isOpen: false }));
  
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox(prev => ({ ...prev, currentIndex: (prev.currentIndex - 1 + prev.urls.length) % prev.urls.length }));
  };
  
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox(prev => ({ ...prev, currentIndex: (prev.currentIndex + 1) % prev.urls.length }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setVisibleCount(50);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const query = searchTerm.toLowerCase();
    return data.filter(item => {
      return Object.values(item).some(val => 
        String(val || '').toLowerCase().includes(query)
      );
    });
  }, [data, searchTerm]);

  const displayData = useMemo(() => {
    return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && visibleCount < filteredData.length) {
          setVisibleCount(prev => prev + 50);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, filteredData.length]);

  return (
    <div className="min-h-screen bg-[var(--color-claude-bg)] text-[var(--color-claude-text)] font-sans selection:bg-[var(--color-claude-accent)] selection:text-white p-6">
      <div className="max-w-[100rem] mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[var(--color-claude-border)]">
          <div className="flex-1">
            <h1 className="text-3xl font-serif font-normal tracking-tight flex items-center gap-2 text-[var(--color-claude-text)]">
              跨境电商数据展示工具
            </h1>
            <p className="text-sm font-sans text-[var(--color-claude-text-muted)] mt-1.5">
              拖拽上传 Excel / CSV 文件，直接预览商品主图与详细参数。
            </p>
          </div>
          
          {data.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-claude-text-muted)]" />
                <input 
                  type="text" 
                  placeholder="搜索任何信息..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-4 py-2 bg-[var(--color-claude-surface)] border border-[var(--color-claude-border)] rounded-md text-sm text-[var(--color-claude-text)] placeholder:text-[var(--color-claude-text-muted)] focus:outline-none focus:border-[var(--color-claude-accent)] transition-colors"
                />
              </div>

              <button
                onClick={resetData}
                className="flex shrink-0 items-center justify-center gap-2 px-4 py-2 bg-[var(--color-claude-accent)] hover:bg-[var(--color-claude-accent)]/80 text-white rounded-md text-sm font-medium transition-all shadow-sm"
              >
                <RefreshCcw className="w-4 h-4" />
                重新上传
              </button>
            </div>
          )}
        </header>

        {/* Upload Zone */}
        {data.length === 0 && !isParsing && (
          <div
            className={`border-2 border-dashed rounded-xl p-20 text-center transition-all duration-200 mt-12 flex flex-col items-center justify-center min-h-[400px] ${
              isDragging ? 'border-[var(--color-claude-accent)] bg-[var(--color-claude-accent)]/5 scale-[1.02]' : 'border-[var(--color-claude-border)] bg-[var(--color-claude-surface)]/50 hover:border-[#5e5e5e]'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="flex justify-center mb-6">
              <div className="p-5 bg-[var(--color-claude-surface)] rounded-2xl shadow-sm border border-[var(--color-claude-border)]">
                <UploadCloud className="w-10 h-10 text-[var(--color-claude-text-muted)]" />
              </div>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">拖拽您的 Excel 或 CSV 文件到这里</h3>
            <p className="text-[var(--color-claude-text-muted)] text-sm mb-8 max-w-sm mx-auto">
              系统将自动解析您的商品数据： Product ID, 商品名称, 一级类目, 二级类目, 店铺名, 图片链接等字段。
            </p>
            <label className="cursor-pointer inline-flex items-center justify-center px-6 py-2.5 bg-[#e6e3dd] text-black hover:bg-white rounded-md text-sm font-medium transition-colors shadow-sm">
              选择文件
              <input
                type="file"
                className="hidden"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={onFileInput}
              />
            </label>
          </div>
        )}

        {isParsing && (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-[var(--color-claude-surface)]/20 rounded-xl border border-[var(--color-claude-border)]">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--color-claude-accent)] mb-4" />
            <p className="text-[var(--color-claude-text-muted)] font-medium">正在解析表格核心数据，请稍候...</p>
          </div>
        )}

        {/* Data Table */}
        {data.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between text-sm text-[var(--color-claude-text-muted)] px-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[var(--color-claude-accent)]" />
                <span className="font-medium text-[var(--color-claude-text)]">{file?.name}</span>
                <span className="bg-[var(--color-claude-surface)] px-2.5 py-0.5 rounded-md text-xs border border-[var(--color-claude-border)]">
                  共展示 {filteredData.length} 条记录
                </span>
                {searchTerm && (
                  <span className="ml-2 text-xs text-[var(--color-claude-accent)]">
                    搜索: "{searchTerm}"
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[var(--color-claude-surface)] rounded-xl border border-[var(--color-claude-border)] overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm align-top">
                  <thead className="bg-[var(--color-claude-surface)] text-[var(--color-claude-text-muted)] border-b border-[var(--color-claude-border)] whitespace-nowrap">
                    <tr>
                      <th className="px-6 py-4 font-mono font-medium text-xs tracking-wider uppercase min-w-[220px]">商品 ID</th>
                      <th className="px-6 py-4 font-mono font-medium text-xs tracking-wider uppercase text-center w-[180px]">展示图片</th>
                      <th className="px-6 py-4 font-mono font-medium text-xs tracking-wider uppercase min-w-[300px]">商品名称</th>
                      <th className="px-6 py-4 font-mono font-medium text-xs tracking-wider uppercase min-w-[120px]">一级类目</th>
                      <th className="px-6 py-4 font-mono font-medium text-xs tracking-wider uppercase min-w-[120px]">二级类目</th>
                      <th className="px-6 py-4 font-mono font-medium text-xs tracking-wider uppercase min-w-[150px]">店铺名称</th>
                      <th className="px-6 py-4 font-mono font-medium text-xs tracking-wider uppercase min-w-[200px]">可能有样机构</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-claude-border)]/60">
                    {displayData.length > 0 ? (
                      displayData.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-[var(--color-claude-surface)]/50 transition-colors group">
                          <td className="px-6 py-5 font-mono text-[13.5px] text-[var(--color-claude-text)] whitespace-nowrap select-all border-r border-[var(--color-claude-border)]/20">
                            {String(item.id || '')}
                          </td>
                          <td className="px-6 py-5">
                            {item.imageLinks && item.imageLinks.length > 0 ? (
                              <div 
                                className="w-[160px] h-[160px] mx-auto rounded-lg overflow-hidden border border-[var(--color-claude-border)] bg-[#1c1a17] flex items-center justify-center shrink-0 shadow-sm relative group cursor-pointer group-hover:border-[var(--color-claude-accent)] transition-colors"
                                onClick={() => openLightbox(item.imageLinks || [])}
                              >
                                <img 
                                  src={item.imageLinks[0]} 
                                  alt="Product" 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-70"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden absolute inset-0 flex items-center justify-center bg-[#1c1a17]">
                                  <ImageIcon className="w-8 h-8 text-[#5e5e5e]" />
                                </div>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <Maximize2 className="w-8 h-8 text-white drop-shadow-md" />
                                </div>
                                {item.imageLinks.length > 1 && (
                                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    1 / {item.imageLinks.length}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-[160px] h-[160px] mx-auto rounded-lg border border-[var(--color-claude-border)] border-dashed bg-[#1c1a17] flex flex-col items-center justify-center gap-2">
                                <ImageIcon className="w-6 h-6 text-[#5e5e5e]" />
                                <span className="text-xs text-[#5e5e5e]">无图片</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 min-w-[300px] max-w-[500px]">
                            <div className="text-pre-wrap break-words text-[14px] leading-relaxed text-[var(--color-claude-text)]">
                              {item.name}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded border border-[var(--color-claude-border)] bg-[var(--color-claude-surface)] text-[13px] text-[var(--color-claude-text)]">
                              {item.category1}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded border border-[var(--color-claude-border)] bg-[var(--color-claude-surface)] text-[13px] text-[var(--color-claude-text)]">
                              {item.category2}
                            </span>
                          </td>
                          <td className="px-6 py-5 min-w-[150px] text-[14px] text-[var(--color-claude-text)] whitespace-nowrap" title={String(item.shopName || '')}>
                            {item.shopName}
                          </td>
                          <td className="px-6 py-5 min-w-[200px] text-[14px] text-[var(--color-claude-text)] whitespace-normal break-words">
                            {item.agency}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-[var(--color-claude-text-muted)]">
                          没有在此表格中搜索到符合条件的内容。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Infinite Scroll Trigger */}
              {visibleCount < filteredData.length && (
                <div 
                  ref={observerTarget}
                  className="py-10 flex items-center justify-center text-[var(--color-claude-text-muted)] text-sm font-mono tracking-widest"
                >
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  LOADING MORE DATA...
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightbox.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={closeLightbox}
          >
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={closeLightbox}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
            >
              <X className="w-6 h-6" />
            </motion.button>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl h-full max-h-[85vh] flex items-center justify-center" 
              onClick={e => e.stopPropagation()}
            >
              {lightbox.urls.length > 1 && (
                <button 
                  onClick={prevImage}
                  className="absolute left-0 lg:-left-16 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors border border-white/10 z-10"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
              )}
              
              <img 
                key={lightbox.currentIndex}
                src={lightbox.urls[lightbox.currentIndex]} 
                alt="Enlarged product" 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
              
              {lightbox.urls.length > 1 && (
                <button 
                  onClick={nextImage}
                  className="absolute right-0 lg:-right-16 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors border border-white/10 z-10"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              )}
              
              {lightbox.urls.length > 1 && (
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-black/50 px-5 py-2 rounded-full text-sm text-white/90 font-mono tracking-widest font-medium">
                  {lightbox.currentIndex + 1} / {lightbox.urls.length}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

