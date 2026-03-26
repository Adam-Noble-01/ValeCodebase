import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Worker, Shift } from '../types';
import { timeToMinutes, minutesToTime, snapToInterval } from '../utils/time';
import { GripHorizontal, Trash2 } from 'lucide-react';

interface Props {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  viewMode: 'day' | 'week';
  currentDate: string;
  onUpdateShiftTitle: (shiftId: string, newTitle: string) => void;
}

interface DraftShift extends Shift {
  workerId: string;
  action: 'move' | 'resize' | 'create';
}

const PIXELS_PER_MINUTE = 2; // 120px per hour
const SNAP_MINUTES = 15;

const SHIFT_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-rose-50 text-rose-700 border-rose-200'
];

const getWeekDates = (baseDate: string) => {
  const [y, m, d] = baseDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(y, m - 1, diff);
  
  return Array.from({ length: 7 }).map((_, i) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    return {
      id: current.toISOString().split('T')[0],
      date: current.toISOString().split('T')[0],
      title: current.toLocaleDateString('en-US', { weekday: 'short' }),
      subtitle: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });
};

export function ScheduleBoard({ workers, setWorkers, viewMode, currentDate, onUpdateShiftTitle }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // Handle delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShiftId) {
        setWorkers(prev => prev.map(w => ({
          ...w,
          shifts: w.shifts.filter(s => s.id !== selectedShiftId)
        })));
        setSelectedShiftId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShiftId, setWorkers]);

  const columns = useMemo(() => {
    if (viewMode === 'day') {
      return workers.map(w => ({
        id: w.id,
        title: w.name,
        subtitle: w.role,
        avatar: w.avatar,
        workerId: w.id,
        date: currentDate
      }));
    } else {
      return getWeekDates(currentDate).map(d => ({
        ...d,
        workerId: undefined,
        avatar: undefined
      }));
    }
  }, [viewMode, workers, currentDate]);

  const allShifts = useMemo(() => {
    return workers.flatMap(w => w.shifts.map(s => ({ ...s, workerId: w.id, workerName: w.name, avatar: w.avatar })));
  }, [workers]);

  const bounds = useMemo(() => {
    let minMins = 24 * 60;
    let maxMins = 0;
    let hasVisible = false;

    columns.forEach(col => {
      const colShifts = allShifts.filter(s => s.date === col.date && (col.workerId ? s.workerId === col.workerId : true));
      colShifts.forEach(s => {
        hasVisible = true;
        minMins = Math.min(minMins, timeToMinutes(s.startTime));
        maxMins = Math.max(maxMins, timeToMinutes(s.endTime));
      });
    });

    if (!hasVisible) return { start: 480, end: 1020 };

    if (minMins >= 480 && maxMins <= 1020) {
      return { start: 480, end: 1020 }; // 8am - 5pm
    }
    return { start: 360, end: 1260 }; // 6am - 9pm
  }, [columns, allShifts]);

  const [draft, setDraft] = useState<DraftShift | null>(null);
  const [pendingDrag, setPendingDrag] = useState<{
    action: 'move' | 'resize';
    columnId: string;
    shift: Shift & { workerId: string };
    startX: number;
    startY: number;
    mins: number;
  } | null>(null);
  const [dragOffsetMins, setDragOffsetMins] = useState(0);

  const timeLabels = useMemo(() => {
    const labels = [];
    for (let m = bounds.start; m <= bounds.end; m += 60) {
      labels.push(m);
    }
    return labels;
  }, [bounds]);

  const startInteraction = (e: React.MouseEvent, action: 'move' | 'resize' | 'create', columnId: string, shift?: Shift & { workerId: string }) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const mins = bounds.start + y / PIXELS_PER_MINUTE;
    const snappedMins = snapToInterval(mins, SNAP_MINUTES);

    const column = columns.find(c => c.id === columnId)!;

    if (action === 'create') {
      const randomColor = SHIFT_COLORS[Math.floor(Math.random() * SHIFT_COLORS.length)];
      // If in week view, assign to the first available worker if none specified
      const assignedWorkerId = column.workerId || (workers.length > 0 ? workers[0].id : '');
      
      if (!assignedWorkerId) return; // No workers available

      setDraft({
        id: `new-${Date.now()}`,
        workerId: assignedWorkerId,
        date: column.date,
        startTime: minutesToTime(snappedMins),
        endTime: minutesToTime(Math.min(bounds.end, snappedMins + 60)),
        title: 'New Shift',
        color: randomColor,
        action: 'create'
      });
      setDragOffsetMins(0);
      setSelectedShiftId(null);
    } else if (shift) {
      setPendingDrag({
        action: action as 'move' | 'resize',
        columnId,
        shift,
        startX: e.clientX,
        startY: e.clientY,
        mins
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (pendingDrag) {
        if (Math.abs(e.clientX - pendingDrag.startX) > 3 || Math.abs(e.clientY - pendingDrag.startY) > 3) {
          const { action, shift, mins } = pendingDrag;
          setSelectedShiftId(shift.id);
          setDraft({
            ...shift,
            action
          });
          if (action === 'move') {
            setDragOffsetMins(mins - timeToMinutes(shift.startTime));
          }
          setPendingDrag(null);
        }
        return;
      }

      if (!draft) return;
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const colWidth = rect.width / columns.length;
      const colIndex = Math.max(0, Math.min(columns.length - 1, Math.floor(x / colWidth)));
      const hoverColumn = columns[colIndex];

      const mins = bounds.start + y / PIXELS_PER_MINUTE;

      if (draft.action === 'create') {
        const snappedMins = snapToInterval(mins, SNAP_MINUTES);
        const startMins = timeToMinutes(draft.startTime);
        const endMins = Math.max(startMins + 15, Math.min(bounds.end, snappedMins));
        
        setDraft(prev => prev ? { 
          ...prev, 
          date: hoverColumn.date,
          workerId: hoverColumn.workerId || prev.workerId,
          endTime: minutesToTime(endMins) 
        } : null);
      } else if (draft.action === 'move') {
        let newStartMins = snapToInterval(mins - dragOffsetMins, SNAP_MINUTES);
        const duration = timeToMinutes(draft.endTime) - timeToMinutes(draft.startTime);

        newStartMins = Math.max(bounds.start, Math.min(newStartMins, bounds.end - duration));

        setDraft(prev => prev ? {
          ...prev,
          date: hoverColumn.date,
          workerId: hoverColumn.workerId || prev.workerId,
          startTime: minutesToTime(newStartMins),
          endTime: minutesToTime(newStartMins + duration)
        } : null);
      } else if (draft.action === 'resize') {
        const snappedMins = snapToInterval(mins, SNAP_MINUTES);
        const startMins = timeToMinutes(draft.startTime);
        const endMins = Math.max(startMins + 15, Math.min(bounds.end, snappedMins));
        setDraft(prev => prev ? { ...prev, endTime: minutesToTime(endMins) } : null);
      }
    };

    const handleMouseUp = () => {
      if (pendingDrag) {
        setSelectedShiftId(pendingDrag.shift.id);
        setPendingDrag(null);
        return;
      }

      if (!draft) return;

      setWorkers(prev => {
        const newWorkers = prev.map(w => ({ ...w, shifts: [...w.shifts] }));

        if (draft.action === 'create') {
          const worker = newWorkers.find(w => w.id === draft.workerId);
          if (worker) {
            worker.shifts.push({
              id: draft.id,
              date: draft.date,
              startTime: draft.startTime,
              endTime: draft.endTime,
              title: draft.title,
              color: draft.color
            });
          }
        } else {
          // Remove from old worker
          newWorkers.forEach(w => {
            w.shifts = w.shifts.filter(s => s.id !== draft.id);
          });
          // Add to new worker
          const worker = newWorkers.find(w => w.id === draft.workerId);
          if (worker) {
            worker.shifts.push({
              id: draft.id,
              date: draft.date,
              startTime: draft.startTime,
              endTime: draft.endTime,
              title: draft.title,
              color: draft.color
            });
          }
        }
        return newWorkers;
      });

      setDraft(null);
    };

    if (draft || pendingDrag) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draft, pendingDrag, bounds, dragOffsetMins, columns, setWorkers]);

  const formatTimeLabel = (mins: number) => {
    const h = Math.floor(mins / 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH} ${ampm}`;
  };

  const [currentTimeMins, setCurrentTimeMins] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full select-none" onClick={() => setSelectedShiftId(null)}>
      {/* Header */}
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        <div className="w-20 shrink-0 border-r border-slate-200" />
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map(col => (
            <div key={col.id} className="px-4 py-3 border-r border-slate-200 last:border-r-0 flex items-center gap-3">
              {col.avatar && (
                <img src={col.avatar} alt={col.title} className="w-10 h-10 rounded-full border border-slate-200 bg-white" draggable={false} />
              )}
              <div>
                <div className="font-medium text-sm text-slate-900">{col.title}</div>
                <div className="text-xs text-slate-500">{col.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 overflow-y-auto relative bg-white">
        <div className="flex min-h-full">
          {/* Time Axis */}
          <div className="w-20 shrink-0 border-r border-slate-200 relative bg-slate-50/30">
            {timeLabels.map(mins => (
              <div
                key={mins}
                className="absolute w-full text-right pr-3 text-xs text-slate-400 font-medium transform -translate-y-1/2"
                style={{ top: (mins - bounds.start) * PIXELS_PER_MINUTE }}
              >
                {formatTimeLabel(mins)}
              </div>
            ))}
          </div>

          {/* Main Grid */}
          <div
            ref={gridRef}
            className="flex-1 relative cursor-crosshair"
            style={{ height: (bounds.end - bounds.start) * PIXELS_PER_MINUTE }}
          >
            {/* Horizontal Grid Lines */}
            {timeLabels.map(mins => (
              <div
                key={mins}
                className="absolute w-full border-t border-slate-100 pointer-events-none"
                style={{ top: (mins - bounds.start) * PIXELS_PER_MINUTE }}
              />
            ))}

            {/* Vertical Column Dividers */}
            <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
              {columns.map((_, i) => (
                <div key={i} className="border-r border-slate-100 last:border-r-0 h-full" />
              ))}
            </div>

            {/* Current Time Indicator */}
            {currentTimeMins >= bounds.start && currentTimeMins <= bounds.end && (
              <div
                className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                style={{ top: (currentTimeMins - bounds.start) * PIXELS_PER_MINUTE }}
              >
                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
              </div>
            )}

            {/* Columns for interaction and rendering */}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
              {columns.map(col => {
                const colShifts = allShifts.filter(s => s.date === col.date && (col.workerId ? s.workerId === col.workerId : true));
                
                return (
                  <div
                    key={col.id}
                    className="relative h-full"
                    onMouseDown={(e) => startInteraction(e, 'create', col.id)}
                  >
                    {/* Render actual shifts */}
                    {colShifts.map(shift => {
                      if (draft && draft.id === shift.id) return null;

                      const startMins = timeToMinutes(shift.startTime);
                      const endMins = timeToMinutes(shift.endTime);
                      const top = (startMins - bounds.start) * PIXELS_PER_MINUTE;
                      const height = (endMins - startMins) * PIXELS_PER_MINUTE;
                      const isSelected = selectedShiftId === shift.id;

                      return (
                        <ShiftBlock
                          key={shift.id}
                          shift={shift}
                          top={top}
                          height={height}
                          isSelected={isSelected}
                          showWorkerInfo={viewMode === 'week'}
                          onMoveStart={(e) => startInteraction(e, 'move', col.id, shift)}
                          onResizeStart={(e) => startInteraction(e, 'resize', col.id, shift)}
                          onDelete={() => {
                            setWorkers(prev => prev.map(w => ({
                              ...w,
                              shifts: w.shifts.filter(s => s.id !== shift.id)
                            })));
                          }}
                          onUpdateTitle={(newTitle) => onUpdateShiftTitle(shift.id, newTitle)}
                        />
                      );
                    })}

                    {/* Render draft shift if it belongs to this column */}
                    {draft && ((viewMode === 'day' && draft.workerId === col.workerId) || (viewMode === 'week' && draft.date === col.date)) && (
                      <ShiftBlock
                        shift={draft as any}
                        top={(timeToMinutes(draft.startTime) - bounds.start) * PIXELS_PER_MINUTE}
                        height={(timeToMinutes(draft.endTime) - timeToMinutes(draft.startTime)) * PIXELS_PER_MINUTE}
                        isDraft
                        showWorkerInfo={viewMode === 'week'}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShiftBlockProps {
  shift: Shift & { workerName?: string; avatar?: string };
  top: number;
  height: number;
  isDraft?: boolean;
  isSelected?: boolean;
  showWorkerInfo?: boolean;
  onMoveStart?: (e: React.MouseEvent) => void;
  onResizeStart?: (e: React.MouseEvent) => void;
  onDelete?: () => void;
  onUpdateTitle?: (newTitle: string) => void;
}

function ShiftBlock({ shift, top, height, isDraft, isSelected, showWorkerInfo, onMoveStart, onResizeStart, onDelete, onUpdateTitle }: ShiftBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(shift.title);

  const handleSave = () => {
    setIsEditing(false);
    if (editTitle.trim() !== shift.title && onUpdateTitle) {
      onUpdateTitle(editTitle.trim() || 'Untitled Task');
    } else {
      setEditTitle(shift.title);
    }
  };

  return (
    <div
      className={`absolute left-1 right-1 rounded-md border shadow-sm overflow-hidden flex flex-col transition-shadow duration-200 ${shift.color} ${isDraft ? 'opacity-80 shadow-lg z-50 ring-2 ring-indigo-500 ring-offset-1' : 'hover:shadow-md z-10'} ${isSelected && !isEditing ? 'ring-2 ring-indigo-600 ring-offset-1 z-30' : ''}`}
      style={{ top, height }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!isDraft) {
          setIsEditing(true);
          setEditTitle(shift.title);
        }
      }}
    >
      {/* Drag Handle Area */}
      <div
        className={`flex-1 p-2 ${isDraft ? 'cursor-grabbing' : isEditing ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'} relative group`}
        onMouseDown={(e) => {
          if (!isEditing) onMoveStart?.(e);
        }}
      >
        {showWorkerInfo && shift.workerName && !isEditing && (
          <div className="flex items-center gap-1.5 mb-1">
            {shift.avatar && <img src={shift.avatar} className="w-4 h-4 rounded-full" alt="" />}
            <span className="text-[10px] font-medium opacity-90 truncate">{shift.workerName}</span>
          </div>
        )}
        
        {isEditing ? (
          <input
            autoFocus
            className="w-full bg-white/80 border border-indigo-300 rounded px-1 py-0.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 mb-0.5"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setIsEditing(false);
                setEditTitle(shift.title);
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-xs font-semibold mb-0.5 truncate pr-5">{shift.title}</div>
        )}

        <div className="text-[10px] opacity-80 font-medium">
          {shift.startTime} - {shift.endTime}
        </div>
        
        {isSelected && !isDraft && !isEditing && (
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
             className="absolute top-1 right-1 p-1 bg-white/50 hover:bg-white/80 rounded text-red-600 transition-colors"
           >
             <Trash2 className="w-3 h-3" />
           </button>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="h-3 w-full cursor-ns-resize flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/5"
        onMouseDown={onResizeStart}
      >
        <GripHorizontal className="w-3 h-3 opacity-50" />
      </div>
    </div>
  );
}
