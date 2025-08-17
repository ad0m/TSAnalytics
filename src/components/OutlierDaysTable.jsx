import { useMemo, useRef } from 'react'
import { toBlob } from 'html-to-image'
import { Download } from 'lucide-react'
import dayjs from 'dayjs'

// Outlier threshold
const OUTLIER_DAILY_THRESHOLD = 12

export default function OutlierDaysTable({ filteredRows }) {
  const ref = useRef(null)
  
  const outlierDays = useMemo(() => {
    try {
      console.log('OutlierDaysTable - Processing', filteredRows?.length, 'rows')
      
      if (!filteredRows || filteredRows.length === 0) return []
      
      // Group by member and date to get daily totals
      const memberDailyHours = {}
      
      for (const row of filteredRows) {
        const member = row.Member || 'Unknown'
        
        // Skip rows without valid dateObj
        if (!row.dateObj) {
          console.log('OutlierDaysTable - Skipping row without dateObj:', row)
          continue
        }
        
        const dateFormatted = dayjs(row.dateObj)
        if (!dateFormatted.isValid()) {
          console.log('OutlierDaysTable - Skipping row with invalid date:', row)
          continue
        }
        
        const date = dateFormatted.format('YYYY-MM-DD')
        const key = `${member}-${date}`
      
      if (!memberDailyHours[key]) {
        memberDailyHours[key] = {
          member,
          date,
          dateObj: row.dateObj,
          hours: 0,
          entries: []
        }
      }
      
      memberDailyHours[key].hours += row.Hours
      memberDailyHours[key].entries.push({
        project: row['Project/Ticket'] || 'Unknown',
        company: row.Company || 'Unknown',
        hours: row.Hours
      })
    }
    
    // Filter for outlier days (>12h) and get dominant project/company
    const outliers = Object.values(memberDailyHours)
      .filter(day => day.hours > OUTLIER_DAILY_THRESHOLD)
      .map(day => {
        // Find the entry with the most hours for this day
        const dominantEntry = day.entries.reduce((max, entry) => 
          entry.hours > max.hours ? entry : max
        )
        
        return {
          member: day.member,
          date: dayjs(day.dateObj).format('DD/MM/YYYY'),
          dateForSort: day.date,
          hours: Math.round(day.hours * 4) / 4,
          project: dominantEntry.project,
          company: dominantEntry.company,
          entryCount: day.entries.length
        }
      })
      .sort((a, b) => b.dateForSort.localeCompare(a.dateForSort)) // Most recent first
    
    return outliers
    
    } catch (error) {
      console.error('OutlierDaysTable - Error:', error)
      return []
    }
  }, [filteredRows])
  
  const exportPng = () => {
    const node = ref.current
    if (!node) return
    toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' })
      .then((blob) => {
        if (!blob) throw new Error('No blob')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'outlier-days-table.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
      .catch(console.error)
  }
  
  if (!outlierDays || outlierDays.length === 0) {
    return (
      <div ref={ref} className="oryx-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="oryx-heading text-lg flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
              <span className="text-lime-400">🚨</span>
            </span>
            Outlier Days (&gt;12h)
          </h3>
          <button 
            onClick={exportPng}
            className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            <Download size={16} /> Export PNG
          </button>
        </div>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No outlier days found (&gt;12h)
        </div>
      </div>
    )
  }
  
  return (
    <div ref={ref} className="oryx-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="oryx-heading text-lg flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">🚨</span>
          </span>
          Outlier Days (&gt;12h)
        </h3>
        <button 
          onClick={exportPng}
          className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
        >
          <Download size={16} /> Export PNG
        </button>
      </div>
      
      <div className="rounded-lg bg-slate-900/30 p-4">
        {/* Summary stats */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{outlierDays.length}</p>
            <p className="text-xs text-slate-300">Total Outlier Days</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">{new Set(outlierDays.map(d => d.member)).size}</p>
            <p className="text-xs text-slate-300">People Affected</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {outlierDays.length > 0 ? Math.round((outlierDays.reduce((sum, d) => sum + d.hours, 0) / outlierDays.length) * 4) / 4 : 0}h
            </p>
            <p className="text-xs text-slate-300">Avg Hours/Day</p>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left p-3 text-slate-300 font-medium">Member</th>
                <th className="text-left p-3 text-slate-300 font-medium">Date</th>
                <th className="text-right p-3 text-slate-300 font-medium">Hours</th>
                <th className="text-left p-3 text-slate-300 font-medium">Primary Project</th>
                <th className="text-left p-3 text-slate-300 font-medium">Company</th>
                <th className="text-center p-3 text-slate-300 font-medium">Entries</th>
              </tr>
            </thead>
            <tbody>
              {outlierDays.map((day, index) => (
                <tr 
                  key={`${day.member}-${day.dateForSort}`}
                  className={`border-b border-slate-700 hover:bg-slate-700/30 ${
                    day.hours > 15 ? 'bg-red-500/10' : day.hours > 14 ? 'bg-orange-500/10' : 'bg-yellow-500/10'
                  }`}
                >
                  <td className="p-3 text-white font-medium">{day.member}</td>
                  <td className="p-3 text-slate-300">{day.date}</td>
                  <td className="p-3 text-right">
                    <span className={`font-bold ${
                      day.hours > 15 ? 'text-red-400' : day.hours > 14 ? 'text-orange-400' : 'text-yellow-400'
                    }`}>
                      {day.hours}h
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 max-w-48">
                    <div className="truncate" title={day.project}>
                      {day.project}
                    </div>
                  </td>
                  <td className="p-3 text-slate-300 max-w-32">
                    <div className="truncate" title={day.company}>
                      {day.company}
                    </div>
                  </td>
                  <td className="p-3 text-center text-slate-400">
                    {day.entryCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {outlierDays.length > 50 && (
          <div className="mt-4 text-center text-xs text-slate-400">
            Showing first 50 outlier days. Total: {outlierDays.length}
          </div>
        )}
      </div>
      
      <div className="mt-4 space-y-1 text-center text-xs text-slate-400">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span>12-14h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span>14-15h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>&gt;15h</span>
          </div>
        </div>
        <p>Shows days with &gt;12 hours logged. Primary project = highest hours for that day.</p>
      </div>
    </div>
  )
}
