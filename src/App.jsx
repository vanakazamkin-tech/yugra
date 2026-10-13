import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  Download, 
  Sliders, 
  MapPin, 
  Users, 
  Coins, 
  ShieldAlert, 
  Building2, 
  Filter, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const INITIAL_MUNICIPALITIES = [
  { id: 'surgut', name: 'г. Сургут', risk: 'green', vrpShare: '22.4%', employment: '97.2%', laborDeficit: '5.1%', budgetExec: '99.1%', status: 'Стабильно' },
  { id: 'nv', name: 'г. Нижневартовск', risk: 'green', vrpShare: '16.8%', employment: '96.8%', laborDeficit: '6.2%', budgetExec: '98.5%', status: 'Стабильно' },
  { id: 'hm', name: 'г. Ханты-Мансийск', risk: 'green', vrpShare: '12.1%', employment: '98.1%', laborDeficit: '4.3%', budgetExec: '101.2%', status: 'Стабильно' },
  { id: 'nefteyugansk', name: 'г. Нефтеюганск', risk: 'yellow', vrpShare: '9.5%', employment: '95.4%', laborDeficit: '8.9%', budgetExec: '96.4%', status: 'Зона внимания' },
  { id: 'nyagan', name: 'г. Нягань', risk: 'yellow', vrpShare: '5.2%', employment: '94.8%', laborDeficit: '9.4%', budgetExec: '95.1%', status: 'Зона внимания' },
  { id: 'kogalym', name: 'г. Когалым', risk: 'green', vrpShare: '6.1%', employment: '97.5%', laborDeficit: '5.8%', budgetExec: '99.4%', status: 'Стабильно' },
  { id: 'meginion', name: 'г. Мегион', risk: 'yellow', vrpShare: '3.8%', employment: '94.2%', laborDeficit: '9.8%', budgetExec: '94.8%', status: 'Зона внимания' },
  { id: 'pytyakh', name: 'г. Пыть-Ях', risk: 'red', vrpShare: '2.9%', employment: '91.8%', laborDeficit: '14.2%', budgetExec: '91.2%', status: 'Критический риск' },
  { id: 'raduzhny', name: 'г. Радужный', risk: 'red', vrpShare: '2.1%', employment: '90.5%', laborDeficit: '15.6%', budgetExec: '89.5%', status: 'Критический риск' },
  { id: 'uray', name: 'г. Урай', risk: 'yellow', vrpShare: '3.2%', employment: '94.9%', laborDeficit: '8.7%', budgetExec: '95.8%', status: 'Зона внимания' },
  { id: 'langepas', name: 'г. Лангепас', risk: 'yellow', vrpShare: '2.8%', employment: '95.1%', laborDeficit: '8.1%', budgetExec: '96.2%', status: 'Зона внимания' },
  { id: 'pokachi', name: 'г. Покачи', risk: 'green', vrpShare: '1.9%', employment: '96.9%', laborDeficit: '6.0%', budgetExec: '98.1%', status: 'Стабильно' },
  { id: 'beloyarsky_r', name: 'Белоярский район', risk: 'green', vrpShare: '2.4%', employment: '97.0%', laborDeficit: '5.5%', budgetExec: '98.9%', status: 'Стабильно' },
  { id: 'berezovsky_r', name: 'Березовский район', risk: 'red', vrpShare: '1.1%', employment: '88.9%', laborDeficit: '18.4%', budgetExec: '87.4%', status: 'Критический риск' },
  { id: 'kondinsky_r', name: 'Кондинский район', risk: 'red', vrpShare: '1.4%', employment: '89.4%', laborDeficit: '16.9%', budgetExec: '88.2%', status: 'Критический риск' },
  { id: 'nefteyugansky_r', name: 'Нефтеюганский район', risk: 'green', vrpShare: '4.1%', employment: '96.5%', laborDeficit: '6.4%', budgetExec: '97.8%', status: 'Стабильно' },
  { id: 'nizhnevartovsky_r', name: 'Нижневартовский район', risk: 'green', vrpShare: '5.8%', employment: '97.1%', laborDeficit: '5.9%', budgetExec: '99.0%', status: 'Стабильно' },
  { id: 'oktyabrsky_r', name: 'Октябрьский район', risk: 'yellow', vrpShare: '1.8%', employment: '93.8%', laborDeficit: '11.2%', budgetExec: '93.5%', status: 'Зона внимания' },
  { id: 'sovetsky_r', name: 'Советский район', risk: 'yellow', vrpShare: '2.2%', employment: '93.1%', laborDeficit: '12.5%', budgetExec: '92.8%', status: 'Зона внимания' },
  { id: 'surgutsky_r', name: 'Сургутский район', risk: 'green', vrpShare: '7.9%', employment: '97.8%', laborDeficit: '4.8%', budgetExec: '100.4%', status: 'Стабильно' },
  { id: 'khanty_r', name: 'Ханты-Мансийский район', risk: 'green', vrpShare: '2.5%', employment: '96.4%', laborDeficit: '6.7%', budgetExec: '97.9%', status: 'Стабильно' },
  { id: 'yalgorsky_r', name: 'Югорск (ГО)', risk: 'yellow', vrpShare: '2.3%', employment: '95.2%', laborDeficit: '7.9%', budgetExec: '96.7%', status: 'Зона внимания' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'scenario' | 'reports'
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [riskFilter, setRiskFilter] = useState('all'); // 'all' | 'green' | 'yellow' | 'red'
  
  // Scenario sliders state
  const [sanctionsLevel, setSanctionsLevel] = useState(45);
  const [investmentLevel, setInvestmentLevel] = useState(62);
  const [laborDeficitRate, setLaborDeficitRate] = useState(7.8);

  // Notification / Toast state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredMunicipalities = useMemo(() => {
    if (riskFilter === 'all') return INITIAL_MUNICIPALITIES;
    return INITIAL_MUNICIPALITIES.filter(m => m.risk === riskFilter);
  }, [riskFilter]);

  const scenarioForecast = useMemo(() => {
    const base2026 = 100;
    const base2027 = 104.2 + (investmentLevel - 50) * 0.08 - (sanctionsLevel - 40) * 0.05;
    const base2028 = 108.9 + (investmentLevel - 50) * 0.12 - (sanctionsLevel - 40) * 0.09 - (laborDeficitRate - 7) * 0.3;

    const opt2026 = 102.1;
    const opt2027 = 108.5 + (investmentLevel - 50) * 0.15;
    const opt2028 = 115.4 + (investmentLevel - 50) * 0.22;

    const pess2026 = 98.2 - (sanctionsLevel - 40) * 0.08;
    const pess2027 = 94.1 - (sanctionsLevel - 40) * 0.15 - (laborDeficitRate - 7) * 0.4;
    const pess2028 = 89.5 - (sanctionsLevel - 40) * 0.22 - (laborDeficitRate - 7) * 0.6;

    return {
      2026: { base: base2026.toFixed(1), opt: opt2026.toFixed(1), pess: pess2026.toFixed(1) },
      2027: { base: base2027.toFixed(1), opt: opt2027.toFixed(1), pess: pess2027.toFixed(1) },
      2028: { base: base2028.toFixed(1), opt: opt2028.toFixed(1), pess: pess2028.toFixed(1) },
    };
  }, [sanctionsLevel, investmentLevel, laborDeficitRate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      
      {}
      <header className="sticky top-0 z-40 border-b border-emerald-900/40 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 shadow-lg shadow-emerald-900/30 font-bold">
              <ShieldAlert className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ЮГУ-18
                </span>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Мониторинг социально-экономической устойчивости ХМАО-Югры
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Департамент экономического развития Югры — Аналитическая система 22 муниципалитетов
              </p>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Карта рисков
            </button>

            <button
              onClick={() => setActiveTab('scenario')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'scenario'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Сценарный прогноз
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Аналитические отчеты
            </button>
          </nav>
        </div>
      </header>

      {}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-900/90 border border-emerald-500/50 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-bounce">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-8">

        {/* ================= TAB 1: КАРТА РИСКОВ (OVERVIEW) ================= */}
        {activeTab === 'map' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Top Regional KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-emerald-900/30 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>ВРП (Валовый продукт)</span>
                  <Coins className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-white flex items-baseline gap-2">
                  +3.8%
                  <span className="text-xs font-normal text-emerald-400 flex items-center">
                    <ArrowUpRight className="w-3 h-3" /> Рост
                  </span>
                </div>
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Зона стабильности
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-emerald-900/30 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Уровень занятости</span>
                  <Users className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-xl font-bold text-white flex items-baseline gap-2">
                  96.4%
                  <span className="text-xs font-normal text-emerald-400 flex items-center">
                    <ArrowUpRight className="w-3 h-3" /> Высокий
                  </span>
                </div>
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Норматив выполнен
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-amber-900/30 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Дефицит кадров</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-bold text-amber-300 flex items-baseline gap-2">
                  7.8%
                  <span className="text-xs font-normal text-amber-400 flex items-center">
                    <ArrowUpRight className="w-3 h-3" /> Рост
                  </span>
                </div>
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Зона внимания
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-yellow-900/30 backdrop-blur-sm relative overflow-hidden group hover:border-yellow-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Санкционный риск</span>
                  <ShieldAlert className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-xl font-bold text-yellow-300">
                  Умеренный
                </div>
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  Оценка модели
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-emerald-900/30 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Исполнение бюджета</span>
                  <Building2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-white flex items-baseline gap-2">
                  98.2%
                  <span className="text-xs font-normal text-emerald-400">Профицит</span>
                </div>
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Стабильное исполнение
                </span>
              </div>

            </div>

            {/* Filter and Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">
                  Светофор рисков 22 муниципалитетов ХМАО-Югры
                </h2>
              </div>

              {/* Traffic Light Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setRiskFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    riskFilter === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Все ({INITIAL_MUNICIPALITIES.length})
                </button>
                <button
                  onClick={() => setRiskFilter('green')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    riskFilter === 'green'
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Стабильно (12)
                </button>
                <button
                  onClick={() => setRiskFilter('yellow')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    riskFilter === 'yellow'
                      ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Внимание (6)
                </button>
                <button
                  onClick={() => setRiskFilter('red')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    riskFilter === 'red'
                      ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Критический (4)
                </button>
              </div>
            </div>

            {/* Municipalities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMunicipalities.map((item) => {
                let badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                let dotStyle = "bg-emerald-400 shadow-emerald-500/50";
                let cardBorder = "hover:border-emerald-500/50";

                if (item.risk === 'yellow') {
                  badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  dotStyle = "bg-amber-400 shadow-amber-500/50";
                  cardBorder = "hover:border-amber-500/50";
                } else if (item.risk === 'red') {
                  badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                  dotStyle = "bg-rose-500 shadow-rose-500/50";
                  cardBorder = "hover:border-rose-500/50";
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedMunicipality(item)}
                    className={`p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 cursor-pointer backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl ${cardBorder}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400">
                        {item.name}
                      </h3>
                      <span className={`w-2.5 h-2.5 rounded-full shadow-lg ${dotStyle}`}></span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Занятость:</span>
                        <span className="text-slate-200 font-medium">{item.employment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Дефицит кадров:</span>
                        <span className="text-slate-200 font-medium">{item.laborDeficit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Бюджет:</span>
                        <span className="text-slate-200 font-medium">{item.budgetExec}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${badgeStyle}`}>
                        {item.status}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium hover:underline flex items-center gap-0.5">
                        Детали &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Detail Window */}
            {selectedMunicipality && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-fadeIn">
                  <button
                    onClick={() => setSelectedMunicipality(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <MapPin className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedMunicipality.name}</h3>
                      <p className="text-xs text-slate-400">Муниципальное образование ХМАО-Югры</p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Статус устойчивости:</span>
                      <span className="font-semibold text-emerald-400">{selectedMunicipality.status}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Доля в ВРП округа:</span>
                      <span className="font-medium text-white">{selectedMunicipality.vrpShare}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Уровень занятости населения:</span>
                      <span className="font-medium text-white">{selectedMunicipality.employment}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Дефицит рабочих кадров:</span>
                      <span className="font-medium text-amber-400">{selectedMunicipality.laborDeficit}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Исполнение местного бюджета:</span>
                      <span className="font-medium text-emerald-400">{selectedMunicipality.budgetExec}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        showToast(`Сформирована выгрузка по ${selectedMunicipality.name}`);
                        setSelectedMunicipality(null);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Скачать отчёт по району (PDF)
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ================= TAB 2: СЦЕНАРНЫЙ ПРОГНОЗ ================= */}
        {activeTab === 'scenario' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Header Description */}
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-emerald-900/40 backdrop-blur-sm">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                Сценарное моделирование и прогнозные параметры (2026–2028 гг.)
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Интерактивный симулятор оценки устойчивости региона под влиянием санкционного давления, 
                динамики инвестиций и кадрового баланса в градообразующих отраслях.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Sliders Controls */}
              <div className="space-y-6 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-400" />
                  Факторы внешнего и внутреннего воздействия
                </h3>

                {/* Slider 1 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Санкционное давление</span>
                    <span className="font-bold text-amber-400">{sanctionsLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={sanctionsLevel}
                    onChange={(e) => setSanctionsLevel(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Уровень ограничений на поставку оборудования и экспорта углеводородов
                  </p>
                </div>

                {/* Slider 2 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Инвестиции в основные фонды</span>
                    <span className="font-bold text-emerald-400">{investmentLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={investmentLevel}
                    onChange={(e) => setInvestmentLevel(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Объем капиталовложений в обрабатывающие сектора и инфраструктуру
                  </p>
                </div>

                {/* Slider 3 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Дефицит рабочих кадров</span>
                    <span className="font-bold text-rose-400">{laborDeficitRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="0.1"
                    value={laborDeficitRate}
                    onChange={(e) => setLaborDeficitRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Нехватка специалистов в энергетике, строительстве и ЖКХ
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSanctionsLevel(45);
                    setInvestmentLevel(62);
                    setLaborDeficitRate(7.8);
                    showToast("Параметры сброшены к базовым");
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Сбросить к нормативу
                </button>
              </div>

              {/* Right Column: Scenario Forecast Results */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* SVG Visual Chart Card */}
                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-semibold text-white">
                      Динамика индекса устойчивости ХМАО-Югры
                    </h3>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Оптимистичный
                      </span>
                      <span className="flex items-center gap-1.5 text-teal-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span> Базовый
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Пессимистичный
                      </span>
                    </div>
                  </div>

                  {/* Custom SVG Line Chart */}
                  <div className="h-64 w-full pt-4">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="480" y2="20" stroke="#1e293b" strokeDasharray="4" />
                      <line x1="40" y1="80" x2="480" y2="80" stroke="#1e293b" strokeDasharray="4" />
                      <line x1="40" y1="140" x2="480" y2="140" stroke="#1e293b" strokeDasharray="4" />
                      <line x1="40" y1="180" x2="480" y2="180" stroke="#334155" />

                      {/* Y-Axis Labels */}
                      <text x="10" y="25" fill="#64748b" fontSize="10">120</text>
                      <text x="10" y="85" fill="#64748b" fontSize="10">100</text>
                      <text x="10" y="145" fill="#64748b" fontSize="10">80</text>

                      {/* X-Axis Labels */}
                      <text x="80" y="195" fill="#94a3b8" fontSize="11" textAnchor="middle">2026 г.</text>
                      <text x="260" y="195" fill="#94a3b8" fontSize="11" textAnchor="middle">2027 г.</text>
                      <text x="440" y="195" fill="#94a3b8" fontSize="11" textAnchor="middle">2028 г.</text>

                      {/* Optimistic Path (Green) */}
                      <path
                        d={`M 80 80 Q 260 ${180 - Number(scenarioForecast[2027].opt)} 440 ${180 - Number(scenarioForecast[2028].opt)}`}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="3"
                      />
                      
                      {/* Base Path (Teal) */}
                      <path
                        d={`M 80 80 Q 260 ${180 - Number(scenarioForecast[2027].base)} 440 ${180 - Number(scenarioForecast[2028].base)}`}
                        fill="none"
                        stroke="#2dd4bf"
                        strokeWidth="3"
                      />

                      {/* Pessimistic Path (Rose) */}
                      <path
                        d={`M 80 80 Q 260 ${180 - Number(scenarioForecast[2027].pess)} 440 ${180 - Number(scenarioForecast[2028].pess)}`}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="3"
                        strokeDasharray="6"
                      />

                      {/* Dots */}
                      <circle cx="80" cy="80" r="4" fill="#34d399" />
                      <circle cx="260" cy={180 - Number(scenarioForecast[2027].base)} r="4" fill="#2dd4bf" />
                      <circle cx="440" cy={180 - Number(scenarioForecast[2028].base)} r="4" fill="#2dd4bf" />
                    </svg>
                  </div>

                  {/* Summary Comparison Grid */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-center">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">Базовый (2028)</div>
                      <div className="text-base font-bold text-teal-300">{scenarioForecast[2028].base}</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">Оптимистичный (2028)</div>
                      <div className="text-base font-bold text-emerald-400">{scenarioForecast[2028].opt}</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">Пессимистичный (2028)</div>
                      <div className="text-base font-bold text-rose-400">{scenarioForecast[2028].pess}</div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ================= TAB 3: АНАЛИТИЧЕСКИЕ ОТЧЕТЫ ================= */}
        {activeTab === 'reports' && (
          <div className="space-y-8 animate-fadeIn">
            
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-emerald-900/40 backdrop-blur-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Генератор аналитических отчетов для руководства
                </h2>
                <p className="text-xs text-slate-400">
                  Автоматическое формирование сводных справок и паспортов устойчивости муниципалитетов
                </p>
              </div>

              <button
                onClick={() => showToast("Экспорт полного пакета отчетов запущен...")}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2 self-start md:self-auto"
              >
                <Download className="w-4 h-4" />
                Сформировать отчет для Губернатора
              </button>
            </div>

            {/* Presets List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                <div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit mb-4">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-2">
                    Ежеквартальный сводный отчёт по устойчивости
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Полный анализ ВРП, бюджетной обеспеченности и выполнения социальных обязательств по всем 22 районам.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Формат: PDF, Excel</span>
                  <button
                    onClick={() => showToast("Скачивание: Ежеквартальный_отчет_Югра.pdf")}
                    className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    Выгрузить &rarr;
                  </button>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-4 flex flex-col justify-between hover:border-amber-500/40 transition-all">
                <div>
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit mb-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-2">
                    Прогноз кадрового баланса ХМАО-Югры
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Карта дефицита специалистов в энергетическом комплексе, социальной сфере и строительстве.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Формат: DOCX, PDF</span>
                  <button
                    onClick={() => showToast("Скачивание: Кадровый_баланс_ХМАО.docx")}
                    className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    Выгрузить &rarr;
                  </button>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-4 flex flex-col justify-between hover:border-rose-500/40 transition-all">
                <div>
                  <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit mb-4">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-2">
                    Светофор рисков и критических зон
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Оперативная справка по районам в красной и жёлтой зонах рисков для принятия управленческих решений.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Формат: Interactive / PDF</span>
                  <button
                    onClick={() => showToast("Скачивание: Светофор_рисков_Югра.pdf")}
                    className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    Выгрузить &rarr;
                  </button>
                </div>
              </div>

            </div>

            {/* Integration Action Panel */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Интеграция с платформой «ГосТех»</h4>
                  <p className="text-xs text-slate-400">Синхронизация данных мониторинга с ситуационным центром губернатора</p>
                </div>
              </div>
              <button
                onClick={() => showToast("Данные успешно синхронизированы с платформой ГосТех")}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
              >
                Синхронизировать данные
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Команда ЮГУ-18 | Департамент экономического развития ХМАО-Югры</p>
      </footer>

    </div>
  );
}