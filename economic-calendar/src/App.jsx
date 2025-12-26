import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Camera, FileText, Plus, Trash2, Copy, ChevronDown } from 'lucide-react';

/**
 * Hook สำหรับโหลด Script ภายนอกเพื่อให้ทำงานได้ในสภาพแวดล้อมพรีวิว
 */
const useExternalScripts = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const scripts = [
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
    ];

    Promise.all(scripts.map(src => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    })).then(() => setLoaded(true));
  }, []);

  return loaded;
};

// --- ข้อมูลรูปภาพธง ---
const flagImageUrls = {
    'AU': 'https://flagcdn.com/w80/au.png', 
    'CA': 'https://flagcdn.com/w80/ca.png', 
    'CN': 'https://flagcdn.com/w80/cn.png',
    'GB': 'https://flagcdn.com/w80/gb.png', 
    'EU': 'https://flagcdn.com/w80/eu.png', 
    'DE': 'https://flagcdn.com/w80/de.png',
    'JP': 'https://flagcdn.com/w80/jp.png', 
    'NZ': 'https://flagcdn.com/w80/nz.png', 
    'CH': 'https://flagcdn.com/w80/ch.png',
    'USA': 'https://flagcdn.com/w80/us.png'
};

const availableCountries = [
    { code: 'USA', name: 'United States' }, { code: 'EU', name: 'European Union' },
    { code: 'GB', name: 'United Kingdom' }, { code: 'JP', name: 'Japan' },
    { code: 'DE', name: 'Germany' }, { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' },
    { code: 'CH', name: 'Switzerland' }, { code: 'CN', name: 'China' },
];

const boxRed = `data:image/svg+xml;utf8,<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14" r="11" fill="%23EF4444" stroke="%23B91C1C" stroke-width="3"/></svg>`;
const boxOrange = `data:image/svg+xml;utf8,<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14" r="11" fill="%23F97316" stroke="%23C2410C" stroke-width="3"/></svg>`;
const boxGray = `data:image/svg+xml;utf8,<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14" r="11" fill="%234B5563" stroke="%236B7280" stroke-width="3"/></svg>`;

const importanceMap = {
    high: { label: 'สูง', image: boxRed, previewImage: boxRed, color: 'bg-red-500' },
    medium: { label: 'กลาง', image: boxOrange, previewImage: boxOrange, color: 'bg-orange-500' },
    low: { label: 'ไม่มี', image: boxGray, previewImage: null, color: 'bg-gray-600' },
};

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// --- UI Components for Editor (Dark Mode) ---

const Popover = ({ children, onClose }) => {
    const popoverRef = useRef();
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div ref={popoverRef} className="absolute top-full mt-2 left-0 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl p-2 min-w-[250px]">
            {children}
        </div>
    );
};

const InlineEditable = ({ value, onSave, className = "", isTextarea = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(value);
    const inputRef = useRef(null);

    const handleDoubleClick = () => setIsEditing(true);
    const handleBlur = () => { onSave(text); setIsEditing(false); };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isTextarea) handleBlur();
        else if (e.key === 'Escape') { setText(value); setIsEditing(false); }
    };
    
    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            if (!isTextarea) inputRef.current?.select();
        }
    }, [isEditing]);
    
    useEffect(() => setText(value), [value]);

    const commonProps = {
        ref: inputRef,
        value: text,
        onChange: (e) => setText(e.target.value),
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
        className: `bg-zinc-950 text-white p-1 rounded-md outline-none w-full border border-zinc-700 focus:border-cyan-500 transition-colors ${className}`,
    };

    return isEditing ? (
        isTextarea ? <textarea {...commonProps} rows="2" /> : <input type="text" {...commonProps} />
    ) : (
        <div onDoubleClick={handleDoubleClick} className={`cursor-pointer hover:bg-zinc-800/80 p-1 rounded-md min-h-[28px] w-full break-words whitespace-pre-wrap transition-colors ${className}`}>
            {value || <span className="text-zinc-600 italic text-xs">ว่าง</span>}
        </div>
    );
};

