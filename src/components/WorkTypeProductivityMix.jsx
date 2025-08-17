import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts'
import { ACCESSIBLE_COLORS } from '../lib/utils.jsx'

export default function ProjectEfficiencyMatrix({ filteredRows }) {
  const data = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return []
    
    // Group by Project Type and analyze efficiency metrics
    const projectTypeAnalysis = {}
    
    for (const row of filteredRows) {
      const projectType = row['Project Type'] || 'Unknown'
      const hours = row.Hours
      const project = row['Project/Ticket'] || 'Unknown'
      
      if (!projectTypeAnalysis[projectType]) {
        projectTypeAnalysis[projectType] = {
          totalHours: 0,
          projectCount: new Set(),
          avgHoursPerProject: 0,
          billableHours: 0,
          totalProjects: 0
        }
      }
      
      projectTypeAnalysis[projectType].totalHours += hours
      projectTypeAnalysis[projectType].projectCount.add(project)
      
      // Count billable hours (productive time)
      if (row.Productivity === 'Productive') {
        projectTypeAnalysis[projectType].billableHours += hours
      }
    }
    
    // Calculate metrics and convert to array
    const result = Object.entries(projectTypeAnalysis).map(([projectType, data]) => {
      const totalProjects = data.projectCount.size
      const avgHoursPerProject = totalProjects > 0 ? data.totalHours / totalProjects : 0
      const billablePercentage = data.totalHours > 0 ? (data.billableHours / data.totalHours) * 100 : 0
      
      return {
        projectType,
        totalHours: Math.round(data.totalHours * 4) / 4,
        totalProjects,
        avgHoursPerProject: Math.round(avgHoursPerProject * 4) / 4,
        billablePercentage: Math.round(billablePercentage * 10) / 10,
        efficiency: totalProjects > 0 ? (data.billableHours / data.totalHours) * (1000 / avgHoursPerProject) : 0 // Efficiency score
      }
    }).filter(item => item.totalHours > 0)
    
    // Sort by efficiency score (higher = better)
    result.sort((a, b) => b.efficiency - a.efficiency)
    
    return result
  }, [filteredRows])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 shadow-2xl">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-300 mb-2">Total: {data.totalHours}h</p>
          <p className="text-xs text-cyan-400">Projects: {data.totalProjects}</p>
          <p className="text-xs text-lime-400">Avg per Project: {data.avgHoursPerProject}h</p>
          <p className="text-xs text-blue-400">Billable: {data.billablePercentage}%</p>
          <p className="text-xs text-purple-400">Efficiency Score: {data.efficiency.toFixed(1)}</p>
        </div>
      )
    }
    return null
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="oryx-card p-8">
        <h3 className="oryx-heading text-lg mb-4">Project Efficiency Matrix</h3>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No project efficiency data available
        </div>
      </div>
    )
  }
  
  return (
    <div className="oryx-card p-6">
      <h3 className="oryx-heading text-lg mb-4">Project Efficiency Matrix</h3>
      <p className="text-sm text-slate-400 mb-4">
        Shows project types ranked by efficiency (billable % × project count ÷ avg hours). Higher scores = better value.
      </p>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="horizontal"
            margin={{ left: 120, right: 80, top: 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              type="number"
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              label={{ value: 'Efficiency Score', position: 'insideBottom', offset: 0, style: { fill: '#cbd5e1' } }}
            />
            <YAxis 
              dataKey="projectType" 
              type="category" 
              width={120}
              interval={0} 
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
            />
            <ReTooltip content={<CustomTooltip />} />
            
            <Bar 
              dataKey="efficiency" 
              fill="#84cc16"
              radius={[0, 4, 4, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={ACCESSIBLE_COLORS[index % ACCESSIBLE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Efficiency Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-lime-400 font-medium mb-1">🏆 Most Efficient</div>
          <div className="text-slate-300">{data[0]?.projectType || 'N/A'}</div>
          <div className="text-slate-400">Score: {data[0]?.efficiency.toFixed(1) || '0'}</div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-blue-400 font-medium mb-1">⚡ Quick Wins</div>
          <div className="text-slate-300">
            {data.filter(d => d.avgHoursPerProject < 10).length} project types
          </div>
          <div className="text-slate-400">&lt; 10h avg per project</div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="text-purple-400 font-medium mb-1">💰 High Value</div>
          <div className="text-slate-300">
            {data.filter(d => d.billablePercentage > 80).length} project types
          </div>
          <div className="text-slate-400">&gt; 80% billable</div>
        </div>
      </div>
      
      <div className="mt-4 text-center text-xs text-slate-400">
        Efficiency = (Billable % × 1000) ÷ Average Hours per Project
      </div>
    </div>
  )
}
