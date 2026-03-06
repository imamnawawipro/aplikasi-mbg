import { useState, useEffect, useMemo } from 'react';
import { format, addDays, subDays, isToday, isSameDay, startOfWeek, eachDayOfInterval, endOfWeek } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface CalendarViewProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

export function CalendarView({ selectedDate, onDateChange }: CalendarViewProps) {
    const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());

    // Calculate the week containing the selected date (Mon - Sun)
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart.toISOString()]);

    const handlePrevWeek = () => onDateChange(subDays(selectedDate, 7));
    const handleNextWeek = () => onDateChange(addDays(selectedDate, 7));
    const handleToday = () => onDateChange(new Date());

    // Fetch dates that have MBG logs in this week
    useEffect(() => {
        async function fetchMarkedDates() {
            const startStr = format(weekStart, 'yyyy-MM-dd');
            const endStr = format(weekEnd, 'yyyy-MM-dd');

            const { data, error } = await supabase
                .from('mbg_logs')
                .select('date')
                .gte('date', startStr)
                .lte('date', endStr)
                .eq('is_received', true);

            if (!error && data) {
                const uniqueDates = new Set(data.map(d => d.date));
                setMarkedDates(uniqueDates);
            }
        }
        fetchMarkedDates();
    }, [weekStart.toISOString()]);

    const hasToday = weekDays.some(d => isToday(d));

    return (
        <div className="flex flex-col gap-3">
            {/* Week Navigation Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={handlePrevWeek}
                    className="p-2 rounded-xl hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors active:scale-95"
                    aria-label="Previous week"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-gray-800">
                        {format(weekStart, 'MMM yyyy', { locale: id })}
                    </span>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-500 mt-0.5">
                        {format(weekStart, 'd', { locale: id })} - {format(weekEnd, 'd MMM', { locale: id })}
                    </span>
                </div>

                <button
                    onClick={handleNextWeek}
                    className="p-2 rounded-xl hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors active:scale-95"
                    aria-label="Next week"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Week Day Strip */}
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);
                    const hasData = markedDates.has(dateStr);

                    return (
                        <button
                            key={dateStr}
                            onClick={() => onDateChange(day)}
                            className={cn(
                                "flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-200 relative",
                                isSelected
                                    ? "bg-gradient-to-b from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 scale-105"
                                    : isCurrentDay
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "hover:bg-gray-50 text-gray-600"
                            )}
                        >
                            {/* Day Name */}
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                isSelected ? "text-emerald-100" : "text-gray-400"
                            )}>
                                {format(day, 'EEE', { locale: id }).slice(0, 3)}
                            </span>

                            {/* Day Number */}
                            <span className={cn(
                                "text-lg font-extrabold leading-tight mt-0.5",
                                isSelected ? "text-white" : isCurrentDay ? "text-emerald-700" : "text-gray-800"
                            )}>
                                {format(day, 'd')}
                            </span>

                            {/* MBG Data Marker */}
                            {hasData && (
                                <div className={cn(
                                    "mt-1",
                                    isSelected ? "text-white" : "text-emerald-500"
                                )}>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                            )}

                            {/* No data dot placeholder for alignment */}
                            {!hasData && <div className="mt-1 h-3.5" />}
                        </button>
                    );
                })}
            </div>

            {/* Selected Date Display + Today Button */}
            <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-bold text-gray-700">
                    {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}
                </p>

                {!hasToday || !isToday(selectedDate) ? (
                    <button
                        onClick={handleToday}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors active:scale-95"
                    >
                        <CalendarIcon className="w-3 h-3" />
                        Hari Ini
                    </button>
                ) : null}
            </div>
        </div>
    );
}
