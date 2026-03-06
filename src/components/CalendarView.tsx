import { format, addDays, subDays, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface CalendarViewProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

export function CalendarView({ selectedDate, onDateChange }: CalendarViewProps) {
    const handlePrevDay = () => onDateChange(subDays(selectedDate, 1));
    const handleNextDay = () => onDateChange(addDays(selectedDate, 1));
    const handleToday = () => onDateChange(new Date());

    return (
        <div className="flex flex-col items-center gap-4 p-5 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 mb-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between w-full max-w-sm">
                <button
                    onClick={handlePrevDay}
                    className="p-2.5 rounded-xl hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-all active:scale-95 group"
                    aria-label="Previous day"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-gray-800 tracking-tight">
                        {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}
                    </span>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-500 mt-0.5">
                        {isToday(selectedDate) ? 'Hari Ini' : ''}
                    </span>
                </div>

                <button
                    onClick={handleNextDay}
                    className="p-2.5 rounded-xl hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-all active:scale-95 group"
                    aria-label="Next day"
                >
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>

            {!isToday(selectedDate) && (
                <button
                    onClick={handleToday}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full",
                        "hover:from-emerald-400 hover:to-teal-400 shadow-sm shadow-emerald-500/20 transition-all active:scale-95 mt-1"
                    )}
                >
                    <CalendarIcon className="w-4 h-4" />
                    Kembali ke Hari Ini
                </button>
            )}
        </div>
    );
}
