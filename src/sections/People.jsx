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
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              style={{ color: '#B5C933' }}
            >
              <circle cx="8" cy="8" r="3" />
              <circle cx="16" cy="7" r="2.5" opacity="0.9" />
              <path d="M3 18c0-2.5 3-4 5-4s5 1.5 5 4v1H3v-1z" />
              <path d="M12 18c.2-1.8 2.2-3 4-3 1.8 0 3.8 1.2 4 3v1h-8v-1z" opacity="0.9" />
            </svg>
          </span>
          <span style={{ color: '#EFECD2' }}>Individual Performance Analysis</span>
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

      {/* Role Utilisation Trend - Full Width */}
      <section>
        <RoleUtilTrend filteredRows={filteredRows} onReset={onReset} />
      </section>
    </div>
  )
}
