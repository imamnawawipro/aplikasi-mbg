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
        <div className="flex flex-col items-center gap-4 p-4 bg-white dark:bg-card rounded-lg shadow-sm border mb-6">
            <div className="flex items-center justify-between w-full max-w-sm">
                <button
                    onClick={handlePrevDay}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Previous day"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {isToday(selectedDate) ? '(Hari Ini)' : ''}
                    </span>
                </div>

                <button
                    onClick={handleNextDay}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Next day"
                >
                    <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {!isToday(selectedDate) && (
                <button
                    onClick={handleToday}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-full",
                        "hover:bg-primary/20 transition-colors"
                    )}
                >
                    <CalendarIcon className="w-4 h-4" />
                    Kembali ke Hari Ini
                </button>
            )}
        </div>
    );
}