// --- Preview Components ---

const FitText = ({ text }) => {
    const textRef = useRef(null);
    useLayoutEffect(() => {
        const el = textRef.current;
        if (!el) return;
        const fit = () => {
            el.style.letterSpacing = 'normal';
            const containerWidth = 556;
            let currentSpacing = 0;
            const minSpacing = -2.5;
            if (el.scrollWidth > containerWidth) {
                while (el.scrollWidth > containerWidth && currentSpacing > minSpacing) {
                    currentSpacing -= 0.1;
                    el.style.letterSpacing = `${currentSpacing}px`;
                }
            }
        };
        fit();
    }, [text]);

    return (
        <p ref={textRef} className="font-normal ml-3 whitespace-pre overflow-visible leading-normal py-0.8">
            {text}
        </p>
    );
};

const NewsItemRowPreview = ({ item }) => (
    <div className="flex items-center w-full min-h-[28px] py-1" style={{fontSize: '19px'}}>
        {importanceMap[item.importance]?.previewImage ? (
            <img src={importanceMap[item.importance].previewImage} alt={item.importance} className="w-7 h-7 mr-3 flex-shrink-0" />
        ) : (
            <div className="w-7 h-7 mr-3 flex-shrink-0" />
        )}
        <div style={{width: '44px'}} className="flex items-center mr-3 flex-shrink-0">
            {item.flags.split(',').filter(Boolean).map((flagCode, i) => {
                const code = flagCode.trim();
                return flagImageUrls[code] ? (
                    <img 
                      key={i} 
                      src={flagImageUrls[code]} 
                      alt={code} 
                      className="rounded-full object-cover -mr-2 border-2 bg-gray-800" 
                      style={{
                        width: '1.8rem', 
                        height: '1.8rem',
                        borderColor: 'color-mix(in oklab, oklch(0.27 0.03 28.37) 80%, transparent)'
                      }} 
                    />
                ) : null;
            })}
        </div>
        <p style={{width: '57px'}} className="font-normal flex-shrink-0">{item.time}</p>
        <div style={{width: '556px'}} className="flex-shrink-0">
             <FitText text={item.description} />
        </div>
        <div className="flex-grow"></div>
        <div style={{width: '109px'}} className="font-normal flex-shrink-0 flex justify-end">
            <span className="whitespace-pre">{item.value}</span>
        </div>
    </div>
);

