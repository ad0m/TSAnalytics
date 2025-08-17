import KpiTiles from '../components/KpiTiles.jsx'
import RoleUtilBullet from '../components/RoleUtilBullet.jsx'
import DeptUtilTrend from '../components/DeptUtilTrend.jsx'
import BillableVsNonbillableArea from '../components/BillableVsNonbillableArea.jsx'
import TopCompaniesBar from '../components/TopCompaniesBar.jsx'
import ClientPareto from '../components/ClientPareto.jsx'

export default function Overview({ filteredRows, onCompanyFilter }) {
  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <section>
        <h2 className="oryx-heading text-xl mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">📊</span>
          </span>
          Key Performance Indicators
        </h2>
        <KpiTiles filteredRows={filteredRows} />
      </section>

      {/* Full Width Charts - Stacked */}
      <section>
        <TopCompaniesBar 
          filteredRows={filteredRows} 
          onCompanyClick={onCompanyFilter}
        />
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Utilization Chart */}
        <RoleUtilBullet filteredRows={filteredRows} />
        
        {/* Department Utilization Trend */}
        <DeptUtilTrend filteredRows={filteredRows} />
      </div>

      {/* Full Width Charts */}
      <section>
        <BillableVsNonbillableArea filteredRows={filteredRows} />
      </section>
      
      <section>
        <ClientPareto filteredRows={filteredRows} />
      </section>
    </div>
  )
}
