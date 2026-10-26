import React, { useState, useEffect } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [notification, setNotification] = useState('Инвестиционный портал ХМАО — Югры в стиле традиционных узоров ханты и манси.');
  
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  const filteredMunicipalities = data.municipalities.filter((m) => {
    const matchesGroup = selectedGroup === 'ALL' || m.group2024 === selectedGroup;
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const sortedMunicipalities = [...filteredMunicipalities].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (sortConfig.key === 'investments') {
      aVal = a.investments.volumeBillion;
      bVal = b.investments.volumeBillion;
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExportPDF = () => {
    setNotification('Формирование официального аналитического отчета...');
    setTimeout(() => window.print(), 300);
  };

  // Географические контуры ХМАО с плавными границами
  const detailedUgraMap = [
    { id: 'berezovsky-raion', name: 'Берёзовский район', d: 'M 70,70 C 50,90 40,130 60,170 C 80,200 120,210 140,180 C 160,150 170,100 140,60 C 110,30 90,50 70,70 Z' },
    { id: 'beloyarsky-raion', name: 'Белоярский район', d: 'M 140,60 C 170,40 220,30 270,50 C 310,70 330,120 290,150 C 250,180 180,160 140,60 Z' },
    { id: 'october-raion', name: 'Октябрьский район', d: 'M 140,180 C 180,160 250,180 280,210 C 250,250 180,230 140,180 Z' },
    { id: 'sovetsky-raion', name: 'Советский район', d: 'M 60,170 C 90,170 120,200 130,240 C 100,270 70,250 60,170 Z' },
    { id: 'kondinsky-raion', name: 'Кондинский район', d: 'M 70,250 C 110,260 160,290 180,340 C 140,380 90,360 70,250 Z' },
    { id: 'khanty-mansiysky-raion', name: 'Ханты-Мансийский район', d: 'M 140,180 C 180,230 250,250 270,290 C 230,340 180,340 140,180 Z' },
    { id: 'surgutsky', name: 'Сургутский район', d: 'M 290,150 C 350,110 440,100 480,160 C 520,220 400,270 290,150 Z' },
    { id: 'nizhnevartovsky-raion', name: 'Нижневартовский район', d: 'M 480,160 C 540,120 620,150 640,230 C 600,320 480,310 480,160 Z' },
    { id: 'nefteyugansky-raion', name: 'Нефтеюганский район', d: 'M 270,290 C 350,270 420,270 400,330 C 330,360 270,330 270,290 Z' }
  ];

  return (
    <div className="bg-zinc-950 min-h-screen p-4 md:p-8 font-sans text-zinc-100 selection:bg-amber-500 selection:text-black">
      
      {/* Декоративный орнаментальный бордер (мотив «берёзовая ветка») */}
      <div className="max-w-7xl mx-auto mb-4 border-b-2 border-amber-500/40 pb-3 flex justify-between items-center text-xs tracking-widest uppercase text-amber-400 font-semibold">
        <span>⌁ ⌁ ⌁ ХМАО — ЮГРА ⌁ ⌁ ⌁</span>
        <span>ИНВЕСТИЦИОННЫЙ КЛИМАТ И МУНИЦИПАЛИТЕТЫ</span>
        <span>⌁ ⌁ ⌁ ХАНТЫ И МАНСИ ⌁ ⌁ ⌁</span>
      </div>

      {/* ПЕЧАТЬ (PDF) */}
      <div className="hidden print:block p-8 bg-white text-zinc-900 font-sans">
        <h1 className="text-2xl font-black uppercase mb-2">Инвестиционный паспорт — ХМАО — Югра (2024)</h1>
        <table className="w-full border-collapse border border-zinc-300 text-xs mt-4">
          <thead>
            <tr className="bg-zinc-100 text-left">
              <th className="border border-zinc-300 p-2">Муниципальное образование</th>
              <th className="border border-zinc-300 p-2 text-center">Группа</th>
              <th className="border border-zinc-300 p-2 text-center">Балл</th>
              <th className="border border-zinc-300 p-2 text-center">Инвестиции (млрд ₽)</th>
              <th className="border border-zinc-300 p-2 text-center">МСП (ед.)</th>
            </tr>
          </thead>
          <tbody>
            {sortedMunicipalities.map(m => (
              <tr key={m.id}>
                <td className="border border-zinc-300 p-2 font-bold">{m.name}</td>
                <td className="border border-zinc-300 p-2 text-center">{m.group2024}</td>
                <td className="border border-zinc-300 p-2 text-center">{m.score}</td>
                <td className="border border-zinc-300 p-2 text-center">{m.investments.volumeBillion}</td>
                <td className="border border-zinc-300 p-2 text-center">{m.smeCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ИНТЕРФЕЙС */}
      <div className="print:hidden max-w-7xl mx-auto">
        
        {/* Шапка в этническом премиальном стиле */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/90 border border-amber-500/30 p-5 rounded-2xl shadow-xl shadow-amber-950/20 mb-6 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-zinc-950 p-3 rounded-xl text-2xl shadow-inner font-black flex items-center justify-center border border-amber-300/40">
              🪶
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider text-amber-200">ЮГРА ИНВЕСТУГОЛЬ / МУНИЦИПАЛИТЕТЫ</h1>
              <p className="text-xs text-zinc-400">Традиции Севера и развитие экономики региона</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-zinc-950 p-1 rounded-xl text-xs font-bold border border-zinc-800">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 rounded-lg transition ${activeTab === 'catalog' ? 'bg-amber-500 text-zinc-950 font-black shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                🗂️ Каталог
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2 rounded-lg transition ${activeTab === 'map' ? 'bg-amber-500 text-zinc-950 font-black shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                🗺️ Карта ХМАО
              </button>
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-4 py-2 rounded-lg transition ${activeTab === 'compare' ? 'bg-amber-500 text-zinc-950 font-black shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                📊 Сводная таблица
              </button>
            </div>

            <button
              onClick={handleExportPDF}
              className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/40 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <span>📥</span> PDF Отчет
            </button>
          </div>
        </header>

        {/* Уведомление в стиле орнамента «процветание» */}
        <div className="mb-6 bg-zinc-900/80 border-l-4 border-amber-500 text-amber-200 px-4 py-3 rounded-r-xl text-xs flex items-center gap-3 shadow-lg border-t border-r border-b border-zinc-800">
          <span className="text-amber-400 text-base">❖</span> 
          <span>{notification}</span>
        </div>

        {/* ================= РЕЖИМ 1: КАТАЛОГ ================= */}
        {activeTab === 'catalog' && (
          <div>
            <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="🔍 Поиск муниципалитета (Сургут, Ханты-Мансийск, Нижневартовск)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button onClick={() => setSelectedGroup('ALL')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'ALL' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400'}`}>Все</button>
                <button onClick={() => setSelectedGroup('A')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'A' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'text-zinc-400'}`}>Группа А (Лидеры)</button>
                <button onClick={() => setSelectedGroup('B')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'B' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'text-zinc-400'}`}>Группа B (Развитие)</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMunicipalities.map((m) => (
                <div 
                  key={m.id} 
                  onClick={() => setActiveModalItem(m)}
                  className="bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/60 rounded-2xl p-5 shadow-xl hover:shadow-amber-500/10 transition cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent pointer-events-none rounded-bl-full"></div>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Рейтинг: {m.score} балл.</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.group2024 === 'A' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                        Группа {m.group2024}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-zinc-100 group-hover:text-amber-300 transition">{m.name}</h3>
                    
                    <div className="space-y-2 text-xs border-t border-zinc-800 pt-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Инвестиции (без добычи):</span>
                        <span className="font-bold text-zinc-200">{m.investments.volumeBillion} млрд ₽</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Субъекты МСП:</span>
                        <span className="font-bold text-zinc-200">{m.smeCount.toLocaleString()} ед.</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Открыть инвестиционный паспорт →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= РЕЖИМ 2: ГЕОГРАФИЧЕСКАЯ ИНТЕРАКТИВНАЯ КАРТА ХМАО ================= */}
        {activeTab === 'map' && (
          <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-amber-200">Географическая карта ХМАО — Югры</h2>
                <p className="text-xs text-zinc-400">Наведите на регион на карте или выберите в списке справа:</p>
              </div>
              <div className="text-xs bg-amber-950/60 text-amber-300 font-bold px-3 py-1.5 rounded-xl border border-amber-800/60 shadow-sm">
                {hoveredRegionId ? `Регион: ${data.municipalities.find(m => m.id === hoveredRegionId)?.name}` : '❖ Наведите на карту региона'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ГЕОГРАФИЧЕСКАЯ SVG КАРТА В ТАЁЖНОЙ СТИЛИСТИКЕ */}
              <div className="lg:col-span-7 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 flex items-center justify-center min-h-[500px] relative overflow-hidden shadow-inner">
                <svg viewBox="0 0 700 420" className="w-full h-auto max-h-[460px] drop-shadow-2xl">
                  {detailedUgraMap.map((reg) => {
                    const matchedItem = data.municipalities.find(m => m.id === reg.id) || data.municipalities[0];
                    const isHovered = hoveredRegionId === reg.id;

                    return (
                      <g 
                        key={reg.id}
                        onMouseEnter={() => setHoveredRegionId(reg.id)}
                        onMouseLeave={() => setHoveredRegionId(null)}
                        onClick={() => setActiveModalItem(matchedItem)}
                        className="cursor-pointer transition-all duration-200"
                      >
                        <path
                          d={reg.d}
                          className={`transition-all duration-300 ${
                            isHovered 
                              ? 'fill-amber-500 stroke-zinc-100 stroke-[2.5] scale-[1.02]' 
                              : matchedItem.group2024 === 'A'
                              ? 'fill-emerald-950/70 stroke-emerald-500 stroke-[1.5] hover:fill-emerald-900'
                              : 'fill-zinc-900 stroke-zinc-700 stroke-[1.5] hover:fill-zinc-800'
                          }`}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* СПИСОК СПРАВА */}
              <div className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 max-h-[500px] overflow-y-auto">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-500/80 mb-3 px-2 flex items-center gap-2">
                  <span>❖</span> Муниципальные образования Югры
                </div>
                <div className="space-y-1.5">
                  {data.municipalities.map((m) => {
                    const isHovered = hoveredRegionId === m.id;
                    return (
                      <div
                        key={m.id}
                        onMouseEnter={() => setHoveredRegionId(m.id)}
                        onMouseLeave={() => setHoveredRegionId(null)}
                        onClick={() => setActiveModalItem(m)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold flex justify-between items-center transition cursor-pointer ${
                          isHovered
                            ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-amber-500/50'
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${isHovered ? 'bg-amber-700 text-zinc-100' : 'bg-zinc-800 text-zinc-400'}`}>
                          Гр. {m.group2024}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= РЕЖИМ 3: СВОДНАЯ ТАБЛИЦА ================= */}
        {activeTab === 'compare' && (
          <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl overflow-x-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-xl font-black text-amber-200">Сводная аналитическая таблица</h2>
                <p className="text-xs text-zinc-400">Нажимайте на заголовки столбцов для быстрой сортировки</p>
              </div>
              <input
                type="text"
                placeholder="Фильтр показателей..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-500"
              />
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-amber-400 uppercase tracking-wider">
                  <th className="p-3 cursor-pointer hover:text-amber-300" onClick={() => requestSort('name')}>Муниципальное образование ↕</th>
                  <th className="p-3 text-center cursor-pointer hover:text-amber-300" onClick={() => requestSort('group2024')}>Группа ↕</th>
                  <th className="p-3 text-center cursor-pointer hover:text-amber-300" onClick={() => requestSort('score')}>Балл ↕</th>
                  <th className="p-3 text-center cursor-pointer hover:text-amber-300" onClick={() => requestSort('investments')}>Инвестиции (млрд ₽) ↕</th>
                  <th className="p-3 text-center cursor-pointer hover:text-amber-300" onClick={() => requestSort('smeCount')}>МСП (ед.) ↕</th>
                  <th className="p-3 text-center">Оценка бизнеса</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {sortedMunicipalities.map((m) => (
                  <tr 
                    key={m.id} 
                    onClick={() => setActiveModalItem(m)}
                    className="hover:bg-zinc-800/40 cursor-pointer transition"
                  >
                    <td className="p-3 font-bold text-zinc-200">{m.name}</td>
                    <td className="p-3 text-center font-bold">
                      <span className={`px-2.5 py-1 rounded text-[10px] ${m.group2024 === 'A' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                        Группа {m.group2024}
                      </span>
                    </td>
                    <td className="p-3 text-center font-black text-amber-400">{m.score}</td>
                    <td className="p-3 text-center text-zinc-300">{m.investments.volumeBillion}</td>
                    <td className="p-3 text-center text-zinc-300">{m.smeCount.toLocaleString()}</td>
                    <td className="p-3 text-center font-semibold text-zinc-200">{m.assessmentScore} / 5.0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= МОДАЛЬНОЕ ОКНО ПАСПОРТА ================= */}
        {activeModalItem && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-amber-500/40 max-w-lg w-full p-6 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <span>❖</span> Паспорт муниципального образования
                  </span>
                  <h2 className="text-2xl font-black mt-1 text-zinc-100">{activeModalItem.name}</h2>
                </div>
                <button 
                  onClick={() => setActiveModalItem(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-zinc-700"
                >
                  ✕ Закрыть
                </button>
              </div>

              <div className="space-y-4 text-sm border-t border-b border-zinc-800 py-4 my-4">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Группа рейтинга:</span>
                  <span className="font-bold text-amber-300">Группа {activeModalItem.group2024}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Итоговый балл:</span>
                  <span className="font-bold text-zinc-100">{activeModalItem.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Объем инвестиций (без добычи):</span>
                  <span className="font-bold text-zinc-100">{activeModalItem.investments.volumeBillion} млрд руб.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Динамика инвестиций:</span>
                  <span className="font-bold text-emerald-400">+{activeModalItem.investments.growthPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Субъекты МСП:</span>
                  <span className="font-bold text-zinc-100">{activeModalItem.smeCount.toLocaleString()} ед.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Оценка предпринимателей:</span>
                  <span className="font-bold text-amber-400">{activeModalItem.assessmentScore} / 5.0</span>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 py-3 rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20"
              >
                🖨️ Распечатать / Сохранить паспорт объекта в PDF
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InvestmentDetails;