const CalendarPreview = React.forwardRef(({ dateRange, newsByDay, verticalPadding, background, marginTop }, ref) => {
    // ใช้รูปภาพพื้นหลังที่เป็น Placeholder หากไม่มีไฟล์ bg.jpg จริง
    const bgUrl = '/bg.jpg'; 
    const fontFamily = background === 'thai' ? "'IBM Plex Sans Thai', sans-serif" : "'Noto Sans Lao', sans-serif";
    
    return (
        <div 
            ref={ref} 
            className="relative w-[960px] h-[1200px] p-8 text-white select-none overflow-hidden" 
            style={{ 
                fontFamily, 
                backgroundImage: `url('${bgUrl}')`, // ลบ linear-gradient overlay ออก
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="relative z-10">
                <header className="text-center">
                    <div 
                        className="inline-block bg-white px-10 py-1 rounded-full mt-[9.5rem] border border-gray-100"
                        style={{ boxShadow: '0 4px 15px rgba(255, 92, 11, 0.6)' }}
                    >
                        <p className="text-2xl text-black font-bold whitespace-nowrap">{dateRange}</p>
                    </div>
                </header>
                <main className="space-y-4" style={{ marginTop: `${marginTop}px` }}>
                    {daysOfWeek.map(day => {
                        const itemsForDay = newsByDay[day] || [];
                        if (itemsForDay.length === 0) return null;
                        return (
                            <div key={day} style={{width: '862px'}} className="mx-auto">
                                <div style={{backgroundColor: 'white', height: '27px'}} className="flex items-center justify-center px-6 py-2 rounded-full mb-0 w-full shadow-lg z-10 relative">
                                    <h3 className="font-bold text-black text-center" style={{fontSize: '1.4rem'}}>{day}</h3>
                                </div>
                                <div 
                                    className="bg-green-800/80 backdrop-blur-sm rounded-b-2xl border-[0.8px] border-white shadow-xl relative -mt-3 pt-3 overflow-hidden" 
                                    style={{ 
                                        backgroundColor: 'color-mix(in oklab, oklch(0.26 0.01 0) 80%, transparent)',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    <div 
                                        className="px-4 space-y-2 needs-blur" 
                                        style={{ 
                                            paddingTop: `${verticalPadding}rem`,   
                                            paddingBottom: `${verticalPadding}rem`
                                        }}
                                    >
                                        {itemsForDay.map(item => <NewsItemRowPreview key={item.id} item={item} />)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </main>
            </div>
        </div>
    );
});

// --- Editor Row Component ---

const EditableNewsRow = ({ item, onUpdate, onRemove, onDuplicate }) => {
    const [editingField, setEditingField] = useState(null);
    const handleUpdate = (field, value) => { onUpdate(item.id, field, value); };

    const toggleFlag = (flagCode) => {
        const currentFlags = item.flags ? item.flags.split(',').map(f => f.trim()) : [];
        const newFlags = currentFlags.includes(flagCode)
            ? currentFlags.filter(f => f !== flagCode)
            : [...currentFlags, flagCode];
        handleUpdate('flags', newFlags.join(','));
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-zinc-900 rounded-xl border border-zinc-800 text-sm hover:border-zinc-700 transition-all">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative">
                    <button onClick={() => setEditingField(editingField === 'importance' ? null : 'importance')} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${importanceMap[item.importance]?.color || 'border-zinc-700'}`}></button>
                    {editingField === 'importance' && (
                        <Popover onClose={() => setEditingField(null)}>
                            <div className="flex flex-col gap-1">
                                {Object.entries(importanceMap).map(([key, {label, color, image}]) => (
                                    <button key={key} onClick={() => { handleUpdate('importance', key); setEditingField(null); }} className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-zinc-700 w-full text-left text-white`}>
                                        <img src={image} className="w-5 h-5" alt={label} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </Popover>
                    )}
                </div>

                <div className="relative">
                    <div onClick={() => setEditingField(editingField === 'flags' ? null : 'flags')} className="flex items-center cursor-pointer flex-shrink-0 w-16 h-8 bg-zinc-950 border border-zinc-800 rounded px-1">
                        {item.flags.split(',').filter(Boolean).slice(0, 2).map((flagCode, i) => {
                            const code = flagCode.trim();
                            return flagImageUrls[code] ? (
                                <img key={i} src={flagImageUrls[code]} alt={code} className="w-6 h-6 rounded-full object-cover -ml-2 first:ml-0 border-2 border-zinc-900 bg-zinc-800" />
                            ) : null;
                        })}
                    </div>
                    {editingField === 'flags' && (
                        <Popover onClose={() => setEditingField(null)}>
                            <div className="grid grid-cols-4 gap-2 w-64 p-1">
                                {availableCountries.map(({code, name}) => (
                                    <button key={code} onClick={() => toggleFlag(code)} title={name} className={`w-12 h-12 rounded-full transition-all flex items-center justify-center ${item.flags.includes(code) ? 'ring-2 ring-cyan-400 bg-zinc-700' : 'opacity-40 hover:opacity-100 hover:bg-zinc-700'}`}>
                                        <img src={flagImageUrls[code]} alt={name} className="w-10 h-10 rounded-full object-cover border border-zinc-600"/>
                                    </button>
                                ))}
                            </div>
                        </Popover>
                    )}
                </div>
                <div className="w-16 flex-shrink-0"><InlineEditable value={item.time} onSave={(val) => handleUpdate('time', val)} className="text-center font-mono" /></div>
            </div>

            <div className="flex-grow w-full"><InlineEditable value={item.description} onSave={(val) => handleUpdate('description', val)} isTextarea={true} className="text-zinc-100" /></div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="w-20 flex-shrink-0"><InlineEditable value={item.value} onSave={(val) => handleUpdate('value', val)} className="text-right font-mono text-cyan-400"/></div>

                <div className="flex items-center border-l border-zinc-800 pl-2 ml-1">
                    <button onClick={() => onDuplicate(item.id)} className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg transition-colors">
                        <Copy size={16} />
                    </button>
                    <button onClick={() => onRemove(item.id)} className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Logic ---

export default function App() {
  const scriptsLoaded = useExternalScripts();
  const initialNews = [
    { id: 1, day: 'Mon', time: '', flags: 'GB,USA', description: 'วันหยุดธนาคาร', value: '', importance: 'low'},
    { id: 2, day: 'Tue', time: '19:30', flags: 'USA', description: 'ยอดคำสั่งซื้อสินค้าคงทน (เดือนต่อเดือน) (เม.ย.)', value: '9.2%', importance: 'medium'},
    { id: 3, day: 'Tue', time: '21:00', flags: 'USA', description: 'รายงานความเชื่อมั่นผู้บริโภคจากซีบี (พ.ค.)', value: '86.0', importance: 'high'},
    { id: 4, day: 'Wed', time: '09:00', flags: 'NZ', description: 'การตัดสินใจเกี่ยวกับอัตราดอกเบี้ย', value: '3.50%', importance: 'high'},
  ];

  const [dateRange, setDateRange] = useState('22-26 May 2025');
  const [newsItems, setNewsItems] = useState(initialNews);
  const [viewMode, setViewMode] = useState('editor');
  const [scale, setScale] = useState(1);
  const [verticalPadding, setVerticalPadding] = useState(0.4); 
  const [marginTop, setMarginTop] = useState(53); 
  const [background, setBackground] = useState('thai'); 
  const previewContainerRef = useRef(null);

  const toggleBackground = () => setBackground(prev => (prev === 'thai' ? 'laos' : 'thai'));

  const updateScale = () => {
    if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.clientWidth;
        const contentWidth = 960;
        setScale(Math.min(1, containerWidth / contentWidth));
    }
  };

  useLayoutEffect(() => {
      if (!scriptsLoaded || viewMode === 'preview') return;
      requestAnimationFrame(updateScale);
      const el = previewContainerRef.current;
      if (!el) return;
      const resizeObserver = new ResizeObserver(updateScale);
      resizeObserver.observe(el);
      return () => resizeObserver.disconnect();
  }, [viewMode, scriptsLoaded]);

  const handleUpdateItem = (id, field, value) => {
    setNewsItems(prevItems => prevItems.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addNewsItem = (day) => {
    const newId = newsItems.length > 0 ? Math.max(...newsItems.map(item => item.id)) + 1 : 1;
    setNewsItems([...newsItems, { id: newId, day: day, time: '00:00', flags: 'USA', description: 'ข่าวใหม่', value: '', importance: 'medium' }]);
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    const PapaLib = window.Papa;
    if (file && PapaLib) { 
        PapaLib.parse(file, {
            header: true, complete: (results) => {
                const importedData = results.data
                    .filter(row => row.day) // กรองแถวว่าง
                    .map((row, index) => ({
                        id: Date.now() + index, 
                        day: row.day || 'Mon', 
                        importance: row.importance || 'low',
                        flags: row.flags || '', 
                        time: row.time || '',
                        description: row.description || '', 
                        value: row.value || '',
                    }));
                if (importedData.length > 0) setNewsItems(importedData);
            }
        });
    }
  };

  const newsByDay = daysOfWeek.reduce((acc, day) => {
    acc[day] = newsItems.filter(item => item.day === day);
    return acc;
  }, {});

  if (!scriptsLoaded) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading components...</div>;

  if (viewMode === 'preview') {
      return (
          <div className="bg-black min-h-screen flex flex-col items-center justify-center p-4">
              <button onClick={() => setViewMode('editor')} className="fixed top-4 left-4 px-6 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-full shadow-lg z-20 flex items-center gap-2 border border-zinc-800">
                 <ChevronDown className="rotate-90" /> กลับหน้าแก้ไข
              </button>
              <CalendarPreview dateRange={dateRange} newsByDay={newsByDay} verticalPadding={verticalPadding} background={background} marginTop={marginTop} />
          </div>
      );
  }
  
  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen p-4 lg:p-8 select-none">
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;700&family=Noto+Sans+Lao:wght@400;700&display=swap');
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: #09090b; }
            ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
            ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
        `}</style>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Editor Section (Dark Mode UI) */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <div className="w-2 h-6 bg-cyan-500 rounded-full"></div>
                    กรอกข้อมูลปฏิทินข่าว
                </h2>
                <div className="flex items-center gap-2">
                    <input type="file" id="csv-input" className="hidden" accept=".csv" onChange={handleFileImport} />
                    <button onClick={() => document.getElementById('csv-input').click()} title="Import CSV" className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                        <FileText size={22} />
                    </button>
                    <button onClick={toggleBackground} className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 text-sm font-bold transition-all">
                        {background === 'thai' ? 'TH' : 'LA'}
                    </button>
                </div>
            </div>

            <div className="mb-8">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2 block">ช่วงวันที่</label>
              <input type="text" value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all" />
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 flex-grow custom-scrollbar">
              {daysOfWeek.map(day => (
                  <div key={day} className="bg-zinc-950/30 rounded-2xl border border-zinc-800/50 p-4">
                      <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-tighter">{day}</h3>
                          <button onClick={() => addNewsItem(day)} className="text-[10px] px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-all flex items-center gap-1">
                             <Plus size={12}/> เพิ่ม
                          </button>
                      </div>
                      <div className="space-y-3">
                          {newsByDay[day].length > 0 ? (
                              newsByDay[day].map(item => <EditableNewsRow key={item.id} item={item} onUpdate={handleUpdateItem} onRemove={(id) => setNewsItems(prev => prev.filter(n => n.id !== id))} onDuplicate={(id) => {
                                  const idx = newsItems.findIndex(n => n.id === id);
                                  const newItem = { ...newsItems[idx], id: Date.now() };
                                  const newArr = [...newsItems];
                                  newArr.splice(idx + 1, 0, newItem);
                                  setNewsItems(newArr);
                              }} />)
                          ) : (
                              <p className="text-zinc-800 text-xs italic text-center py-2">ไม่มีรายการ</p>
                          )}
                      </div>
                  </div>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div className="flex flex-col gap-6">
            <div ref={previewContainerRef} className="w-full flex-1 flex items-center justify-center aspect-[960/1200] overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 shadow-inner relative min-h-[500px]">
                <div style={{ transform: `scale(${scale})`, width: '960px', height: '1200px', transformOrigin: 'center center', transition: 'transform 0.1s ease-out' }}>
                  <CalendarPreview dateRange={dateRange} newsByDay={newsByDay} verticalPadding={verticalPadding} background={background} marginTop={marginTop} />
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">ระยะห่างบรรทัด</label>
                            <span className="text-xs font-mono text-cyan-500">{verticalPadding.toFixed(1)} rem</span>
                        </div>
                        <input type="range" min="0.1" max="2.0" step="0.1" value={verticalPadding} onChange={(e) => setVerticalPadding(parseFloat(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">ระยะห่างขอบบน</label>
                            <span className="text-xs font-mono text-cyan-500">{marginTop} px</span>
                        </div>
                        <input type="range" min="20" max="400" step="1" value={marginTop} onChange={(e) => setMarginTop(parseInt(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setViewMode('preview')} className="flex-1 px-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-cyan-400 shadow-lg w-full">
                        <Camera size={20} /> พรีวิวเต็มหน้าจอ
                    </button>
                </div>
            </div>
          </div>
        </div>
    </div>
  );
}