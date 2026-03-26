import { useState } from 'react';
import { ScheduleBoard } from './components/ScheduleBoard';
import { Analytics } from './components/Analytics';
import workersData from './data/workers.json';
import { Worker } from './types';
import { Calendar, Clock, RotateCcw, BarChart3 } from 'lucide-react';

export default function App() {
  const [workers, setWorkers] = useState<Worker[]>(workersData.workers);
  const [mainTab, setMainTab] = useState<'schedule' | 'analytics'>('schedule');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [currentDate, setCurrentDate] = useState('2024-10-24');

  const handleUpdateShiftTitle = (shiftId: string, newTitle: string) => {
    setWorkers(prev => prev.map(w => ({
      ...w,
      shifts: w.shifts.map(s => s.id === shiftId ? { ...s, title: newTitle } : s)
    })));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Calendar className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Adam's Schedule</h1>
            </div>

            {/* Main Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setMainTab('schedule')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === 'schedule' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </button>
              <button
                onClick={() => setMainTab('analytics')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === 'analytics' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {mainTab === 'schedule' && (
              <>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>{viewMode === 'day' ? 'Oct 24, 2024' : 'Oct 21 - Oct 27, 2024'}</span>
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('day')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'day' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Week
                  </button>
                </div>
              </>
            )}

            <button 
              onClick={() => setWorkers(workersData.workers)}
              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6">
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          {mainTab === 'schedule' ? (
            <ScheduleBoard 
              workers={workers} 
              setWorkers={setWorkers} 
              viewMode={viewMode}
              currentDate={currentDate}
              onUpdateShiftTitle={handleUpdateShiftTitle}
            />
          ) : (
            <Analytics worker={workers[0]} />
          )}
        </div>
      </main>
    </div>
  );
}
