import React, { useState, useEffect } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  // Режим работы: 'single' (один муниципалитет) или 'compare' (сравнение трех)
  const [activeTab, setActiveTab] = useState('single');

  // Состояния для одиночного режима
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedId, setSelectedId] = useState(data.municipalities[0].id);

  // Состояния для режима сравнения (3 муниципалитета)
  const [mun1, setMun1] = useState(data.municipalities[0].id);
  const [mun2, setMun2] = useState(data.municipalities[1] ? data.municipalities[1].id : data.municipalities[0].id);
  const [mun3, setMun3] = useState(data.municipalities[2] ? data.municipalities[2].id : data.municipalities[0].id);

  const [notification, setNotification] = useState('Система: инвестиционный портал Югры готов к работе.');

  // Тема
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
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

  const currentItem = data.municipalities.find((m) => m.id === selectedId) || data.municipalities[0];
  const item1 = data.municipalities.find((m) => m.id === mun1) || data.municipalities[0];
  const item2 = data.municipalities.find((m) => m.id === mun2) || data.municipalities[1];
  const item3 = data.municipalities.find((m) => m.id === mun3) || data.municipalities[2];

  const handleExportPDF = () => {
    setNotification('Формирование отчета для печати / PDF...');
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* ----------------- ПЕЧАТЬ / PDF ----------------- */}
      <div className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        <h1 className="text-2xl font-black uppercase mb-4">Аналитический отчет Югры (2024)</h1>
        {activeTab === 'single' ? (
          <div>
            <h2 className="text-xl font-bold">{currentItem.name}</h2>
            <p>Рейтинг: #{currentItem.rank2024} (Группа {currentItem.group2024})</p>
            <p>Балл: {currentItem.score}</p>
            <p>Инвестиции: {currentItem.investments.volumeBillion} млрд руб. ({currentItem.investments.growthPercent}%)</p>
            <p>МСП: {currentItem.smeCount} ед.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {[item1, item2, item3].map((it, idx) => (
              <div key={idx} className="border p-4">
                <h3 className="font-bold">{it.name}</h3>
                <p>Балл: {it.score}</p>
                <p>Инвестиции: {it.investments.volumeBillion} млрд</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----------------- ЭКРАННЫЙ ИНТЕРФЕЙС ----------------- */}
      <div className="print:hidden">
        {/* Верхняя панель: Уведомление, Переключатель вкладок и Темная тема */}
        <div className="max-w-6xl mx-auto mb-4 flex flex-col md:flex-row justify-between items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl shadow-sm">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">🔔 {notification}</span>
          
          <div className="flex items-center gap-3">
            {/* Переключатель режимов (Вкладки) */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === 'single' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Общий режим
              </button>
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === 'compare' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                ⚖️ Сравнение (3)
              </button>
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold rounded-lg transition"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* ================= РЕЖИМ 1: ОБЩИЙ (КАК БЫЛО РАНЬШЕ) ================= */}
        {activeTab === 'single' && (
          <div>
            <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full">
                    Инвестиционный портал Югры
                  </span>
                  <h1 className="text-2xl font-black mt-2">Рейтинг муниципалитетов (2024)</h1>
                </div>
                <button
                  onClick={handleExportPDF}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition"
                >
                  📄 Выгрузить отчёт (PDF)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="🔍 Поиск муниципалитета..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none"
                />
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button onClick={() => setSelectedGroup('ALL')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${selectedGroup === 'ALL' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Все</button>
                  <button onClick={() => setSelectedGroup('A')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${selectedGroup === 'A' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Группа А</button>
                  <button onClick={() => setSelectedGroup('B')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${selectedGroup === 'B' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>Группа B</button>
                </div>
              </div>

              {/* Чипсы */}
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                {filteredMunicipalities.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedId === m.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                  >
                    #{m.rank2024} {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Карточки общего режима */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">#{currentItem.rank2024}</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-full">Группа {currentItem.group2024}</span>
                  </div>
                  <h2 className="text-xl font-bold">{currentItem.name}</h2>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 font-bold uppercase">Интегральный балл</p>
                  <p className="text-3xl font-black mt-1">{currentItem.score}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Инвестиционная активность</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400">Объем инвестиций (без добычи)</p>
                    <p className="text-xl font-bold">{currentItem.investments.volumeBillion} млрд руб.</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Динамика роста</p>
                    <p className="text-lg font-extrabold text-emerald-600">{currentItem.investments.growthPercent}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Малый и средний бизнес</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400">Субъекты МСП</p>
                    <p className="text-xl font-bold">{currentItem.smeCount.toLocaleString()} ед.</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Оценка предпринимателями</p>
                    <p className="text-lg font-extrabold text-blue-600">{currentItem.assessmentScore} / 5.00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= РЕЖИМ 2: СРАВНЕНИЕ ТРЕХ МУНИЦИПАЛИТЕТОВ ================= */}
        {activeTab === 'compare' && (
          <div>
            <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full">
                    Режим сопоставления
                  </span>
                  <h1 className="text-2xl font-black mt-2">Параллельное сравнение трех объектов</h1>
                </div>
                <button
                  onClick={handleExportPDF}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition"
                >
                  📄 Выгрузить сводный отчёт (PDF)
                </button>
              </div>

              {/* Селекторы */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Муниципалитет №1</label>
                  <select value={mun1} onChange={(e) => setMun1(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold">
                    {data.municipalities.map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.rank2024})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Муниципалитет №2</label>
                  <select value={mun2} onChange={(e) => setMun2(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold">
                    {data.municipalities.map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.rank2024})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Муниципалитет №3</label>
                  <select value={mun3} onChange={(e) => setMun3(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold">
                    {data.municipalities.map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.rank2024})</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Карточки сравнения */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {[item1, item2, item3].map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">#{item.rank2024}</span>
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-full">Группа {item.group2024}</span>
                    </div>
                    <h2 className="text-xl font-bold mb-4">{item.name}</h2>
                    
                    <div className="space-y-4 text-sm border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">Интегральный балл</p>
                        <p className="text-2xl font-black mt-1">{item.score}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Объем инвестиций (без добычи)</p>
                        <p className="text-base font-bold">{item.investments.volumeBillion} млрд руб.</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Динамика роста</p>
                        <p className="text-base font-extrabold text-emerald-600">{item.investments.growthPercent}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Субъекты МСП</p>
                        <p className="text-base font-bold">{item.smeCount.toLocaleString()} ед.</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Оценка бизнеса</p>
                        <p className="text-base font-bold text-blue-600">{item.assessmentScore} / 5.0</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentDetails;