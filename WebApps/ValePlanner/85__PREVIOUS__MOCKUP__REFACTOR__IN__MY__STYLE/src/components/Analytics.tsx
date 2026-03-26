import React, { useMemo } from 'react';
import { Worker } from '../types';
import { timeToMinutes } from '../utils/time';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface Props {
  worker: Worker;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#14b8a6'];

export function Analytics({ worker }: Props) {
  const analyticsData = useMemo(() => {
    const taskTimeMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};

    worker.shifts.forEach(shift => {
      const durationHours = (timeToMinutes(shift.endTime) - timeToMinutes(shift.startTime)) / 60;
      
      // Group by task title
      const title = shift.title || 'Untitled Task';
      taskTimeMap[title] = (taskTimeMap[title] || 0) + durationHours;

      // Group by date (YYYY-MM-DD) for proper sorting
      dateMap[shift.date] = (dateMap[shift.date] || 0) + durationHours;
    });

    const taskData = Object.entries(taskTimeMap)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
      .sort((a, b) => b.value - a.value);

    // Sort chronologically by date, then format to short weekday
    const dayData = Object.entries(dateMap)
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .map(([date, value]) => ({ 
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }), 
        value: Number(value.toFixed(1)) 
      }));

    const totalHours = Object.values(taskTimeMap).reduce((a, b) => a + b, 0);

    return { taskData, dayData, totalHours };
  }, [worker]);

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <img src={worker.avatar} alt={worker.name} className="w-16 h-16 rounded-full border-2 border-slate-100" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{worker.name}</h2>
              <p className="text-sm text-slate-500">{worker.role}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Tracked Hours</p>
            <p className="text-3xl font-bold text-indigo-600">{analyticsData.totalHours.toFixed(1)} <span className="text-lg text-slate-400 font-medium">hrs</span></p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Tasks</p>
            <p className="text-3xl font-bold text-emerald-600">{worker.shifts.length}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Time per Task (Pie Chart) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Time Distribution by Task</h3>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.taskData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analyticsData.taskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} hrs`, 'Time Spent']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '13px', lineHeight: '24px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Time per Day (Bar Chart) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-base font-semibold text-slate-900 mb-6">Hours per Day</h3>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.dayData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(value: number) => [`${value} hrs`, 'Hours']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
