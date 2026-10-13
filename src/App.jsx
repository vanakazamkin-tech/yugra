import React, { useState } from 'react';
import { 
  BarChart3, Map, FileText, Settings, AlertTriangle, CheckCircle2, 
  TrendingUp, Users, DollarSign, Download, RefreshCw, ShieldAlert, ChevronRight, Activity 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'scenarios', 'reports'
  const [selectedMunicipality, setSelectedMunicipality] = useState('Сургут');
  const [sanctionPressure, setSanctionPressure] = useState(65);
  const [investments, setInvestments] = useState(4.2);

  const municipalities = [
    { name: 'Сургут', risk: 'Низкий', vrp: '+5.4%', employment: '98.1%', status: 'stable' },
    { name: 'Нижневартовск', risk: 'Низкий', vrp: '+4.8%', employment: '97.5%', status: 'stable' },
    { name: 'Ханты-Мансийск', risk: 'Низкий', vrp: '+6.1%', employment: '98.5%', status: 'stable' },
    { name: 'Нефтеюганск', risk: 'Внимание', vrp: '+1.2%', employment: '94.2%', status: 'warning' },
    { name: 'Когалым', risk: 'Низкий', vrp: '+5.0%', employment: '97.8%', status: 'stable' },
    { name: 'Нягань', risk: 'Критический', vrp: '-1.5%', employment: '91.0%', status: 'danger' },
    { name: 'Пыть-Ях', risk: 'Внимание', vrp: '+0.8%', employment: '93.5%', status: 'warning' },
    { name: 'Мегион', risk: 'Низкий', vrp: '+3.2%', employment: '96.0%', status: 'stable' }
  ];

  return (
    <div className="min-h-screen bg-[#064e3b] text-[#ecfdf5] font-sans flex flex-col">
      {/* HEADER */}
      <header className="bg-[#065f46] border-b border-[#047857] px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-lg gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="text-[#34d399] w-7 h-7" />
            <h1 className="text-xl md:text-2xl font-bold tracking-wide">ЮГУ-18: Мониторинг устойчивости Югры</h1>
          </div>
          <p className="text-xs md:text-sm text-[#a7f3d0] mt-1">
            Департамент экономического развития ХМАО-Югры | 22 муниципалитета | Прогноз 2026–2028
          </p>
        </div>

        {/* NAVIGATION BUTTONS */}
        <div className="flex bg-[#047857] p-1.5 rounded-xl gap-2 shadow-inner">
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'map' ? 'bg-[#064e3b] text-white shadow-md' : 'text-[#a7f3d0] hover:text-white'}`}
          >

<Map className="w-4 h-4" />
Карта рисков
          </button>
          <button 
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'scenarios' ? 'bg-[#064e3b] text-white shadow-md' : 'text-[#a7f3d0] hover:text-white'}`}
          >
            <TrendingUp className="w-4 h-4" /> Сценарии
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-[#064e3b] text-white shadow-md' : 'text-[#a7f3d0] hover:text-white'}`}
          >
            <FileText className="w-4 h-4" /> Отчеты
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'map' && (
          <div className="space-y-6 animate-fadeIn">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#065f46]/70 border border-[#047857] p-4 rounded-xl backdrop-blur-md shadow-lg">
                <span className="text-xs text-[#a7f3d0] uppercase tracking-wider">Общая занятость</span>
                <div className="text-2xl font-bold mt-1 text-white">96.4%</div>
                <span className="text-xs text-[#34d399] flex items-center gap-1 mt-1">▲ +0.4% к прошлому месяцу</span>
              </div>
              <div className="bg-[#065f46]/70 border border-[#047857] p-4 rounded-xl backdrop-blur-md shadow-lg">
                <span className="text-xs text-[#a7f3d0] uppercase tracking-wider">Бюджетная стабильность</span>
                <div className="text-2xl font-bold mt-1 text-white">Устойчиво</div>
                <span className="text-xs text-[#34d399] flex items-center gap-1 mt-1">Профицит бюджета</span>
              </div>
              <div className="bg-[#065f46]/70 border border-[#047857] p-4 rounded-xl backdrop-blur-md shadow-lg">
                <span className="text-xs text-[#a7f3d0] uppercase tracking-wider">Зоны риска (Светофор)</span>
                <div className="text-2xl font-bold mt-1 text-amber-300">2 района</div>
                <span className="text-xs text-amber-200 flex items-center gap-1 mt-1">Требуют внимания Департамента</span>
              </div>
              <div className="bg-[#065f46]/70 border border-[#047857] p-4 rounded-xl backdrop-blur-md shadow-lg">
                <span className="text-xs text-[#a7f3d0] uppercase tracking-wider">Кадровый баланс</span>
                <div className="text-2xl font-bold mt-1 text-rose-300">Дефицит 7.8%</div>
                <span className="text-xs text-rose-200 flex items-center gap-1 mt-1">Промышленный сектор</span>
              </div>
            </div>

            {/* HEATMAP & MUNICIPALITIES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#065f46]/60 border border-[#047857] p-5 rounded-2xl shadow-xl backdrop-blur-md">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">

<Map className="w-5 h-5 text-[#34d399]" />
Тепловая карта устойчивости муниципалитетов Югры
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {municipalities.map((m, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedMunicipality(m.name)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${selectedMunicipality === m.name ? 'ring-2 ring-white bg-[#047857]' : 'bg-[#064e3b]/80 border-[#047857] hover:bg-[#047857]/50'}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm">{m.name}</span>
                        <span className={`w-3 h-3 rounded-full ${m.status === 'stable' ? 'bg-emerald-400' : m.status === 'warning' ? 'bg-amber-400' : 'bg-rose-500'}`}></span>
                      </div>
                      <div className="mt-4 text-xs text-[#a7f3d0]">
                        <div>ВРП: <strong className="text-white">{m.vrp}</strong></div>
                        <div>Занятость: <strong className="text-white">{m.employment}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DETAILED INFO CARD */}
              <div className="bg-[#065f46]/60 border border-[#047857] p-5 rounded-2xl shadow-xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Детали по району</h2>
                  <div className="text-xl font-bold text-[#34d399] mb-4">{selectedMunicipality}</div>
                  <div className="space-y-3 text-sm text-[#a7f3d0]">
                    <div className="flex justify-between border-b border-[#047857] pb-2">
                      <span>Уровень риска:</span>
                      <strong className="text-white">Низкий (Зеленая зона)</strong>
                    </div>
                    <div className="flex justify-between border-b border-[#047857] pb-2">
                      <span>Средняя зарплата:</span>
                      <strong className="text-white">89 400 руб.</strong>
                    </div>
                    <div className="flex justify-between border-b border-[#047857] pb-2">
                      <span>Инвестиции (YTD):</span>
                      <strong className="text-white">+5.2%</strong>
                    </div>
                    <div className="flex justify-between border-b border-[#047857] pb-2">
                      <span>Риск от санкций:</span>
                      <strong className="text-amber-300">Умеренный</strong>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-6 bg-[#047857] hover:bg-[#059669] text-white py-2.5 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Выгрузить паспорт района
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* SIMULATION CONTROLS */}
            <div className="bg-[#065f46]/60 border border-[#047857] p-5 rounded-2xl shadow-xl backdrop-blur-md space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#34d399]" /> Настройка параметров модели
              </h2>
              
              <div className="space-y-2">
                <label className="text-sm flex justify-between">
                  <span>Уровень санкционного давления</span>
                  <span className="font-bold text-[#34d399]">{sanctionPressure}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={sanctionPressure} 
                  onChange={(e) => setSanctionPressure(e.target.value)}
                  className="w-full accent-[#34d399] cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm flex justify-between">
                  <span>Рост инвестиций в фонды</span>
                  <span className="font-bold text-[#34d399]">{investments}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="15" 
                  step="0.1"
                  value={investments} 
                  onChange={(e) => setInvestments(e.target.value)}
                  className="w-full accent-[#34d399] cursor-pointer"
                />
              </div>

              <div className="bg-[#064e3b] p-4 rounded-xl border border-[#047857] text-xs text-[#a7f3d0] space-y-2">
                <div className="font-bold text-white flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-amber-400" /> Алгоритм светофора
                </div>
                <p>При текущих значениях параметров модель прогнозирует стабильное удержание профицита бюджета в 20 муниципалитетах из 22.</p>
              </div>
            </div>

            {/* SCENARIOS CHART & FORECAST */}
            <div className="lg:col-span-2 bg-[#065f46]/60 border border-[#047857] p-5 rounded-2xl shadow-xl backdrop-blur-md flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#34d399]" /> Сценарный прогноз социально-экономической устойчивости (2026–2028)
                </h2>
                <p className="text-sm text-[#a7f3d0] mb-6">Сравнение базового, оптимистичного и пессимистичного сценариев развития региона.</p>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#34d399] font-medium">Оптимистичный сценарий</span>
                      <strong className="text-white">+18.4% роста ВРП</strong>
                    </div>
                    <div className="w-full bg-[#047857] h-3 rounded-full overflow-hidden">
                      <div className="bg-[#34d399] h-full rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-sky-300 font-medium">Базовый сценарий</span>
                      <strong className="text-white">+11.2% роста ВРП</strong>
                    </div>
                    <div className="w-full bg-[#047857] h-3 rounded-full overflow-hidden">
                      <div className="bg-sky-400 h-full rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-rose-400 font-medium">Пессимистичный (Санкции)</span>
                      <strong className="text-white">-3.5% падение</strong>
                    </div>
                    <div className="w-full bg-[#047857] h-3 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: '35%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#047857] flex justify-between items-center text-xs text-[#a7f3d0]">
                <span>Источник данных: Открытые данные Росстата и ГИС ЖКХ</span>
                <button className="bg-[#047857] hover:bg-[#059669] text-white px-4 py-2 rounded-xl transition-all">
                  Пересчитать модель
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            {/* REPORTS LIST */}
            <div className="bg-[#065f46]/60 border border-[#047857] p-6 rounded-2xl shadow-xl backdrop-blur-md space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#34d399]" /> Документы и аналитические сводки
              </h2>
              
              <div className="space-y-3">
                <div className="bg-[#064e3b] p-4 rounded-xl border border-[#047857] flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-sm text-white">Ежеквартальный отчет по устойчивости ХМАО</h3>
                    <p className="text-xs text-[#a7f3d0] mt-0.5">Формат: PDF / Excel | Готово к выгрузке</p>
                  </div>
                  <button className="bg-[#047857] hover:bg-[#059669] p-2.5 rounded-xl transition-all text-white">
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-[#064e3b] p-4 rounded-xl border border-[#047857] flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-sm text-white">Сводка по зонам риска (Светофор)</h3>
                    <p className="text-xs text-[#a7f3d0] mt-0.5">Формат: Интерактивная таблица | 22 района</p>
                  </div>
                  <button className="bg-[#047857] hover:bg-[#059669] p-2.5 rounded-xl transition-all text-white">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* EXPORT OPTIONS */}
            <div className="bg-[#065f46]/60 border border-[#047857] p-6 rounded-2xl shadow-xl backdrop-blur-md flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-[#34d399]" /> Интеграция с системами
                </h2>
                <p className="text-sm text-[#a7f3d0] mb-6">Экспорт аналитических данных в государственные и региональные платформы управления.</p>
                
                <div className="space-y-3">
                  <button className="w-full bg-[#047857] hover:bg-[#059669] text-white py-3 px-4 rounded-xl font-medium transition-all shadow-md flex items-center justify-between">
                    <span>Экспорт для Губернатора ХМАО</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button className="w-full bg-[#047857] hover:bg-[#059669] text-white py-3 px-4 rounded-xl font-medium transition-all shadow-md flex items-center justify-between">
                    <span>Интеграция с платформой «ГосТех»</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#a7f3d0] text-center mt-6">
                Команда проекта «ЮГУ-18» • Все права защищены © 2026
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}