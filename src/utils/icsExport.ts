import { DaySchedule } from '../engine/types';

export function generateICSFile(
  schedule: DaySchedule[],
  slotNo: number,
  memberName: string
): string {
  const events: string[] = [];

  for (const day of schedule) {
    const shift = day.shifts.find((s) => s.slotNo === slotNo);
    if (!shift || shift.shiftCode === 'X') continue;

    let title = '';
    let startHour = 8;
    let endHour = 16;

    if (
      shift.shiftCode === 'D' ||
      shift.shiftCode === '3D' ||
      shift.shiftCode === '4D' ||
      shift.shiftCode === '일근'
    ) {
      title = `[주간] ${shift.shiftCode} 근무`;
      startHour = 8;
      endHour = 16;
    } else if (shift.shiftCode === 'A') {
      title = `[오후] A 근무`;
      startHour = 16;
      endHour = 24;
    } else if (shift.shiftCode === 'N' || shift.shiftCode === '3N') {
      title = `[야간] ${shift.shiftCode} 근무`;
      startHour = 0;
      endHour = 8;
    }

    const dateCompact = day.dateStr.replace(/-/g, '');
    const startTime = `${dateCompact}T${String(startHour).padStart(2, '0')}0000`;
    const endTime = `${dateCompact}T${String(endHour).padStart(2, '0')}0000`;

    events.push(
      [
        'BEGIN:VEVENT',
        `UID:radshift-${day.dateStr}-${slotNo}@khnp.co.kr`,
        `DTSTAMP:${dateCompact}T000000Z`,
        `DTSTART:${startTime}`,
        `DTEND:${endTime}`,
        `SUMMARY:${title} (${shift.unit})`,
        `DESCRIPTION:고리 3,4호기 HP 교대근무 - ${memberName} (Slot ${slotNo})`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n')
    );
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KHNP Kori 3,4 HP//RadShift_K34//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:고리3,4 HP_${memberName}`,
    events.join('\r\n'),
    'END:VCALENDAR',
  ].join('\r\n');
}

export function exportPersonalICalendar(
  schedule: DaySchedule[],
  slotNo: number,
  memberName: string
) {
  const icsContent = generateICSFile(schedule, slotNo, memberName);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RadShift_K34_${memberName}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
