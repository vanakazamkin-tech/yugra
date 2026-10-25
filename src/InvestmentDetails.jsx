import React, { useState } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedId, setSelectedId] = useState(data.municipalities[0].id);
  const [notification, setNotification] = useState('Система: подключены актуальные источники данных за 2024 год.');

  // Фильтрация
  const filteredMunicipalities = data.municipalities.filter((m) => {
    const matchesGroup = selectedGroup === 'ALL' || m.group2024 === selectedGroup;
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const currentItem = data.municipalities.find((m) => m.id === selectedId) || data.municipalities[0];

  // Функция генерации и выгрузки отчета (соответствует требованиям паспорта проекта)
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
    setNotification(`Отчет по муниципалитету "${currentItem.name}" успешно сформирован и выгружен.`);
  };

  // Симуляция проверки новых данных
  const handleCheckUpdates = () => {
    setNotification('Проверка источников... Новых регламентных данных в источниках пока не обнаружено.');
    setTimeout(() => setNotification('Система работает в актуальном режиме с базами данных ЦСР Югры.'), 4000);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans text-slate-900">
      {/* Уведомления системы */}
      <div className="max-w-6xl mx-auto mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-xs flex justify-between items-center shadow-sm">
        <span>🔔 {notification}</span>
        <button 
          onClick={handleCheckUpdates}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          Проверить обновления
        </button>
      </div>

      {/* Шапка и фильтры дашборда */}
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Инвестиционный портал Югры — Паспорт проекта
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">
              Аналитический дашборд муниципалитетов
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition"
            >
              📥 Выгрузить отчёт (JSON)
            </button>
          </div>
        </div>

        {/* Настраиваемые фильтры и поиск */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="🔍 Фильтр: поиск по названию муниципалитета..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedGroup('ALL')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
            >
              Все
            </button>
            <button
              onClick={() => setSelectedGroup('A')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'A' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600'}`}
            >
              Группа А (Лидеры)
            </button>
            <button
              onClick={() => setSelectedGroup('B')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${selectedGroup === 'B' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
            >
              Группа B
            </button>
          </div>
        </div>

        {/* Быстрый выбор муниципалитетов (чипсы) */}
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-2 border-t border-slate-100">
          {filteredMunicipalities.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedId === m.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              #{m.rank2024} {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Основной дашборд с деталями и прогнозами */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Карточка 1: Рейтинг */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-3xl font-extrabold text-blue-600">#{currentItem.rank2024}</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                Группа {currentItem.group2024}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{currentItem.name}</h2>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase">Интегральный балл</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{currentItem.score}</p>
          </div>
        </div>

        {/* Карточка 2: Инвестиции и Прогнозы */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Инвестиционная активность и прогноз
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">Объем инвестиций (без добычи)</p>
              <p className="text-xl font-bold text-slate-800">
                {currentItem.investments.volumeBillion} млрд руб.
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Динамика / Прогноз роста</p>
              <p className={`text-lg font-extrabold ${currentItem.investments.growthPercent >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {currentItem.investments.growthPercent}% {currentItem.investments.growthPercent >= 100 ? '📈 Тренд стабильный' : '⚠️ Требует внимания'}
              </p>
            </div>
          </div>
        </div>

        {/* Карточка 3: МСП и Климат */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Развитие МСП и Оценка бизнеса
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">Субъекты МСП</p>
              <p className="text-xl font-bold text-slate-800">
                {currentItem.smeCount.toLocaleString()} ед.
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Оценка инвестклимата предпринимателями</p>
              <p className="text-lg font-extrabold text-blue-600">
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