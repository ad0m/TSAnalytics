import Top5ClientsTrend from '../components/Top5ClientsTrend.jsx'
import ClientWorkTypeMix from '../components/ClientWorkTypeMix.jsx'
import ClientProjectTypeMix from '../components/ClientProjectTypeMix.jsx'
import AvgHoursPerProjectByClient from '../components/AvgHoursPerProjectByClient.jsx'
import TopInternalClients from '../components/TopInternalClients.jsx'

export default function Clients({ filteredRows, onCompanyFilter }) {
  return (
    <div className="space-y-6">
      {/* Top 5 Clients Trend - Small Multiples */}
      <section>
        <h2 className="oryx-heading text-xl mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">📈</span>
          </span>
          <span style={{ color: '#EFECD2' }}>Top 5 Clients Trends</span>
        </h2>
        <Top5ClientsTrend filteredRows={filteredRows} onCompanyFilter={onCompanyFilter} />
      </section>

      {/* Client Work Type Mix - Full Width */}
      <section>
        <h2 className="oryx-heading text-xl mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">🔧</span>
          </span>
          Client Work Type Mix (100% Stacked)
        </h2>
        <ClientWorkTypeMix filteredRows={filteredRows} onCompanyFilter={onCompanyFilter} />
      </section>

      {/* Client Project Type Mix - Full Width */}
      <section>
        <h2 className="oryx-heading text-xl mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">📊</span>
          </span>
          Client Project Type Mix
        </h2>
        <ClientProjectTypeMix filteredRows={filteredRows} onCompanyFilter={onCompanyFilter} />
      </section>

      {/* Remaining Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Hours per Project by Client */}
        <AvgHoursPerProjectByClient filteredRows={filteredRows} onCompanyFilter={onCompanyFilter} />
        
        {/* Top Internal Clients */}
        <TopInternalClients filteredRows={filteredRows} onCompanyFilter={onCompanyFilter} />
      </div>
    </div>
  )
}
