'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCampaignById, getCampaignCalendar, updateCampaignCalendarMonth, updateCampaignCalendarWeekday } from '@/lib/queries';
import type { Campaign, CampaignCalendar, CampaignCalendarMonth, CampaignCalendarWeekday } from '@/lib/types';

export default function CampaignCalendarPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignCalendar, setCampaignCalendar] = useState<CampaignCalendar | null>(null);
  const [editableMonths, setEditableMonths] = useState<CampaignCalendarMonth[]>([]);
  const [editableWeekdays, setEditableWeekdays] = useState<CampaignCalendarWeekday[]>([]);

  useEffect(() => {
    async function loadData() {
      const [campaignData, campaignCalendarData] = await Promise.all([
        getCampaignById(campaignId),
        getCampaignCalendar(campaignId),
      ]);

      setCampaign(campaignData);
      setCampaignCalendar(campaignCalendarData);
      setEditableMonths(campaignCalendarData?.campaign_calendar_months ?? []);
      setEditableWeekdays(campaignCalendarData?.campaign_calendar_weekdays ?? []);
    }

    loadData();
  }, [campaignId]);

  const handleMonthChange = (monthId: string, field: 'name' | 'days', value: string) => {
    setEditableMonths((prev) =>
      prev.map((month) =>
        month.id === monthId
          ? {
              ...month,
              [field]: field === 'days' ? Number.parseInt(value, 10) || 0 : value,
            }
          : month
      )
    );
  };

  const handleWeekdayChange = (weekdayId: string, value: string) => {
    setEditableWeekdays((prev) =>
      prev.map((weekday) => (weekday.id === weekdayId ? { ...weekday, name: value } : weekday))
    );
  };

  const handleSaveCalendar = async () => {
    if (!campaignCalendar) return;
    if (editableMonths.some((month) => month.days < 1)) return;

    const monthUpdates = editableMonths.filter((month) => {
      const originalMonth = campaignCalendar.campaign_calendar_months.find((item) => item.id === month.id);
      return originalMonth && (originalMonth.name !== month.name || originalMonth.days !== month.days);
    });

    const weekdayUpdates = editableWeekdays.filter((weekday) => {
      const originalWeekday = campaignCalendar.campaign_calendar_weekdays.find((item) => item.id === weekday.id);
      return originalWeekday && originalWeekday.name !== weekday.name;
    });

    const monthResults = await Promise.all(
      monthUpdates.map((month) =>
        updateCampaignCalendarMonth(month.id, {
          name: month.name.trim() || month.name,
          days: month.days,
        })
      )
    );

    const weekdayResults = await Promise.all(
      weekdayUpdates.map((weekday) =>
        updateCampaignCalendarWeekday(weekday.id, {
          name: weekday.name.trim() || weekday.name,
        })
      )
    );

    if ([...monthResults, ...weekdayResults].some((result) => !result)) return;

    const campaignCalendarData = await getCampaignCalendar(campaignId);
    setCampaignCalendar(campaignCalendarData);
    setEditableMonths(campaignCalendarData?.campaign_calendar_months ?? []);
    setEditableWeekdays(campaignCalendarData?.campaign_calendar_weekdays ?? []);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Campaign calendar</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">{campaign?.name || 'Campaign'}</h1>
              <p className="mt-2 text-sm text-slate-600">Edit weekdays and months for this campaign calendar.</p>
            </div>
            <Link
              href={`/campaigns/${campaignId}`}
              className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Back to campaign
            </Link>
          </div>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Edit Calendar</h2>
            <button
              onClick={handleSaveCalendar}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>

          {!campaignCalendar ? (
            <p className="mt-4 text-sm text-slate-500">No calendar configured for this campaign.</p>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Weekdays</p>
                {editableWeekdays.map((weekday) => (
                  <input
                    key={weekday.id}
                    type="text"
                    value={weekday.name}
                    onChange={(e) => handleWeekdayChange(weekday.id, e.target.value)}
                    className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Months</p>
                {editableMonths.map((month) => (
                  <div key={month.id} className="flex gap-2">
                    <input
                      type="text"
                      value={month.name}
                      onChange={(e) => handleMonthChange(month.id, 'name', e.target.value)}
                      className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <input
                      type="number"
                      min={1}
                      value={month.days}
                      onChange={(e) => handleMonthChange(month.id, 'days', e.target.value)}
                      className="w-20 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
