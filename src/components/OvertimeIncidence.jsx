import React, { useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'
import { toBlob } from 'html-to-image'
import { Download } from 'lucide-react'
import { uiTheme } from '../theme'
import { computeWeeklyOvertime } from '../lib/computeOvertime.js'

export default function OvertimeIncidence({ filteredRows }) {
  const ref = useRef(null)
  
  const data = useMemo(() => {
    try {
      console.log('OvertimeIncidence - Processing', filteredRows?.length, 'rows')
      
      if (!filteredRows || filteredRows.length === 0) return []
      
      // Use the new overtime computation logic
      const weeklyOvertimeData = computeWeeklyOvertime(filteredRows)
      
      // Group by week for chart data
      const weekGroups = {}
      const allMembers = new Set()
      
      for (const weekData of weeklyOvertimeData) {
        const { member, isoWeek, overtime } = weekData
        
        allMembers.add(member)
        
        if (!weekGroups[isoWeek]) {
          weekGroups[isoWeek] = {}
        }
        
        weekGroups[isoWeek][member] = {
          dailyWeekday: overtime.dailyWeekday,
          weeklyOverflow: overtime.weeklyOverflow,
          weekendHoliday: overtime.weekendHoliday,
          total: overtime.total
        }
      }
      
      // Calculate total overtime hours per member to find top contributors
      const memberTotals = {}
      for (const member of allMembers) {
        memberTotals[member] = 0
        Object.values(weekGroups).forEach(weekData => {
          const memberData = weekData[member]
          if (memberData) {
            memberTotals[member] += memberData.total
          }
        })
      }
      
      // Get top 10 members by overtime hours
      const topMembers = Object.entries(memberTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([member]) => member)
      
      // Build chart data - limit to 9 weeks for better readability
      const chartData = Object.entries(weekGroups)
        .map(([isoWeek, memberData]) => {
          const weekEntry = { week: isoWeek }
          
          // Add total overtime for the week
          let weekTotal = 0
          topMembers.forEach(member => {
            const data = memberData[member] || { 
              dailyWeekday: 0, 
              weeklyOverflow: 0, 
              weekendHoliday: 0, 
              total: 0 
            }
            weekEntry[`${member}_total`] = data.total
            weekTotal += data.total
          })
          
          weekEntry.total = weekTotal
          return weekEntry
        })
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-9) // Show last 9 weeks for better readability
      
      return { chartData, topMembers }
      
    } catch (error) {
      console.error('OvertimeIncidence - Error:', error)
      return { chartData: [], topMembers: [] }
    }
  }, [filteredRows])
  
  // Custom color palette for tooltip values - matching Project Type Trends
  const tooltipColors = [
    '#B5C933', // Lime Zest (brand secondary, high contrast yellow-green)
    '#FF4F00', // Vibrant Orange (brand accent, very strong)
    '#3CC9E3', // Bright Aqua (crisp cyan, pops well)
    '#FFD166', // Soft Yellow (warm yellow, readable, friendly)
    '#FF6F61', // Coral (bright red-pink, strong)
    '#C62828', // Deep Red (serious warning red, high contrast)
    '#8E44AD', // Plum (rich purple, readable on sage)
    '#FF3462', // Vivid Pink (neon raspberry pink, vibrant substitute for orange)
    '#4A3F94', // Indigo (deep, saturated indigo blue)
    '#4DD0E1', // Sky Blue (lighter teal-cyan, softer contrast)
    '#1E8FA6', // Turquoise (medium cyan-teal, still visible on sage)
    '#FF9E2C', // Warm Amber (between orange and yellow, vibrant)
    '#7FE7A1', // Mint Green (fresh mint tone, light and legible)
    '#3C4CFF', // Electric Blue (saturated bright blue)
    '#A58BFF'  // Light Lavender (gentle purple highlight)
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const textShadow = '0 1px 1px rgba(0,0,0,0.5)'
      
      return (
        <div 
          className="rounded-lg border p-3 shadow-2xl"
          style={{ 
            backgroundColor: '#586961', 
            borderColor: uiTheme.muted,
            color: uiTheme.chart.tooltipText
          }}
        >
          <p className="text-sm font-semibold mb-2" style={{ textShadow, color: '#B5C933' }}>
            Week {label}
          </p>
                     <div className="space-y-1">
             {payload
               .filter(item => item.value > 0)
               .map((item, index) => {
                 const member = item.dataKey.replace('_total', '')
                 
                 return (
                   <div key={index} className="flex justify-between items-center text-xs" style={{ textShadow }}>
                     <span style={{ color: '#EFECD2' }}>
                       {member}:
                     </span>
                     <span className="font-bold" style={{ color: item.color }}>
                       {item.value} hours
                     </span>
                   </div>
                 )
               })}
           </div>
        </div>
      )
    }
    return null
  }
  
  const exportPng = () => {
    const node = ref.current
    if (!node) return
    toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' })
      .then((blob) => {
        if (!blob) throw new Error('No blob')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'overtime-incidence.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
      .catch(console.error)
  }
  
  if (!data.chartData || data.chartData.length === 0) {
    return (
      <div ref={ref} className="oryx-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="oryx-heading text-lg flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
              <span className="text-lime-400">⚡</span>
            </span>
            Overtime Incidence
          </h3>
          <button 
            onClick={exportPng}
            className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            <Download size={16} /> Export PNG
          </button>
        </div>
        <div className="flex h-96 items-center justify-center text-sm text-slate-400">
          No overtime hours found
        </div>
      </div>
    )
  }
  
  // Generate colors for members using the tooltip palette
  const memberColors = tooltipColors.slice(0, 10)
  
  return (
    <div ref={ref} className="oryx-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="oryx-heading text-lg flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">⚡</span>
          </span>
          Overtime Incidence
        </h3>
        <button 
          onClick={exportPng}
          className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
        >
          <Download size={16} /> Export PNG
        </button>
               </div>
         
         {/* Summary breakdown section */}
         <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
             <div className="text-center">
               <div className="text-2xl font-bold text-lime-400">
                 {data.topMembers.length > 0 ? 
                   Math.round(data.chartData.reduce((sum, week) => sum + week.total, 0) / data.chartData.length) : 0
                 }
               </div>
               <div className="text-xs text-slate-400">Avg Weekly OT Hours</div>
             </div>
           </div>
           <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
             <div className="text-center">
               <div className="text-2xl font-bold text-orange-400">
                 {data.topMembers.length > 0 ? 
                   data.topMembers[0] : 'N/A'
                 }
               </div>
               <div className="text-xs text-slate-400">Top Contributor</div>
             </div>
           </div>
           <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
             <div className="text-center">
               <div className="text-2xl font-bold text-cyan-400">
                 {data.chartData.length}
               </div>
               <div className="text-xs text-slate-400">Weeks Shown</div>
             </div>
           </div>
         </div>
         
         <div className="h-96 rounded-lg p-3">
         <ResponsiveContainer width="100%" height="100%">
           <BarChart 
             data={data.chartData} 
             margin={{ left: 8, right: 16, top: 16, bottom: 40 }}
             barSize={35}
           >
             <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
             <XAxis 
               dataKey="week" 
               tick={{ fill: '#cbd5e1', fontSize: 11 }}
               tickLine={{ stroke: '#475569' }}
               axisLine={{ stroke: '#475569' }}
               angle={-45}
               textAnchor="end"
               height={60}
             />
             <YAxis 
               tick={{ fill: '#cbd5e1', fontSize: 12 }}
               tickLine={{ stroke: '#475569' }}
               axisLine={{ stroke: '#475569' }}
               label={{ 
                 value: 'Overtime Hours', 
                 angle: -90, 
                 position: 'insideLeft', 
                 style: { fill: '#cbd5e1' } 
               }}
             />
             <ReTooltip content={<CustomTooltip />} />
             <Legend />
             
             {/* Main overtime bars - one per member */}
             {data.topMembers.map((member, index) => (
               <Bar 
                 key={member}
                 dataKey={`${member}_total`}
                 name={member}
                 fill={memberColors[index % memberColors.length]}
                 fillOpacity={0.9}
                 radius={[4, 4, 0, 0]}
                 stroke={memberColors[index % memberColors.length]}
                 strokeWidth={1}
               />
             ))}
           </BarChart>
         </ResponsiveContainer>
       </div>
             <div className="mt-4 space-y-1 text-center text-xs text-slate-400">
         <p>Shows weekly total overtime hours per person. Each bar represents one person's total overtime for that week.</p>
         <p>Top 10 overtime contributors shown. Limited to last 9 weeks for better readability.</p>
       </div>
    </div>
  )
}
