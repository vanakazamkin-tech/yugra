import React, { useState, useEffect } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  
  // Состояния для одновременного выбора трех муниципалитетов для сравнения
  const [mun1, setMun1] = useState(data.municipalities[0].id);
  const [mun2, setMun2] = useState(data.municipalities[1] ? data.municipalities[1].id : data.municipalities[0].id);
  const [mun3, setMun3] = useState(data.municipalities[2] ? data.municipalities[2].id : data.municipalities[0].id);

  const [notification, setNotification] = useState('Система: режим параллельного сравнения трех муниципалитетов активен.');

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

  const item1 = data.municipalities.find((m) => m.id === mun1) || data.municipalities[0];
  const item2 = data.municipalities.find((m) => m.id === mun2) || data.municipalities[1];
  const item3 = data.municipalities.find((m) => m.id === mun3) || data.municipalities[2];

  // Функция выгрузки сводного отчета по трем муниципалитетам в PDF через печать
  const handleExportPDF = () => {
    setNotification('Формирование сводного сравнительного PDF-отчета...');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* ----------------- БЛОК ДЛЯ ПЕЧАТИ / ВЫГРУЗКИ В PDF ----------------- */}
      <div className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">
              Сводный сравнительный аналитический отчёт
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Сравнение инвестиционного климата МО ХМАО — Югры (2024 год)
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500">Дата генерации</span>
            <p className="text-sm font-bold">{new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[item1, item2, item3].map((item, idx) => (
            <div key={idx} className="p-4 border border-slate-300 rounded-lg bg-slate-50">
              <span className="text-xs font-bold text-blue-700 uppercase">#{idx + 1} в сравнении</span>
              <h2 className="text-lg font-black text-slate-900 mt-1">{item.name}</h2>
              <p className="text-xs text-slate-500 mb-3">Группа {item.group2024} (Место: #{item.rank2024})</p>
              
              <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
                <p><strong>Интегральный балл:</strong> {item.score}</p>
                <p><strong>Инвестиции (без добычи):</strong> {item.investments.volumeBillion} млрд руб.</p>
                <p><strong>Динамика роста:</strong> {item.investments.growthPercent}%</p>
                <p><strong>Субъекты МСП:</strong> {item.smeCount.toLocaleString()} ед.</p>
                <p><strong>Оценка бизнеса:</strong> {item.assessmentScore} / 5.0</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-slate-300 flex justify-between text-xs text-slate-500">
          <p>Сформировано автоматически на инвестиционном портале Югры</p>
          <p>Центр стратегических разработок Югры © 2024</p>
        </div>
      </div>

      {/* ----------------- ЭКРАННЫЙ ИНТЕРФЕЙС ----------------- */}
      <div className="print:hidden">
        {/* Шапка с уведомлением и темой */}
        <div className="max-w-6xl mx-auto mb-4 flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl shadow-sm">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">🔔 {notification}</span>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition"
          >
            {isDarkMode ? '☀️ Светлая тема' : '🌙 Темная тема'}
          </button>
        </div>

        {/* Панель управления и выбора трех объектов для сравнения */}
        <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full">
                Параллельное сравнение
              </span>
              <h1 className="text-2xl font-black mt-2">
                Сравнение трех муниципалитетов Югры
              </h1>
            </div>
            
            <button
              onClick={handleExportPDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
            >
              📄 Выгрузить сводный отчёт (PDF)
            </button>
          </div>

          {/* Селекторы для выбора трех муниципалитетов */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Муниципалитет №1</label>
              <select
                value={mun1}
                onChange={(e) => setMun1(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold"
              >
                {data.municipalities.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (#{m.rank2024})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Муниципалитет №2</label>
              <select
                value={mun2}
                onChange={(e) => setMun2(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold"
              >
                {data.municipalities.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (#{m.rank2024})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Муниципалитет №3</label>
              <select
                value={mun3}
                onChange={(e) => setMun3(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold"
              >
                {data.municipalities.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (#{m.rank2024})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Сравнительная сетка карточек (3 колонки) */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[item1, item2, item3].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">#{item.rank2024}</span>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full">
                    Группа {item.group2024}
                  </span>
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
                    <p className={`text-base font-extrabold ${item.investments.growthPercent >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {item.investments.growthPercent}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Субъекты МСП</p>
                    <p className="text-base font-bold">{item.smeCount.toLocaleString()} ед.</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Оценка бизнеса</p>
                    <p className="text-base font-bold text-blue-600 dark:text-blue-400">{item.assessmentScore} / 5.0</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvestmentDetails;