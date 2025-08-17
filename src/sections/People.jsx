import HoursByPerson from '../components/HoursByPerson.jsx'
import WorkMixPerPerson from '../components/WorkMixPerPerson.jsx'
import DailyHoursBoxplot from '../components/DailyHoursBoxplot.jsx'
import CalendarHeatmap from '../components/CalendarHeatmap.jsx'
import RoleUtilTrend from '../components/RoleUtilTrend.jsx'

export default function People({ filteredRows, onCompanyFilter, onReset }) {
  return (
    <div className="space-y-6">
      {/* Hours by Person */}
      <section>
        <h2 className="oryx-heading text-xl mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">👥</span>
          </span>
          Individual Performance Analysis
        </h2>
        <HoursByPerson filteredRows={filteredRows} onReset={onReset} />
      </section>

      {/* Work Mix per Person - Full Width */}
      <section>
        <WorkMixPerPerson filteredRows={filteredRows} onReset={onReset} />
      </section>

      {/* Daily Hours Distribution - Full Width */}
      <section>
        <DailyHoursBoxplot filteredRows={filteredRows} onReset={onReset} />
      </section>

      {/* Calendar Heatmap - Full Width */}
      <section>
        <CalendarHeatmap filteredRows={filteredRows} onReset={onReset} />
      </section>

      {/* Role Utilization Trend - Full Width */}
      <section>
        <RoleUtilTrend filteredRows={filteredRows} onReset={onReset} />
      </section>
    </div>
  )
}
