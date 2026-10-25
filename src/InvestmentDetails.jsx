import React, { useState } from 'react';
import data from '../data/municipalities-detailed.json';

export const InvestmentDetails = () => {
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(data.municipalities[0].id);

  const filteredMunicipalities = data.municipalities.filter((m) => {
    const matchesGroup = selectedGroup === 'ALL' || m.group2024 === selectedGroup;
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const currentItem = data.municipalities.find((m) => m.id === selectedId) || data.municipalities[0];

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Инвестиционный портал Югры
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2">
              Рейтинг муниципалитетов ХМАО — Югры (2024)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Оценка условий благоприятного инвестиционного климата и развития конкуренции
            </p>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedGroup('ALL')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                selectedGroup === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Все (22)
            </button>
            <button
              onClick={() => setSelectedGroup('A')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                selectedGroup === 'A' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Группа А (Лидеры)
            </button>
            <button
              onClick={() => setSelectedGroup('B')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                selectedGroup === 'B' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Группа B
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <input
            type="text"
            placeholder="Поиск муниципалитета..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {filteredMunicipalities.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.rank2024} {m.name} — {m.score} баллов (Группа {m.group2024})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-4xl font-extrabold text-blue-600">#{currentItem.rank2024}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              currentItem.group2024 === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
            }`}>
              Группа {currentItem.group2024}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">{currentItem.name}</h2>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold">Итоговый балл</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{currentItem.score}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
            Инвестиционная деятельность
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">Объем инвестиций (без добычи)</p>
              <p className="text-2xl font-bold text-slate-800">
                {currentItem.investments.volumeBillion} <span className="text-sm font-normal">млрд руб.</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Динамика роста</p>
              <p className={`text-xl font-extrabold ${
                currentItem.investments.growthPercent >= 100 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {currentItem.investments.growthPercent}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
            Поддержка малого и среднего бизнеса
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">Количество субъектов МСП</p>
              <p className="text-2xl font-bold text-slate-800">
                {currentItem.smeCount.toLocaleString()} <span className="text-sm font-normal">ед.</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Оценка инвестклимата бизнесом</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xl font-extrabold text-blue-600">{currentItem.assessmentScore}</p>
                <span className="text-xs text-slate-400">/ 5.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentDetails;