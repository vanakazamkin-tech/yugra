import React, { useState, useEffect } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [notification, setNotification] = useState('Интерактивная карта Югры стабилизирована.');
  
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') === 'dark';
      setIsDarkMode(savedTheme);
      if (savedTheme) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

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
                placeholder="🔍 Поиск муниципалитета..."
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

        {/* ================= РЕЖИМ 2: СЕТЕВАЯ ИНТЕРАКТИВНАЯ КАРТА ХМАО ================= */}
        {activeTab === 'map' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black">Интерактивная карта муниципальных образований ХМАО</h2>
                <p className="text-xs text-slate-400">Нажимайте на секторы на карте или выбирайте в списке справа:</p>
              </div>
              <div className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900">
                {hoveredRegionId ? `Выбран: ${data.municipalities.find(m => m.id === hoveredRegionId)?.name}` : 'Наведите на сектор'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* СЕТКА СЕКТОРОВ КАРТЫ */}
              <div className="lg:col-span-7 bg-slate-950 p-6 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-[500px] content-start overflow-y-auto max-h-[500px]">
                {data.municipalities.map((m) => {
                  const isHovered = hoveredRegionId === m.id;
                  const isGroupA = m.group2024 === 'A';

                  return (
                    <div
                      key={m.id}
                      onMouseEnter={() => setHoveredRegionId(m.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                      onClick={() => setActiveModalItem(m)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[90px] ${
                        isHovered 
                          ? 'bg-blue-600 border-white text-white shadow-lg scale-105 z-10' 
                          : isGroupA
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/60'
                          : 'bg-slate-900/85 border-slate-700/70 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold uppercase opacity-75">Гр. {m.group2024}</span>
                        <span className="text-[10px] font-mono opacity-60">#{m.rank2024}</span>
                      </div>
                      <div className="font-bold text-xs leading-tight mt-1">{m.name}</div>
                      <div className="text-[10px] opacity-80 mt-1 font-mono">{m.score} балл.</div>
                    </div>
                  );
                })}
              </div>

              {/* СПИСОК СПРАВА */}
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