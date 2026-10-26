import React, { useState, useEffect } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'map', 'compare'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [notification, setNotification] = useState('Интерактивная географическая карта ХМАО — Югры загружена.');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

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
    setNotification('Формирование отчета для печати / PDF...');
    setTimeout(() => window.print(), 300);
  };

  // Координаты SVG-контуров для интерактивной карты ХМАО по муниципалитетам
  const svgRegions = [
    { id: 'berezovsky', name: 'Берёзовский район', path: 'M 40,30 L 150,20 L 180,90 L 130,160 L 50,140 Z', cx: 100, cy: 90 },
    { id: 'beloyarsky', name: 'Белоярский район', path: 'M 150,20 L 280,30 L 290,110 L 180,90 Z', cx: 220, cy: 65 },
    { id: 'october', name: 'Октябрьский район', path: 'M 180,90 L 290,110 L 260,180 L 160,160 Z', cx: 220, cy: 140 },
    { id: 'sovetsky', name: 'Советский район', path: 'M 50,140 L 130,160 L 120,240 L 40,220 Z', cx: 85, cy: 190 },
    { id: 'ugorsk', name: 'Югорск', path: 'M 75,210 A 10,10 0 1,1 95,210 A 10,10 0 1,1 75,210', cx: 85, cy: 210 },
    { id: 'nyagan', name: 'Нягань', path: 'M 140,170 A 10,10 0 1,1 160,170 A 10,10 0 1,1 140,170', cx: 150, cy: 170 },
    { id: 'kondinsky', name: 'Кондинский район', path: 'M 40,220 L 160,210 L 180,310 L 80,320 Z', cx: 110, cy: 260 },
    { id: 'uray', name: 'Урай', path: 'M 90,290 A 10,10 0 1,1 110,290 A 10,10 0 1,1 90,290', cx: 100, cy: 290 },
    { id: 'hm_raion', name: 'Ханты-Мансийский район', path: 'M 160,160 L 260,180 L 280,280 L 180,310 Z', cx: 220, cy: 235 },
    { id: 'hm_city', name: 'Ханты-Мансийск', path: 'M 195,230 A 12,12 0 1,1 219,230 A 12,12 0 1,1 195,230', cx: 207, cy: 230 },
    { id: 'nefteyugansky', name: 'Нефтеюганский район', path: 'M 260,180 L 350,170 L 360,270 L 280,280 Z', cx: 310, cy: 225 },
    { id: 'nefteyugansk', name: 'Нефтеюганск', path: 'M 295,215 A 8,8 0 1,1 311,215 A 8,8 0 1,1 295,215', cx: 303, cy: 215 },
    { id: 'pyть_yah', name: 'Пыть-Ях', path: 'M 315,240 A 8,8 0 1,1 331,240 A 8,8 0 1,1 315,240', cx: 323, cy: 240 },
    { id: 'surgutsky', name: 'Сургутский район', path: 'M 290,110 L 440,100 L 450,230 L 350,170 Z', cx: 375, cy: 150 },
    { id: 'surgut', name: 'Сургут', path: 'M 360,195 A 12,12 0 1,1 384,195 A 12,12 0 1,1 360,195', cx: 372, cy: 195 },
    { id: 'kogalym', name: 'Когалым', path: 'M 410,120 A 10,10 0 1,1 430,120 A 10,10 0 1,1 410,120', cx: 420, cy: 120 },
    { id: 'nizhnevartovsky', name: 'Нижневартовский район', path: 'M 440,100 L 600,120 L 580,280 L 450,230 Z', cx: 520, cy: 180 },
    { id: 'nizhnevartovsk', name: 'Нижневартовск', path: 'M 495,200 A 10,10 0 1,1 515,200 A 10,10 0 1,1 495,200', cx: 505, cy: 200 },
    { id: 'megion', name: 'Мегион', path: 'M 470,220 A 8,8 0 1,1 486,220 A 8,8 0 1,1 470,220', cx: 478, cy: 220 },
    { id: 'langepas', name: 'Лангепас', path: 'M 430,210 A 8,8 0 1,1 446,210 A 8,8 0 1,1 430,210', cx: 438, cy: 210 },
    { id: 'pokachi', name: 'Покачи', path: 'M 440,165 A 8,8 0 1,1 456,165 A 8,8 0 1,1 440,165', cx: 448, cy: 165 },
    { id: 'raduzhny', name: 'Радужный', path: 'M 520,140 A 10,10 0 1,1 540,140 A 10,10 0 1,1 520,140', cx: 530, cy: 140 },
  ];

  return (
    <div className="bg-slate-100 dark:bg-slate-950 min-h-screen p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* ПЕЧАТЬ (PDF) */}
      <div className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        <h1 className="text-2xl font-black uppercase mb-2">Аналитический отчет — ХМАО — Югра (2024)</h1>
        <table className="w-full border-collapse border border-slate-300 text-xs mt-4">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-300 p-2">Муниципальное образование</th>
              <th className="border border-slate-300 p-2 text-center">Группа</th>
              <th className="border border-slate-300 p-2 text-center">Балл</th>
              <th className="border border-slate-300 p-2 text-center">Инвестиции (млрд ₽)</th>
              <th className="border border-slate-300 p-2 text-center">МСП (ед.)</th>
            </tr>
          </thead>
          <tbody>
            {sortedMunicipalities.map(m => (
              <tr key={m.id}>
                <td className="border border-slate-300 p-2 font-bold">{m.name}</td>
                <td className="border border-slate-300 p-2 text-center">{m.group2024}</td>
                <td className="border border-slate-300 p-2 text-center">{m.score}</td>
                <td className="border border-slate-300 p-2 text-center">{m.investments.volumeBillion}</td>
                <td className="border border-slate-300 p-2 text-center">{m.smeCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ИНТЕРФЕЙС */}
      <div className="print:hidden max-w-7xl mx-auto">
        
        {/* Шапка */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white p-2.5 rounded-xl text-xl">🗺️</span>
            <div>
              <h1 className="text-base font-black tracking-tight">Муниципальные образования</h1>
              <p className="text-xs text-slate-500">Инвестиционный климат и интерактивная карта Югры</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-2 rounded-lg transition ${activeTab === 'catalog' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                🗂️ Каталог
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 py-2 rounded-lg transition ${activeTab === 'map' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                🗺️ Интерактивная карта ХМАО
              </button>
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-3 py-2 rounded-lg transition ${activeTab === 'compare' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                📊 Сводная таблица
              </button>
            </div>

            <button
              onClick={handleExportPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition"
            >
              📥 PDF
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Уведомление */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm">
          <span>💡</span> {notification}
        </div>

        {/* ================= РЕЖИМ 1: КАТАЛОГ ================= */}
        {activeTab === 'catalog' && (
          <div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="🔍 Поиск муниципалитета (Сургут, Нижневартовск, Ханты-Мансийск)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setSelectedGroup('ALL')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'ALL' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Все</button>
                <button onClick={() => setSelectedGroup('A')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'A' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Группа А</button>
                <button onClick={() => setSelectedGroup('B')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'B' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Группа B</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMunicipalities.map((m) => (
                <div 
                  key={m.id} 
                  onClick={() => setActiveModalItem(m)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-500 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Рейтинг: {m.score} балл.</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.group2024 === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400'}`}>
                        Группа {m.group2024}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">{m.name}</h3>
                    
                    <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Инвестиции (без добычи):</span>
                        <span className="font-bold">{m.investments.volumeBillion} млрд ₽</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Субъекты МСП:</span>
                        <span className="font-bold">{m.smeCount.toLocaleString()} ед.</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-blue-600">
                    <span>Открыть паспорт →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= РЕЖИМ 2: ГЕОГРАФИЧЕСКАЯ ИНТЕРАКТИВНАЯ SVG-КАРТА ХМАО ================= */}
        {activeTab === 'map' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black">Географическая карта ХМАО — Югры</h2>
                <p className="text-xs text-slate-400">Наведите на регион на карте или выберите из списка справа, чтобы просмотреть паспорт[cite: 14]:</p>
              </div>
              <div className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900">
                {hoveredRegion ? `Регион: ${hoveredRegion.name}` : 'Наведите курсор на карту региона'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ЛЕВАЯ КОЛОНКА: Векторная SVG-карта ХМАО с подсветкой областей */}
              <div className="lg:col-span-7 bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-center min-h-[480px] relative overflow-hidden">
                <div className="absolute top-4 left-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Интерактивный контур округа
                </div>

                <svg viewBox="0 0 650 350" className="w-full h-auto max-h-[450px]">
                  {svgRegions.map((reg) => {
                    const itemData = data.municipalities.find(m => m.name.toLowerCase().includes(reg.name.toLowerCase().split(' ')[0])) || data.municipalities[0];
                    const isHovered = hoveredRegion?.id === reg.id;

                    return (
                      <g key={reg.id} className="cursor-pointer" onClick={() => setActiveModalItem(itemData)} onMouseEnter={() => setHoveredRegion(itemData)} onMouseLeave={() => setHoveredRegion(null)}>
                        <path
                          d={reg.path}
                          className={`transition duration-200 ${
                            isHovered 
                              ? 'fill-blue-500 stroke-white stroke-2 z-20' 
                              : itemData.group2024 === 'A' 
                              ? 'fill-emerald-800/80 stroke-emerald-500 stroke-1 hover:fill-emerald-600' 
                              : 'fill-slate-800 stroke-slate-600 stroke-1 hover:fill-slate-700'
                          }`}
                        />
                        <text
                          x={reg.cx}
                          y={reg.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[9px] fill-white font-bold pointer-events-none drop-shadow"
                        >
                          {reg.name.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* ПРАВАЯ КОЛОНКА: Список муниципалитетов как на admhmao.ru */}
              <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[480px] overflow-y-auto">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
                  Муниципальные районы и округа
                </div>
                <div className="space-y-1.5">
                  {data.municipalities.map((m) => {
                    const isHovered = hoveredRegion?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onMouseEnter={() => setHoveredRegion(m)}
                        onMouseLeave={() => setHoveredRegion(null)}
                        onClick={() => setActiveModalItem(m)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold flex justify-between items-center transition cursor-pointer ${
                          isHovered
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-500'
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${isHovered ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm overflow-x-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-xl font-black">Сводная аналитическая таблица</h2>
                <p className="text-xs text-slate-400">Нажимайте на заголовки столбцов для быстрой сортировки</p>
              </div>
              <input
                type="text"
                placeholder="Фильтр показателей..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase">
                  <th className="p-3 cursor-pointer hover:text-blue-600" onClick={() => requestSort('name')}>Муниципальное образование ↕</th>
                  <th className="p-3 text-center cursor-pointer hover:text-blue-600" onClick={() => requestSort('group2024')}>Группа ↕</th>
                  <th className="p-3 text-center cursor-pointer hover:text-blue-600" onClick={() => requestSort('score')}>Балл ↕</th>
                  <th className="p-3 text-center cursor-pointer hover:text-blue-600" onClick={() => requestSort('investments')}>Инвестиции (млрд ₽) ↕</th>
                  <th className="p-3 text-center cursor-pointer hover:text-blue-600" onClick={() => requestSort('smeCount')}>МСП (ед.) ↕</th>
                  <th className="p-3 text-center">Оценка бизнеса</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedMunicipalities.map((m) => (
                  <tr 
                    key={m.id} 
                    onClick={() => setActiveModalItem(m)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{m.name}</td>
                    <td className="p-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${m.group2024 === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400'}`}>
                        {m.group2024}
                      </span>
                    </td>
                    <td className="p-3 text-center font-black text-blue-600 dark:text-blue-400">{m.score}</td>
                    <td className="p-3 text-center">{m.investments.volumeBillion}</td>
                    <td className="p-3 text-center">{m.smeCount.toLocaleString()}</td>
                    <td className="p-3 text-center font-semibold">{m.assessmentScore} / 5.0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= МОДАЛЬНОЕ ОКНО ПАСПОРТА ================= */}
        {activeModalItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 rounded-2xl shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold uppercase text-blue-600">Паспорт объекта</span>
                  <h2 className="text-2xl font-black mt-1">{activeModalItem.name}</h2>
                </div>
                <button 
                  onClick={() => setActiveModalItem(null)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold"
                >
                  ✕ Закрыть
                </button>
              </div>

              <div className="space-y-4 text-sm border-t border-b border-slate-100 dark:border-slate-800 py-4 my-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Группа рейтинга:</span>
                  <span className="font-bold">Группа {activeModalItem.group2024}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Итоговый балл:</span>
                  <span className="font-bold">{activeModalItem.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Объем инвестиций (без добычи):</span>
                  <span className="font-bold">{activeModalItem.investments.volumeBillion} млрд руб.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Динамика инвестиций:</span>
                  <span className="font-bold text-emerald-600">{activeModalItem.investments.growthPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Субъекты МСП:</span>
                  <span className="font-bold">{activeModalItem.smeCount.toLocaleString()} ед.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Оценка предпринимателей:</span>
                  <span className="font-bold text-blue-600">{activeModalItem.assessmentScore} / 5.0</span>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition"
              >
                🖨️ Распечатать / Сохранить PDF по этому объекту
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InvestmentDetails;