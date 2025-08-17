import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'
import { X } from 'lucide-react'

export default function ProjectDetailDrawer({ projectName, filteredRows, onClose }) {
  const projectData = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0 || !projectName) {
      return { monthlyBreakdown: [], members: [], summary: null }
    }
    
    // Filter rows for this specific project
    const projectRows = filteredRows.filter(row => row['Project/Ticket'] === projectName)
    
    if (projectRows.length === 0) {
      return { monthlyBreakdown: [], members: [], summary: null }
    }
    
    // Calculate monthly breakdown
    const monthlyData = {}
    const memberData = {}
    let totalHours = 0
    let billableHours = 0
    
    for (const row of projectRows) {
      const month = row.calendarMonth
      const member = row.Member || 'Unknown'
      const hours = row.Hours
      const isBillable = row.isBillable
      
      // Monthly breakdown
      if (!monthlyData[month]) {
        monthlyData[month] = {
          billable: 0,
          nonBillable: 0
        }
      }
      
      if (isBillable) {
        monthlyData[month].billable += hours
        billableHours += hours
      } else {
        monthlyData[month].nonBillable += hours
      }
      
      // Member breakdown
      memberData[member] = (memberData[member] || 0) + hours
      totalHours += hours
    }
    
    // Convert monthly data to chart format
    const monthlyBreakdown = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        billable: Math.round(data.billable * 4) / 4,
        nonBillable: Math.round(data.nonBillable * 4) / 4,
        total: Math.round((data.billable + data.nonBillable) * 4) / 4
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
    
    // Convert member data to sorted array
    const members = Object.entries(memberData)
      .map(([member, hours]) => ({
        member,
        hours: Math.round(hours * 4) / 4,
        percentage: totalHours > 0 ? Math.round((hours / totalHours) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.hours - a.hours)
    
    const summary = {
      totalHours: Math.round(totalHours * 4) / 4,
      billableHours: Math.round(billableHours * 4) / 4,
      nonBillableHours: Math.round((totalHours - billableHours) * 4) / 4,
      billablePercentage: totalHours > 0 ? Math.round((billableHours / totalHours) * 1000) / 10 : 0,
      memberCount: members.length,
      monthCount: monthlyBreakdown.length
    }
    
    return { monthlyBreakdown, members, summary }
  }, [filteredRows, projectName])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-300">Total: {data.total}h</p>
          {payload.map((item, index) => (
            <p key={index} className="text-xs" style={{ color: item.color }}>
              {item.dataKey === 'billable' ? 'Billable' : 'Non-billable'}: {item.value}h
            </p>
          ))}
        </div>
      )
    }
    return null
  }
  
  if (!projectData.summary) {
    return null
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="oryx-card w-full max-w-4xl max-h-[90vh] mx-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="oryx-heading text-xl">{projectName}</h2>
            <p className="text-sm text-slate-400">Project Details & Breakdown</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-lime-400">{projectData.summary.totalHours}h</p>
              <p className="text-xs text-slate-300">Total Hours</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{projectData.summary.billablePercentage}%</p>
              <p className="text-xs text-slate-300">Billable</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">{projectData.summary.memberCount}</p>
              <p className="text-xs text-slate-300">Contributors</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{projectData.summary.monthCount}</p>
              <p className="text-xs text-slate-300">Months Active</p>
            </div>
          </div>
          
          {/* Monthly Breakdown Chart */}
          <div className="bg-slate-700/20 rounded-lg p-4">
            <h3 className="oryx-heading text-lg mb-4">Monthly Hours Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectData.monthlyBreakdown} margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <ReTooltip content={<CustomTooltip />} />
                  <Bar dataKey="billable" stackId="hours" name="Billable" fill="#84cc16" />
                  <Bar dataKey="nonBillable" stackId="hours" name="Non-billable" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Contributing Members */}
          <div className="bg-slate-700/20 rounded-lg p-4">
            <h3 className="oryx-heading text-lg mb-4">Contributing Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectData.members.map((member, index) => (
                <div key={index} className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{member.member}</p>
                    <p className="text-xs text-slate-400">{member.percentage}% of project</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-lime-400">{member.hours}h</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-slate-700 p-4 text-center">
          <button
            onClick={onClose}
            className="oryx-primary px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}
