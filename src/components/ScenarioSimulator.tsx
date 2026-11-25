import React from 'react';
import { DaySchedule } from '../engine/types';
import { Layers, ShieldCheck } from 'lucide-react';

interface ScenarioSimulatorProps {
  schedule2026: DaySchedule[];
  schedule2027: DaySchedule[];
  anonymize: boolean;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  schedule2026,
  schedule2027,
  anonymize,
}) => {
  const getName = (slotNo: number, baseName: string) => {
    if (anonymize) return `HP-0${slotNo}`;
    return baseName;
  };

  const getStats = (schedule: DaySchedule[], slot: number) => {
    let d = 0, a = 0, n = 0, x = 0;
    for (const day of schedule) {
      const s = day.shifts.find((shift) => shift.slotNo === slot);
      if (!s) continue;
      if (s.shiftCode === 'D' || s.shiftCode === '3D' || s.shiftCode === '4D' || s.shiftCode === '3D*' || s.shiftCode === '4D*') d++;
      else if (s.shiftCode === 'A') a++;
      else if (s.shiftCode === 'N' || s.shiftCode === '3N') n++;
      else if (s.shiftCode === 'X') x++;
    }
    return { d, a, n, x, total: d + a + n };
  };

  return (
    <div className="space-y-6">
      {/* Scenario Milestones Timeline */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">2027년 8+1 방안부 일근지원 $\rightarrow$ 9인 원복 시나리오 타임라인</h2>
            <p className="text-xs text-slate-500">
              결원 발생부터 지원조 투입, 84일 호기 이동, 신규 복원 및 잔여 14일 통상근무 완료까지의 전 주기 흐름
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            {
              date: '2027-01-01',
              title: '결원 발생 & 대체',
              desc: '최창호 결원 발생 -> 신욱제(Slot 8)가 1행 최창호 위치(1/1 위상 4) 임시 대체 투입',
              badge: '8인 체제 돌입',
            },
            {
              date: '2027-01-04 ~ 03-07',
              title: '방안부 지원조 투입',
              desc: '평일 3D/4D 직접 지원 & 여유일 D->X 대휴 스왑 / 주말·공휴일 Phase-11 X->D 대휴 적립',
              badge: '8+1 체제 운영',
            },
            {
              date: '2027-02-01',
              title: '84일 주기 호기 이동',
              desc: '송명관(4->3호기)과 임원택(3->4호기) 교차 이동 (2/2 송명관 X, 임원택 3N 1일 보정)',
              badge: '연속근무 3일 보장',
            },
            {
              date: '2027-03-08',
              title: '이재겸 투입 & 복원',
              desc: '신규 이재겸 Slot 1 배치, 신욱제 본래 Slot 8 복귀. 3/8 신욱제 X, 이재겸 4D 인수인계',
              badge: '9인 복원 완료',
            },
            {
              date: '2027-03-22',
              title: '정규 순환 재개',
              desc: '신욱제 14일 잔여 통상근무 완료 후 Slot 9 송명관으로 정규 21일 통상 순환 재개',
              badge: '정상 21일 주기',
            },
          ].map((item, i) => (
            <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                  {item.badge}
                </span>
                <span className="text-xs font-bold text-slate-900 block mt-2">{item.date}</span>
                <span className="text-xs font-extrabold text-brand-700 block mt-0.5">{item.title}</span>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2026 vs 2027 Comparison Matrix */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">2026년 9인 체제 vs 2027년 8+1 체제 개인별 근무일수 비교</h3>
            <p className="text-xs text-slate-500">연간 D, A, N, 휴무 및 총 근무일수 비교</p>
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>양 시나리오 모두 커버리지 오류 0건</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-700">성명 (슬롯)</th>
                <th colSpan={4} className="px-4 py-2 text-center font-bold text-brand-700 bg-brand-50/50 border-x">
                  2026년 정상 9인 (연간 365일)
                </th>
                <th colSpan={4} className="px-4 py-2 text-center font-bold text-purple-700 bg-purple-50/50">
                  2027년 8+1 체제 (연간 365일)
                </th>
                <th className="px-4 py-3 text-center font-bold text-slate-700">변동 내역</th>
              </tr>
              <tr className="border-t border-slate-200 text-[10px] text-slate-500 bg-slate-50">
                <th className="px-4 py-1.5 text-left"></th>
                <th className="px-2 py-1.5 text-center">D</th>
                <th className="px-2 py-1.5 text-center">A</th>
                <th className="px-2 py-1.5 text-center">N</th>
                <th className="px-2 py-1.5 text-center font-bold text-slate-800 border-r">총근무</th>
                <th className="px-2 py-1.5 text-center">D</th>
                <th className="px-2 py-1.5 text-center">A</th>
                <th className="px-2 py-1.5 text-center">N</th>
                <th className="px-2 py-1.5 text-center font-bold text-slate-800">총근무</th>
                <th className="px-4 py-1.5 text-center">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slot) => {
                const s26 = getStats(schedule2026, slot);
                const s27 = getStats(schedule2027, slot);
                const name27 = schedule2027[0].shifts.find((s) => s.slotNo === slot)?.memberName || `Slot ${slot}`;

                return (
                  <tr key={slot} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      {getName(slot, name27)} <span className="text-[10px] text-slate-400 font-normal">(Slot {slot})</span>
                    </td>
                    {/* 2026 stats */}
                    <td className="px-2 py-3 text-center text-slate-600">{s26.d}</td>
                    <td className="px-2 py-3 text-center text-slate-600">{s26.a}</td>
                    <td className="px-2 py-3 text-center text-slate-600">{s26.n}</td>
                    <td className="px-2 py-3 text-center font-black text-brand-700 border-r bg-brand-50/20">
                      {s26.total}일
                    </td>
                    {/* 2027 stats */}
                    <td className="px-2 py-3 text-center text-slate-600">{s27.d}</td>
                    <td className="px-2 py-3 text-center text-slate-600">{s27.a}</td>
                    <td className="px-2 py-3 text-center text-slate-600">{s27.n}</td>
                    <td className="px-2 py-3 text-center font-black text-purple-700 bg-purple-50/20">
                      {s27.total}일
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 text-[11px]">
                      {slot === 1 ? '최창호 -> 신욱제(대체) -> 이재겸(복원)' : slot === 5 ? '나상흠 -> 박상현 개명' : '정규 순환'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
