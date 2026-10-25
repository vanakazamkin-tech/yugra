import React, { useState, useEffect } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedId, setSelectedId] = useState(data.municipalities[0].id);
  const [notification, setNotification] = useState('Система: подключены актуальные источники данных за 2024 год.');

  // Состояние темы (проверяем системные настройки или localStorage)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Эффект для переключения класса 'dark' на корневом элементе HTML
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

  const handleExportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      municipality: currentItem,
      status: 'Успешно выгружено из аналитической системы Югры'
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${currentItem.id}.json`;
    link.click();
    setNotification(`Отчет по муниципалитету "${currentItem.name}" успешно сформирован.`);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Шапка с переключателем темы */}
      <div className="max-w-6xl mx-auto mb-4 flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl shadow-sm">
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">🔔 {notification}</span>
        
        {/* Кнопка смены темы */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition"
        >
          {isDarkMode ? '☀️ Светлая тема' : '🌙 Темная тема'}
        </button>
      </div>

      {/* Панель фильтров и дашборда */}
      <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full">
              Инвестиционный портал Югры
            </span>
            <h1 className="text-2xl font-black mt-2">
              Аналитический дашборд муниципалитетов
            </h1>
          </div>
          <button
            onClick={handleExportReport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition"
          >
            📥 Выгрузить отчёт (JSON)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="🔍 Фильтр: поиск по названию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setSelectedGroup('ALL')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'ALL' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Все
            </button>
            <button
              onClick={() => setSelectedGroup('A')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'A' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Группа А
            </button>
            <button
              onClick={() => setSelectedGroup('B')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'B' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Группа B
            </button>
          </div>
        </div>

        {/* Чипсы выбора муниципалитета */}
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-2 border-t border-slate-100 dark:border-slate-800">
          {filteredMunicipalities.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedId === m.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              #{m.rank2024} {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Карточки показателей */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">#{currentItem.rank2024}</span>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full">
                Группа {currentItem.group2024}
              </span>
            </div>
            <h2 className="text-xl font-bold">{currentItem.name}</h2>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 font-bold uppercase">Интегральный балл</p>
            <p className="text-3xl font-black mt-1">{currentItem.score}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Инвестиционная активность
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">Объем инвестиций (без добычи)</p>
              <p className="text-xl font-bold">{currentItem.investments.volumeBillion} млрд руб.</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Динамика / Прогноз роста</p>
              <p className={`text-lg font-extrabold ${currentItem.investments.growthPercent >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {currentItem.investments.growthPercent}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Развитие МСП и Оценка бизнеса
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">Субъекты МСП</p>
              <p className="text-xl font-bold">{currentItem.smeCount.toLocaleString()} ед.</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Оценка предпринимателями</p>
              <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                {currentItem.assessmentScore} / 5.00
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentDetails;