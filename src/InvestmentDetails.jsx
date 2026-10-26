import React, { useState, useEffect } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' или 'compare'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  
  // Модальное окно для детального просмотра конкретного муниципалитета (решает проблему «сплошной страницы»)
  const [activeModalItem, setActiveModalItem] = useState(null);

  // Для режима сравнения (3 объекта)
  const [mun1, setMun1] = useState(data.municipalities[0].id);
  const [mun2, setMun2] = useState(data.municipalities[1] ? data.municipalities[1].id : data.municipalities[0].id);
  const [mun3, setMun3] = useState(data.municipalities[2] ? data.municipalities[2].id : data.municipalities[0].id);

  const [notification, setNotification] = useState('Каталог обновлен по требованиям команды: плиточный вид и фильтры.');
  
  // Тема
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

  // Фильтрация для каталога
  const filteredMunicipalities = data.municipalities.filter((m) => {
    const matchesGroup = selectedGroup === 'ALL' || m.group2024 === selectedGroup;
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const item1 = data.municipalities.find((m) => m.id === mun1) || data.municipalities[0];
  const item2 = data.municipalities.find((m) => m.id === mun2) || data.municipalities[1];
  const item3 = data.municipalities.find((m) => m.id === mun3) || data.municipalities[2];

  const handleExportPDF = () => {
    setNotification('Подготовка отчета к печати...');
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-950 min-h-screen p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* ПЕЧАТЬ / PDF */}
      <div className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        <h1 className="text-2xl font-black uppercase mb-4">Инвестиционный каталог Югры (2024)</h1>
        <p className="text-sm mb-6">Официальный выгруженный отчет по запросу руководства команды.</p>
        <div className="grid grid-cols-2 gap-4">
          {filteredMunicipalities.map((m) => (
            <div key={m.id} className="border p-4 rounded mb-2">
              <h3 className="font-bold">#{m.rank2024} {m.name} (Группа {m.group2024})</h3>
              <p className="text-xs">Балл: {m.score} | Инвестиции: {m.investments.volumeBillion} млрд руб.</p>
            </div>
          ))}
        </div>
      </div>

      <div className="print:hidden max-w-7xl mx-auto">
        
        {/* Шапка-навигация */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white p-2 rounded-xl text-lg">📊</span>
            <div>
              <h1 className="text-lg font-black">ИнвестКаталог Югры</h1>
              <p className="text-xs text-slate-500">Муниципальные образования (Версия 2.0 по ТЗ лидера)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'catalog' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                🗂️ Каталог объектов
              </button>
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'compare' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                ⚖️ Сравнение (3)
              </button>
            </div>

            <button
              onClick={handleExportPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition"
              title="Печать / Сохранить PDF"
            >
              📥 PDF
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold transition"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Уведомление */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <span>💡</span> {notification}
        </div>

        {/* ================= РЕЖИМ 1: КАТАЛОГ ПЛИТКОЙ (В стиле соцсетей/каталогов) ================= */}
        {activeTab === 'catalog' && (
          <div>
            {/* Панель фильтров и поиска */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="🔍 Найти муниципалитет (например: Сургут, Урай, Нижневартовск)..."
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

            {/* Сетка карточек (Каталог) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMunicipalities.map((m) => (
                <div 
                  key={m.id} 
                  onClick={() => setActiveModalItem(m)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-2xl font-black text-blue-600 dark:text-blue-400">#{m.rank2024}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.group2024 === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400'}`}>
                        Группа {m.group2024}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{m.name}</h3>
                    <p className="text-xs text-slate-400 mb-4">Интегральный рейтинг: <strong className="text-slate-700 dark:text-slate-200">{m.score} балл.</strong></p>
                    
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

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span>Подробный паспорт →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= РЕЖИМ 2: СРАВНЕНИЕ ТРЕХ МУНИЦИПАЛИТЕТОВ ================= */}
        {activeTab === 'compare' && (
          <div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm mb-6">
              <h2 className="text-xl font-black mb-4">Параллельное сравнение трех муниципалитетов</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Объект №1</label>
                  <select value={mun1} onChange={(e) => setMun1(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold">
                    {data.municipalities.map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.rank2024})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Объект №2</label>
                  <select value={mun2} onChange={(e) => setMun2(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold">
                    {data.municipalities.map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.rank2024})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Объект №3</label>
                  <select value={mun3} onChange={(e) => setMun3(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-semibold">
                    {data.municipalities.map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.rank2024})</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[item1, item2, item3].map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-3xl font-extrabold text-blue-600">#{item.rank2024}</span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-full">Группа {item.group2024}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-4">{item.name}</h3>
                  <div className="space-y-3 text-sm border-t border-slate-100 dark:border-slate-800 pt-4">
                    <p><strong>Балл:</strong> {item.score}</p>
                    <p><strong>Инвестиции:</strong> {item.investments.volumeBillion} млрд руб.</p>
                    <p><strong>Рост:</strong> {item.investments.growthPercent}%</p>
                    <p><strong>МСП:</strong> {item.smeCount.toLocaleString()} ед.</p>
                    <p><strong>Оценка бизнеса:</strong> {item.assessmentScore} / 5.0</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* МОДАЛЬНОЕ ОКНО ДЕТАЛЬНОГО ПРОСМОТРА (Решение проблемы лидера со сплошной страницей) */}
        {activeModalItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold uppercase text-blue-600">Паспорт муниципалитета</span>
                  <h2 className="text-2xl font-black mt-1">#{activeModalItem.rank2024} {activeModalItem.name}</h2>
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
                onClick={() => {
                  window.print();
                }}
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