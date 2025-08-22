import AdminMeetingsTrend from '../components/AdminMeetingsTrend.jsx'
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
        {/* AdminMeetingsTrend */}
        <section>
          <AdminMeetingsTrend filteredRows={filteredRows} />
        </section>

        {/* OvertimeIncidence */}
        <section>
          <OvertimeIncidence filteredRows={filteredRows} />
        </section>

        {/* STILL DISABLED - Testing one at a time */}
        {/* 
        <OutlierDaysTable filteredRows={filteredRows} />
        */}
        
        <div className="text-center text-yellow-400 py-4 text-sm">
          🚧 Debug Mode: Testing AdminMeetingsTrend + OvertimeIncidence
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
