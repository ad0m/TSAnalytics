import AdminMeetingsTrend from '../components/AdminMeetingsTrend.jsx'
import LatePostingImpact from '../components/LatePostingImpact.jsx'
import OvertimeIncidence from '../components/OvertimeIncidence.jsx'
import OutlierDaysTable from '../components/OutlierDaysTable.jsx'

export default function Governance({ filteredRows }) {
  try {
    console.log('Governance - Rendering with', filteredRows?.length, 'rows')
    
    if (!filteredRows) {
      console.log('Governance - No filtered rows provided')
      return <div className="space-y-6">
        <div className="text-center text-slate-400 py-8">
          No data available
        </div>
      </div>
    }
    
    return (
      <div className="space-y-6">
        {/* TEST: AdminMeetingsTrend + LatePostingImpact */}
        <section>
          <h2 className="oryx-heading text-xl mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
              <span className="text-lime-400">📋</span>
            </span>
            Administrative & Compliance Analysis (Testing)
          </h2>
          <AdminMeetingsTrend filteredRows={filteredRows} />
        </section>

        {/* TEST: Rewritten LatePostingImpact */}
        <section>
          <h2 className="oryx-heading text-xl mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
              <span className="text-lime-400">📊</span>
            </span>
            Late Posting Impact (Rewritten - Testing)
          </h2>
          <LatePostingImpact filteredRows={filteredRows} />
        </section>

        {/* TEST: Adding OvertimeIncidence */}
        <section>
          <h2 className="oryx-heading text-xl mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
              <span className="text-lime-400">⏱️</span>
            </span>
            Overtime Incidence (Testing)
          </h2>
          <OvertimeIncidence filteredRows={filteredRows} />
        </section>

        {/* STILL DISABLED - Testing one at a time */}
        {/* 
        <OutlierDaysTable filteredRows={filteredRows} />
        */}
        
        <div className="text-center text-yellow-400 py-4 text-sm">
          🚧 Debug Mode: Testing AdminMeetingsTrend + LatePostingImpact + OvertimeIncidence
        </div>
      </div>
    )
  } catch (error) {
    console.error('Governance - Render error:', error)
    return (
      <div className="space-y-6">
        <div className="text-center text-red-400 py-8">
          <h3 className="text-lg font-medium mb-2">Error Loading Governance</h3>
          <p className="text-sm">There was an issue loading the governance analytics. Check the console for details.</p>
        </div>
      </div>
    )
  }
}
