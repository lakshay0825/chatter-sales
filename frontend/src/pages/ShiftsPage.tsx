import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Zap, X } from 'lucide-react';
import { Shift, User, UserRole } from '../types';
import { shiftService, CreateShiftData } from '../services/shift.service';
import { userService } from '../services/user.service';
import { useAuthStore } from '../store/authStore';
import { useLoadingStore } from '../store/loadingStore';
import { openConfirm } from '../components/ConfirmDialog';
import { format, startOfWeek, addDays, addWeeks, subWeeks, endOfDay } from 'date-fns';
import it from 'date-fns/locale/it';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';

const SHIFT_TIMES = {
  MORNING: { start: '09:00', end: '14:30', label: 'Mattina', color: 'bg-yellow-100 border-yellow-300' },
  AFTERNOON: { start: '14:30', end: '20:00', label: 'Pomeriggio', color: 'bg-green-100 border-green-300' },
  EVENING: { start: '20:00', end: '01:00', label: 'Sera', color: 'bg-purple-100 border-purple-300' },
};

type ShiftTimeKey = keyof typeof SHIFT_TIMES;

export default function ShiftsPage() {
  const { user } = useAuthStore();
  const { startLoading, stopLoading } = useLoadingStore();
  const [users, setUsers] = useState<User[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [localShifts, setLocalShifts] = useState<Map<string, Shift>>(new Map());
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  const isManager = user?.role === 'ADMIN' || user?.role === 'CHATTER_MANAGER';

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadShifts();
  }, [currentWeek]);

  const loadUsers = async () => {
    try {
      // Load both CHATTER and CHATTER_MANAGER users
      const [chatters, managers] = await Promise.all([
        userService.getUsers({ role: UserRole.CHATTER, isActive: true }),
        userService.getUsers({ role: UserRole.CHATTER_MANAGER, isActive: true }),
      ]);
      const allUsers = [...chatters, ...managers];
      setUsers(allUsers);
      console.log('ShiftsPage: Users loaded:', allUsers.length, allUsers);
      if (allUsers.length === 0) {
        console.warn('No active CHATTER or CHATTER_MANAGER users found');
      }
    } catch (error: any) {
      console.error('ShiftsPage: Failed to load users:', error);
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'users' }));
    }
  };

  const loadShifts = async () => {
    setIsLoading(true);
    try {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfDay(addDays(weekStart, 6)); // Sunday end of day (23:59:59.999)
      
      const data = await shiftService.getShifts({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      });

      const shiftsMap = new Map<string, Shift>();
      data.forEach((shift) => {
        const shiftDate = new Date(shift.date);
        const key = getShiftKey(shiftDate, shift.startTime, shift.userId);
        shiftsMap.set(key, shift);
      });
      
      setLocalShifts(shiftsMap);
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'shifts' }));
    } finally {
      setIsLoading(false);
    }
  };

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  // Ensure we always have 7 days: Monday (0) through Sunday (6)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getShiftKey = (date: Date, startTime: string, userId: string) => {
    return `${format(date, 'yyyy-MM-dd')}_${startTime}_${userId}`;
  };

  const getShiftForDay = (date: Date, shiftKey: ShiftTimeKey) => {
    const shiftTime = SHIFT_TIMES[shiftKey];
    // Normalize date to YYYY-MM-DD string for comparison (avoid timezone issues)
    const targetDateStr = format(date, 'yyyy-MM-dd');
    
    // Only return a single shift per time slot (Morning/Afternoon/Evening)
    const slotShift = Array.from(localShifts.values()).find(
      (shift) => {
        const shiftDate = new Date(shift.date);
        const shiftDateStr = format(shiftDate, 'yyyy-MM-dd');
        return shiftDateStr === targetDateStr && shift.startTime === shiftTime.start;
      }
    );
    return slotShift ? [slotShift] : [];
  };

  const handleDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData('userId', userId);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetDate: Date,
    targetShift: ShiftTimeKey
  ) => {
    e.preventDefault();
    if (!isManager) return;

    const userId = e.dataTransfer.getData('userId');
    if (!userId) return;

    const shiftTime = SHIFT_TIMES[targetShift];
    // Format date as ISO string (YYYY-MM-DD) - backend will convert to Date
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    // New rule: a user can only have ONE shift per day (morning OR afternoon OR evening)
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
    const existingUserShiftSameDay = Array.from(localShifts.values()).find(
      (shift) => {
        const shiftDate = new Date(shift.date);
        const shiftDateStr = format(shiftDate, 'yyyy-MM-dd');
        return shift.userId === userId && shiftDateStr === targetDateStr;
      }
    );

    if (existingUserShiftSameDay) {
      toast.error('This user already has a shift on this day.');
      return;
    }

    // Check if a shift already exists in this time slot (for any user)
    const existingSlotShift = Array.from(localShifts.values()).find(
      (shift) => {
        const shiftDate = new Date(shift.date);
        const shiftDateStr = format(shiftDate, 'yyyy-MM-dd');
        return shiftDateStr === targetDateStr && shift.startTime === shiftTime.start;
      }
    );

    startLoading('Saving shift...');
    try {
      if (existingSlotShift) {
        // Update the existing slot shift to the new user (replace)
        await shiftService.updateShift(existingSlotShift.id, {
          userId,
          date: dateStr,
          startTime: shiftTime.start as any,
          endTime: shiftTime.end as any,
        });
        toast.success('Shift updated');
      } else {
        // Create new shift for this slot
        const shiftData: CreateShiftData = {
          userId,
          date: dateStr,
          startTime: shiftTime.start as any,
          endTime: shiftTime.end as any,
        };
        await shiftService.createShift(shiftData);
        toast.success('Shift created');
      }
      await loadShifts();
    } catch (error: any) {
      console.error('Failed to save shift:', error);
      toast.error(getUserFriendlyError(error, { action: 'save', entity: 'shift' }));
    } finally {
      stopLoading();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveShift = async (shiftId: string) => {
    const confirmed = await openConfirm({
      title: 'Remove shift',
      message: 'Are you sure you want to remove this shift?',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    startLoading('Removing shift...');
    try {
      await shiftService.deleteShift(shiftId);
      toast.success('Shift removed');
      await loadShifts();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, { action: 'remove', entity: 'shift' }));
    } finally {
      stopLoading();
    }
  };

  const handleReset = async () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfDay(addDays(weekStart, 6)); // Sunday end of day

    const confirmed = await openConfirm({
      title: 'Clear week shifts',
      message: `Are you sure you want to delete all shifts for this week? This action cannot be undone.`,
      confirmLabel: 'Delete all',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    
    startLoading("Clearing this week's shifts...");
    try {
      // Ask backend to delete all shifts for the current week by date range
      await shiftService.clearShiftsRange({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      });

      toast.success('Successfully deleted all shifts for this week');
      await loadShifts();
    } catch (error: any) {
      console.error('Failed to clear shifts:', error);
      toast.error(getUserFriendlyError(error, { action: 'clear', entity: 'shifts' }));
    } finally {
      stopLoading();
    }
  };

  const handleAutoGenerate = async () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfDay(addDays(weekStart, 6)); // Sunday end of day
    
    // Check if current week has any shifts
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    const currentWeekShifts = Array.from(localShifts.values()).filter((shift) => {
      const shiftDate = new Date(shift.date);
      const shiftDateStr = format(shiftDate, 'yyyy-MM-dd');
      return shiftDateStr >= weekStartStr && shiftDateStr <= weekEndStr;
    });
    
    if (currentWeekShifts.length === 0) {
      toast.error(
        "Please set up shifts for this week first. The auto-generate feature will copy this week's schedule to all 52 weeks of the year."
      );
      return;
    }

    const confirmed = await openConfirm({
      title: 'Auto-generate yearly schedule',
      message:
        "This will copy the current week's shift schedule to all 52 weeks of the year. You can still manually edit any specific week later.\n\nDo you want to continue?",
      confirmLabel: 'Generate for 52 weeks',
      cancelLabel: 'Cancel',
      variant: 'default',
    });
    if (!confirmed) return;

    setIsAutoGenerating(true);
    startLoading('Generating shifts for the entire year...');
    try {
      await shiftService.autoGenerateShifts(weekStart, undefined, true, true);
      toast.success('Shifts generated for entire year successfully! You can now navigate to any week and make manual adjustments.');
      await loadShifts();
    } catch (error: any) {
      console.error('Failed to auto-generate shifts:', error);
      toast.error(getUserFriendlyError(error, { 
        action: 'auto-generate', 
        entity: 'shifts',
        defaultMessage: 'Failed to generate shifts. Please ensure you have set up shifts for the current week first, then try again.'
      }));
    } finally {
      setIsAutoGenerating(false);
      stopLoading();
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Orari di Lavoro</h1>
        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoGenerate}
              className="btn btn-secondary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              title="Copy this week's schedule to all 52 weeks of the year"
              disabled={isAutoGenerating || isLoading}
            >
              {isAutoGenerating ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generazione in corso...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Auto-Genera (52 settimane)</span>
                </>
              )}
            </button>
            <button 
              onClick={handleReset} 
              className="btn btn-secondary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              title="Clear all shifts for this week"
              disabled={isAutoGenerating || isLoading}
            >
              <RotateCcw className="w-4 h-4" />
              Resetta Settimana
            </button>
          </div>
        )}
      </div>
      
      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
          {format(weekStart, 'dd MMMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMMM yyyy', { locale: it })}
        </span>
        <button
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {Object.entries(SHIFT_TIMES).map(([key, shift]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${shift.color.replace('bg-', 'bg-').replace('border-', 'border-2 border-')}`}></div>
            <span className="text-sm text-gray-700">{shift.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32"></th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[150px]">
                      <div className="text-gray-900 font-semibold">
                        {format(day, 'EEEE', { locale: it })}
                      </div>
                      <div className="text-gray-600 font-normal text-xs mt-1">
                        {format(day, 'd MMMM', { locale: it })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SHIFT_TIMES).map(([shiftKey, shiftTime]) => (
                  <tr key={shiftKey} className={`border-b border-gray-200 ${shiftTime.color}`}>
                    <td className="px-4 py-3 font-medium text-gray-700">{shiftTime.label}</td>
                    {weekDays.map((day) => {
                      const dayShifts = getShiftForDay(day, shiftKey as ShiftTimeKey);
                      return (
                        <td
                          key={day.toISOString()}
                          className="px-4 py-3 min-w-[150px]"
                          onDrop={(e) => handleDrop(e, day, shiftKey as ShiftTimeKey)}
                          onDragOver={handleDragOver}
                        >
                          <div className="space-y-2 min-h-[60px]">
                            {dayShifts.map((shift) => {
                              console.log(users);
                              const shiftUser = users.find((u) => u.id === shift.userId);
                              if (!shiftUser) return null;
                              return (
                                <div
                                  key={shift.id}
                                  draggable={isManager}
                                  onDragStart={(e) => handleDragStart(e, shift.userId)}
                                  className={`flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 ${isManager ? 'cursor-move hover:shadow-sm' : ''}`}
                                >
                                  {shiftUser.avatar ? (
                                    <img
                                      src={shiftUser.avatar}
                                      alt={shiftUser.name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-xs">
                                      {shiftUser.name.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-sm text-gray-900 flex-1">
                                    {shiftUser.name}
                                  </span>
                                  {isManager && (
                                    <button 
                                      className="text-gray-400 hover:text-red-600 p-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveShift(shift.id);
                                      }}
                                      title="Remove shift"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {dayShifts.length === 0 && isManager && (
                              <div className="text-xs text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                                Drop user here
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Available Users Row - Visible to all, but only managers can drag */}
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td className="px-4 py-3 font-medium text-gray-700">Liberi</td>
                  {weekDays.map((day) => {
                    // Get users not assigned to this specific day
                    const dayDateStr = format(day, 'yyyy-MM-dd');
                    const dayShifts = Array.from(localShifts.values()).filter((shift) => {
                      const shiftDate = new Date(shift.date);
                      const shiftDateStr = format(shiftDate, 'yyyy-MM-dd');
                      return shiftDateStr === dayDateStr;
                    });
                    const assignedUserIds = new Set(dayShifts.map((shift) => shift.userId));
                    const availableUsers = users.filter((user) => !assignedUserIds.has(user.id));
                    
                    return (
                      <td key={day.toISOString()} className="px-4 py-3">
                        <div className="space-y-2 min-h-[60px]">
                          {availableUsers.map((user) => (
                            <div
                              key={user.id}
                              draggable={isManager}
                              onDragStart={(e) => handleDragStart(e, user.id)}
                              className={`flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 ${isManager ? 'cursor-move hover:border-primary-300 hover:shadow-sm' : ''}`}
                            >
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-medium text-xs">
                                  {user.name.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm text-gray-900 flex-1">{user.name}</span>
                            </div>
                          ))}
                          {availableUsers.length === 0 && (
                            <div className="text-xs text-gray-400 text-center py-4">
                              Nessun utente disponibile
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
