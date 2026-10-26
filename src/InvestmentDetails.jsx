import React, { useState, useEffect } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [notification, setNotification] = useState('Интерактивная карта Югры и каталог готовы к работе.');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
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

  const mapPaths = [
    { id: 'berezovsky-raion', name: 'Берёзовский район', d: 'M 60,30 L 160,20 L 190,100 L 140,180 L 60,150 Z' },
    { id: 'beloyarsky-raion', name: 'Белоярский район', d: 'M 160,20 L 300,30 L 320,120 L 190,100 Z' },
    { id: 'october-raion', name: 'Октябрьский район', d: 'M 190,100 L 320,120 L 290,200 L 160,180 Z' },
    { id: 'sovetsky-raion', name: 'Советский район', d: 'M 60,150 L 140,180 L 130,270 L 40,240 Z' },
    { id: 'ugorsk', name: 'Югорск', d: 'M 90,220 m -10, 0 a 10,10 0 1,0 20, 0 a 10,10 0 1,0 -20, 0' },
    { id: 'nyagan-city', name: 'Нягань', d: 'M 165,160 m -9, 0 a 9,9 0 1,0 18, 0 a 9,9 0 1,0 -18, 0' },
    { id: 'kondinsky-raion', name: 'Кондинский район', d: 'M 40,240 L 160,230 L 200,340 L 80,360 Z' },
    { id: 'uray', name: 'Урай', d: 'M 110,300 m -9, 0 a 9,9 0 1,0 18, 0 a 9,9 0 1,0 -18, 0' },
    { id: 'khanty-mansiysky-raion', name: 'Ханты-Мансийский район', d: 'M 160,180 L 290,200 L 310,310 L 200,340 Z' },
    { id: 'khanty-mansiysk', name: 'Ханты-Мансийск', d: 'M 220,245 m -11, 0 a 11,11 0 1,0 22, 0 a 11,11 0 1,0 -22, 0' },
    { id: 'nefteyugansky-raion', name: 'Нефтеюганский район', d: 'M 290,200 L 390,190 L 410,310 L 310,310 Z' },
    { id: 'nefteyugansk', name: 'Нефтеюганск', d: 'M 330,230 m -8, 0 a 8,8 0 1,0 16, 0 a 8,8 0 1,0 -16, 0' },
    { id: 'pyt-yah', name: 'Пыть-Ях', d: 'M 350,260 m -8, 0 a 8,8 0 1,0 16, 0 a 8,8 0 1,0 -16, 0' },
    { id: 'surgutsky', name: 'Сургутский район', d: 'M 320,120 L 490,100 L 510,250 L 390,190 Z' },
    { id: 'surgut', name: 'Сургут', d: 'M 410,210 m -11, 0 a 11,11 0 1,0 22, 0 a 11,11 0 1,0 -22, 0' },
    { id: 'kogalym', name: 'Когалым', d: 'M 450,140 m -9, 0 a 9,9 0 1,0 18, 0 a 9,9 0 1,0 -18, 0' },
    { id: 'nizhnevartovsky-raion', name: 'Нижневартовский район', d: 'M 490,100 L 700,120 L 670,320 L 510,250 Z' },
    { id: 'nizhnevartovsk', name: 'Нижневартовск', d: 'M 550,220 m -10, 0 a 10,10 0 1,0 20, 0 a 10,10 0 1,0 -20, 0' },
    { id: 'megion', name: 'Мегион', d: 'M 520,240 m -8, 0 a 8,8 0 1,0 16, 0 a 8,8 0 1,0 -16, 0' },
    { id: 'langepas', name: 'Лангепас', d: 'M 480,230 m -8, 0 a 8,8 0 1,0 16, 0 a 8,8 0 1,0 -16, 0' },
    { id: 'pokachi', name: 'Покачи', d: 'M 490,180 m -8, 0 a 8,8 0 1,0 16, 0 a 8,8 0 1,0 -16, 0' },
    { id: 'raduzhny', name: 'Радужный', d: 'M 590,160 m -9, 0 a 9,9 0 1,0 18, 0 a 9,9 0 1,0 -18, 0' },
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
                🗺️ Карта ХМАО
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

        {/* ================= РЕЖИМ 2: ГЕОГРАФИЧЕСКАЯ ИНТЕРАКТИВНАЯ КАРТА ХМАО ================= */}
        {activeTab === 'map' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black">Географическая карта ХМАО — Югры</h2>
                <p className="text-xs text-slate-400">Наведите на регион на карте или выберите в списке справа:</p>
              </div>
              <div className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900">
                {hoveredRegionId ? `Регион: ${data.municipalities.find(m => m.id === hoveredRegionId)?.name}` : 'Наведите курсор на карту'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <div className="lg:col-span-7 bg-slate-950 p-6 rounded-2xl border border-slate-800 flex items-center justify-center min-h-[500px] relative overflow-hidden">
                <svg viewBox="0 0 750 380" className="w-full h-auto max-h-[460px] drop-shadow-2xl">
                  {mapPaths.map((region) => {
                    const matchedItem = data.municipalities.find(m => m.id === region.id) || data.municipalities[0];
                    const isHovered = hoveredRegionId === region.id;

                    return (
                      <g 
                        key={region.id}
                        onMouseEnter={() => setHoveredRegionId(region.id)}
                        onMouseLeave={() => setHoveredRegionId(null)}
                        onClick={() => setActiveModalItem(matchedItem)}
                        className="cursor-pointer transition duration-200"
                      >
                        <path
                          d={region.d}
                          className={`transition duration-200 ${
                            isHovered 
                              ? 'fill-blue-600 stroke-white stroke-[2.5] scale-[1.02] z-30' 
                              : matchedItem.group2024 === 'A'
                              ? 'fill-emerald-950/80 stroke-emerald-500 stroke-[1.5] hover:fill-emerald-800'
                              : 'fill-slate-900 stroke-slate-700 stroke-[1.5] hover:fill-slate-800'
                          }`}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[500px] overflow-y-auto">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
                  Муниципальные районы и округа
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