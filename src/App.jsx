import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isoWeek from 'dayjs/plugin/isoWeek'
import oaneonLogo from './assets/oaneon.png'
import { parseCsvToRows } from './lib/parseTimesheets.js'
import { FILTER_DEFAULTS, PERIOD_OPTIONS, PRODUCTIVITY_OPTIONS } from './lib/filterDefaults.js'
import { applyFilters, getDistinctValues, getLatestCompleteMonth, derivePeriodDefaults } from './lib/applyFilters.js'
import { saveFilters, loadFilters, resetFilters } from './lib/filterPersistence.js'
import { roundToQuarter, formatHours, formatTooltipHours, EmptyState, ACCESSIBLE_COLORS } from './lib/utils.jsx'
import Overview from './sections/Overview.jsx'
import Clients from './sections/Clients.jsx'
import Projects from './sections/Projects.jsx'
import People from './sections/People.jsx'
import Governance from './sections/Governance.jsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  LabelList,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts'
import { toBlob } from 'html-to-image'
import { Upload, Trash2, Download, ChevronDown } from 'lucide-react'

dayjs.extend(customParseFormat)
dayjs.extend(isoWeek)

function Header({ onUpload, onClear, hasData }) {
  const inputRef = useRef(null)
  return (
    <header className="sticky top-0 z-40 oryx-nav border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center">
            <img 
              src={oaneonLogo} 
              alt="Oaneon Logo" 
              className="h-8 w-8"
            />
          </div>
          <h1 className="oryx-heading text-lg sm:text-xl">
            <span style={{ color: '#B5C933' }}>Professional Services</span> <span style={{ color: '#EFECD2' }}>| Time Analytics</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div 
            className="hidden sm:flex items-center gap-2 text-xs bg-brand-surface/50 px-3 py-1.5 rounded-full cursor-help relative group"
            title=""
            style={{ color: '#111C3A' }}
          >
            <span className="text-brand-secondary">🔒</span>
            <span>Local processing only</span>
            
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-brand-surface text-brand-text text-xs rounded-lg shadow-xl border border-brand-border opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-64">
              <div className="text-center">
                <p className="font-medium mb-1">Your data stays on your device</p>
                <p className="text-brand-muted leading-relaxed">
                  CSV files are processed entirely in your web browser using JavaScript. 
                  No data is uploaded to servers or stored externally. 
                  Your timesheet information remains completely private and secure.
                </p>
              </div>
              {/* Tooltip arrow */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-brand-surface"></div>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file)
              e.currentTarget.value = ''
            }}
          />
          <button
            className="oryx-primary inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={16} /> Upload CSV
          </button>
          <button
            className="oryx-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-slate-600 disabled:opacity-50 transition-colors"
            onClick={onClear}
            disabled={!hasData}
          >
            <Trash2 size={16} /> Clear
          </button>
        </div>
      </div>
    </header>
  )
}

// CreatePortal-based multi-select with fixed positioning to avoid layout shifts
function MultiSelect({ label, options, selected, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 240 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return
      if (menuRef.current && menuRef.current.contains(e.target)) return
      if (btnRef.current && btnRef.current.contains(e.target)) return
      setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('resize', () => setOpen(false))
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPosition({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
  }, [open])

  const allSelected = selected.length > 0 && selected.length === options.length

  function toggle(v) {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v))
    } else {
      onChange([...selected, v])
    }
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="oryx-input flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm hover:bg-slate-700 disabled:opacity-50 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{label}{selected.length ? ` (${selected.length})` : ''}</span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="z-[1000] rounded-xl border border-slate-600 bg-slate-800 shadow-2xl"
          style={{ position: 'fixed', top: position.top, left: position.left, minWidth: position.width, maxWidth: 360 }}
          role="listbox"
        >
          <div className="max-h-[300px] overflow-auto p-3">
            {options.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-slate-400">No values</div>
            ) : (
              <>
                <button
                  className="mb-2 w-full rounded-md border border-slate-600 bg-slate-700 px-2 py-1 text-left text-xs text-white hover:bg-slate-600 transition-colors"
                  onClick={() => onChange([])}
                >Clear selection</button>
                <label className="mb-2 flex items-center gap-2 rounded-md px-2 py-1 text-sm text-white hover:bg-slate-700 transition-colors">
                  <input type="checkbox" checked={allSelected} onChange={(e) => onChange(e.target.checked ? [...options] : [])} className="accent-lime-400" />
                  <span>Select all</span>
                </label>
                <div className="h-px bg-slate-600 mb-2" />
                {options.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-white hover:bg-slate-700 transition-colors">
                    <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="accent-lime-400" />
                    <span className="truncate" title={opt}>{opt}</span>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default function App() {
  const [rows, setRows] = useState([])
  const [distinctValues, setDistinctValues] = useState({
    roles: [],
    members: [],
    companies: [],
    projectTypes: [],
    workTypesBoard: [],
    calendarMonths: [],
    quarters: [],
    fiscalYears: []
  })
  const [filters, setFilters] = useState(() => loadFilters(FILTER_DEFAULTS))
  const [missingHeaders, setMissingHeaders] = useState([])
  const [dateRange, setDateRange] = useState({ min: null, max: null })

  // Save filters to localStorage when they change
  useEffect(() => {
    saveFilters(filters)
  }, [filters])

  // Upload & parse CSV
  async function handleUpload(file) {
    try {
      const cleanRows = await parseCsvToRows(file)
      
      if (cleanRows.length === 0) {
        alert('No valid data found in CSV. Please check the file format and headers.')
        return
      }
      
      console.log(`Loaded ${cleanRows.length} clean rows`)
      console.log('Sample row keys:', Object.keys(cleanRows[0]))
      
      // DEBUG: Check productivity breakdown immediately after parsing
      const productivityBreakdown = {
        Productive: cleanRows.filter(r => r.Productivity === "Productive").length,
        Unproductive: cleanRows.filter(r => r.Productivity === "Unproductive").length,
        Other: cleanRows.filter(r => r.Productivity !== "Productive" && r.Productivity !== "Unproductive").length,
        Total: cleanRows.length
      }
      console.log('App.jsx - Productivity breakdown after parsing:', productivityBreakdown)
      
      // DEBUG: Show sample unproductive rows if they exist
      const unproductiveRows = cleanRows.filter(r => r.Productivity === "Unproductive")
      if (unproductiveRows.length > 0) {
        console.log('App.jsx - Sample unproductive rows:', unproductiveRows.slice(0, 5))
      } else {
        console.log('App.jsx - NO UNPRODUCTIVE ROWS FOUND!')
        console.log('App.jsx - First 5 rows:', cleanRows.slice(0, 5).map(r => ({
          Member: r.Member,
          Productivity: r.Productivity,
          Hours: r.Hours,
          Role: r.Role
        })))
      }
      
      // Compute distinct values for filters
      const distinct = getDistinctValues(cleanRows)
      setDistinctValues(distinct)
      
      // Set default period to latest complete month
      const latestMonth = getLatestCompleteMonth(cleanRows)
      
      // Calculate date range from CSV for Custom period constraints
      const DATE_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM/YY']
      const validDates = cleanRows
        .map(row => row.Date)
        .filter(date => date && date.trim())
        .map(dateStr => {
          const parsed = dayjs(dateStr, DATE_FORMATS, true)
          return parsed.isValid() ? parsed.toDate() : null
        })
        .filter(date => date !== null)
      
      const minDate = validDates.length > 0 ? new Date(Math.min(...validDates)) : null
      const maxDate = validDates.length > 0 ? new Date(Math.max(...validDates)) : null
      
      // Debug logging for date range
      console.log(`Found ${validDates.length} valid dates in CSV`)
      if (validDates.length > 0) {
        console.log(`Sample dates:`, validDates.slice(0, 5).map(d => d.toLocaleDateString()))
        console.log(`Last few dates:`, validDates.slice(-5).map(d => d.toLocaleDateString()))
      }
      
      // Store date range for constraints
      setDateRange({ min: minDate, max: maxDate })
      
      if (latestMonth) {
        const { quarter, fy } = derivePeriodDefaults(latestMonth)
        setFilters(prev => ({
          ...prev,
          month: latestMonth,
          quarter,
          fy,
          fromDate: minDate,
          toDate: maxDate
        }))
        console.log(`Set default period: Month=${latestMonth}, Quarter=${quarter}, FY=${fy}`)
        console.log(`Date range: ${minDate?.toLocaleDateString()} to ${maxDate?.toLocaleDateString()}`)
        console.log(`Date range for pickers: ${minDate?.toISOString().split('T')[0]} to ${maxDate?.toISOString().split('T')[0]}`)
      }
      
      setRows(cleanRows)
      setMissingHeaders([]) // Clear any previous errors
    } catch (error) {
      console.error('CSV parse error:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      if (error.missingHeaders) {
        setMissingHeaders(error.missingHeaders)
      } else {
        alert('Failed to parse CSV. Please ensure it has the correct headers and uses dd/MM/yyyy dates.')
      }
    }
  }

  function clearAll() {
    setRows([])
    setMissingHeaders([])
    setDistinctValues({
      roles: [],
      members: [],
      companies: [],
      projectTypes: [],
      workTypesBoard: [],
      calendarMonths: [],
      quarters: [],
      fiscalYears: []
    })
    setFilters({ ...FILTER_DEFAULTS })
  }

  // Apply filters to clean rows
  const filteredRows = useMemo(() => {
    return applyFilters(rows, filters)
  }, [rows, filters])





  // Tabs
  const [tab, setTab] = useState('overview')

  function exportPng(ref, filename) {
    const node = ref.current
    if (!node) return
    toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' })
      .then((blob) => {
        if (!blob) throw new Error('No blob')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
      .catch(() => alert('Export failed. Try Chrome/Edge latest.'))
  }

  // Company filter function for cross-filtering
  function handleCompanyFilter(companyName) {
    setFilters(prev => ({
      ...prev,
      companies: [companyName]
    }))
  }

  // Reset filters to defaults
  function handleResetFilters() {
    resetFilters(FILTER_DEFAULTS, setFilters)
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header onUpload={handleUpload} onClear={clearAll} hasData={rows.length > 0} />

      {/* Missing Headers Banner */}
      {missingHeaders.length > 0 && (
        <div className="bg-red-500 border-l-4 border-red-700 text-white p-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-red-200">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  Missing required CSV headers: <span className="font-bold">{missingHeaders.join(', ')}</span>
                </p>
                <p className="text-xs text-red-200 mt-1">
                  Please ensure your CSV contains all required columns or their legacy equivalents.
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setMissingHeaders([])}
                  className="inline-flex text-red-200 hover:text-white transition-colors"
                >
                  <span className="sr-only">Dismiss</span>
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Filters */}
          <section className="oryx-card p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="oryx-heading text-lg flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
                  <span className="text-lime-400">⚙</span>
                </span>
                Filters
              </h2>
              <div className="text-xs text-slate-400 bg-slate-700/50 px-3 py-1 rounded-full">
                {rows.length ? `${rows.length} rows loaded, ${filteredRows.length} after filters` : 'Upload a CSV to get started'}
              </div>
            </div>
            
            {/* Period Controls */}
            <div className="mb-6 p-4 bg-slate-700/20 rounded-lg">
              <h3 className="text-sm text-slate-300 font-medium mb-3">Time Period</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {/* Period Type */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-slate-300 font-medium">Period</span>
                  <select
                    value={filters.period}
                    onChange={(e) => setFilters(f => ({ ...f, period: e.target.value }))}
                    className="oryx-input h-10 rounded-md border px-3 text-sm"
                  >
                    {PERIOD_OPTIONS.map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                </div>
                
                {/* Conditional Period Picker */}
                {filters.period === "Month" && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-slate-300 font-medium">Month</span>
                    <select
                      value={filters.month || ''}
                      onChange={(e) => setFilters(f => ({ ...f, month: e.target.value }))}
                      className="oryx-input h-10 rounded-md border px-3 text-sm"
                    >
                      <option value="">Select Month</option>
                      {distinctValues.calendarMonths.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {filters.period === "Quarter" && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-slate-300 font-medium">Quarter</span>
                    <select
                      value={filters.quarter || ''}
                      onChange={(e) => setFilters(f => ({ ...f, quarter: e.target.value }))}
                      className="oryx-input h-10 rounded-md border px-3 text-sm"
                    >
                      <option value="">Select Quarter</option>
                      {distinctValues.quarters.map(quarter => (
                        <option key={quarter} value={quarter}>{quarter}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {filters.period === "FY" && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-slate-300 font-medium">Fiscal Year</span>
                    <select
                      value={filters.fy || ''}
                      onChange={(e) => setFilters(f => ({ ...f, fy: e.target.value }))}
                      className="oryx-input h-10 rounded-md border px-3 text-sm"
                    >
                      <option value="">Select FY</option>
                      {distinctValues.fiscalYears.map(fy => (
                        <option key={fy} value={fy}>{fy}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {filters.period === "Custom" && (
                  <>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-slate-300 font-medium">From Date</span>
                      <input
                        type="date"
                        value={filters.fromDate && filters.fromDate instanceof Date ? filters.fromDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => setFilters(f => ({ 
                          ...f, 
                          fromDate: e.target.value ? new Date(e.target.value) : null 
                        }))}
                        className="oryx-input h-10 rounded-md border px-3 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-slate-300 font-medium">To Date</span>
                      <input
                        type="date"
                        value={filters.toDate && filters.toDate instanceof Date ? filters.toDate.toISOString().split('T')[0] : ''}
                        min={filters.fromDate && filters.fromDate instanceof Date ? filters.fromDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => setFilters(f => ({ 
                          ...f, 
                          toDate: e.target.value ? new Date(e.target.value) : null 
                        }))}
                        className="oryx-input h-10 rounded-md border px-3 text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Role Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-sm text-slate-300 font-medium">Role</span>
                <MultiSelect
                  label="Role"
                  options={distinctValues.roles}
                  selected={filters.roles}
                  onChange={(vals) => setFilters(f => ({ ...f, roles: vals }))}
                  disabled={distinctValues.roles.length === 0}
                />
              </div>
              
              {/* Member Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-sm text-slate-300 font-medium">Member</span>
                {filters.members === "ALL" ? (
                  <button
                    onClick={() => setFilters(f => ({ ...f, members: [] }))}
                    className="oryx-input flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm hover:bg-slate-700"
                  >
                    <span>All Members</span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </button>
                ) : (
                  <MultiSelect
                    label="Member"
                    options={distinctValues.members}
                    selected={Array.isArray(filters.members) ? filters.members : []}
                    onChange={(vals) => setFilters(f => ({ ...f, members: vals.length === 0 ? "ALL" : vals }))}
                    disabled={distinctValues.members.length === 0}
                  />
                )}
              </div>
              
              {/* Company Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-sm text-slate-300 font-medium">Company</span>
                {filters.companies === "ALL" ? (
                  <button
                    onClick={() => setFilters(f => ({ ...f, companies: [] }))}
                    className="oryx-input flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm hover:bg-slate-700"
                  >
                    <span>All Companies</span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </button>
                ) : (
                  <MultiSelect
                    label="Company"
                    options={distinctValues.companies}
                    selected={Array.isArray(filters.companies) ? filters.companies : []}
                    onChange={(vals) => setFilters(f => ({ ...f, companies: vals.length === 0 ? "ALL" : vals }))}
                    disabled={distinctValues.companies.length === 0}
                  />
                )}
              </div>
              
              {/* Project Type Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-sm text-slate-300 font-medium">Project Type</span>
                {filters.projectTypes === "ALL" ? (
                  <button
                    onClick={() => setFilters(f => ({ ...f, projectTypes: [] }))}
                    className="oryx-input flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm hover:bg-slate-700"
                  >
                    <span>All Project Types</span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </button>
                ) : (
                  <MultiSelect
                    label="Project Type"
                    options={distinctValues.projectTypes}
                    selected={Array.isArray(filters.projectTypes) ? filters.projectTypes : []}
                    onChange={(vals) => setFilters(f => ({ ...f, projectTypes: vals.length === 0 ? "ALL" : vals }))}
                    disabled={distinctValues.projectTypes.length === 0}
                  />
                )}
              </div>
              
              {/* Work Type (Board) Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-sm text-slate-300 font-medium">Work Type (Board)</span>
                <MultiSelect
                  label="Work Type"
                  options={distinctValues.workTypesBoard}
                  selected={filters.workTypesBoard}
                  onChange={(vals) => setFilters(f => ({ ...f, workTypesBoard: vals }))}
                  disabled={distinctValues.workTypesBoard.length === 0}
                />
              </div>
              
              {/* Productivity Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-sm text-slate-300 font-medium">Productivity</span>
                <select
                  value={filters.productivity}
                  onChange={(e) => setFilters(f => ({ ...f, productivity: e.target.value }))}
                  className="oryx-input h-10 rounded-md border px-3 text-sm"
                >
                  {PRODUCTIVITY_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="mt-8 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <button
              className={`h-16 px-3 text-sm font-medium transition-all ${
                tab === 'overview' 
                  ? 'oryx-primary shadow-lg' 
                  : 'oryx-secondary hover:bg-slate-600'
              }`}
              onClick={() => setTab('overview')}
            >🏠 Overview</button>
            <button
              className={`h-16 px-3 text-sm font-medium transition-all ${
                tab === 'people' 
                  ? 'oryx-primary shadow-lg' 
                  : 'oryx-secondary hover:bg-slate-600'
              }`}
              onClick={() => setTab('people')}
            >📊 People-Focused</button>
            <button
              className={`h-16 px-3 text-sm font-medium transition-all ${
                tab === 'clients' 
                  ? 'oryx-primary shadow-lg' 
                  : 'oryx-secondary hover:bg-slate-600'
              }`}
              onClick={() => setTab('clients')}
            >🏢 Client-Focused</button>
            <button
              className={`h-16 px-3 text-sm font-medium transition-all ${
                tab === 'projects' 
                  ? 'oryx-primary shadow-lg' 
                  : 'oryx-secondary hover:bg-slate-600'
              }`}
              onClick={() => setTab('projects')}
            >🎯 Projects</button>
            <button
              className={`h-16 px-3 text-sm font-medium transition-all ${
                tab === 'usage' 
                  ? 'oryx-primary shadow-lg' 
                  : 'oryx-secondary hover:bg-slate-600'
              }`}
              onClick={() => setTab('usage')}
            >⏱️ Time Usage</button>
            <button
              className={`h-16 px-3 text-sm font-medium transition-all ${
                tab === 'trends' 
                  ? 'oryx-primary shadow-lg' 
                  : 'oryx-secondary hover:bg-slate-600'
              }`}
              onClick={() => setTab('trends')}
            >📈 Trends & Insights</button>
            <button
              className={`h-16 px-3 text-sm font-medium transition-all ${
                tab === 'governance' 
                  ? 'oryx-primary shadow-lg' 
                  : 'oryx-secondary hover:bg-slate-600'
              }`}
              onClick={() => setTab('governance')}
            >📋 Governance</button>
          </div>

          {/* Charts area */}
          <section className="mt-6 space-y-6">
            {rows.length === 0 ? (
              <div className="oryx-card p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-400/20 mb-4">
                  <Upload size={32} className="text-lime-400" />
                </div>
                <h3 className="oryx-heading text-xl mb-2">Get Started</h3>
                <p className="text-slate-400 mb-4">Upload a CSV to see insights. Expected UK date format dd/MM/yyyy.</p>
                <div className="bg-slate-700/50 rounded-lg p-4 max-w-2xl mx-auto">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="text-blue-400">🔒</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-slate-300 font-medium mb-1">Your Data Stays Private</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        All CSV processing happens locally in your browser. Your data never leaves your device or gets sent to any server. 
                        This ensures complete privacy and security of your timesheet information.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {tab === 'overview' && <Overview filteredRows={filteredRows} onCompanyFilter={handleCompanyFilter} onReset={handleResetFilters} />}
                {tab === 'people' && <People filteredRows={filteredRows} onCompanyFilter={handleCompanyFilter} onReset={handleResetFilters} />}
                {tab === 'clients' && <Clients filteredRows={filteredRows} onCompanyFilter={handleCompanyFilter} onReset={handleResetFilters} />}
                {tab === 'projects' && <Projects filteredRows={filteredRows} onCompanyFilter={handleCompanyFilter} onReset={handleResetFilters} />}
                {tab === 'usage' && <ProjectTypeBars filteredRows={filteredRows} onExport={(node) => exportPng(node, 'time-allocation-project-type.png')} onReset={handleResetFilters} />}
                {tab === 'trends' && <WeeklyTeamTrend filteredRows={filteredRows} onExport={(node) => exportPng(node, 'teams-hours-over-time.png')} onReset={handleResetFilters} />}
                {tab === 'governance' && <Governance filteredRows={filteredRows} onReset={handleResetFilters} />}
              </>
            )}
          </section>
        </div>
      </main>
      </div>
  )
}

function Card({ title, children, onExport, heightPx = 380 }) {
  const ref = useRef(null)
  return (
    <div ref={ref} className="oryx-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="oryx-heading text-lg flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/20">
            <span className="text-lime-400">📊</span>
          </span>
          {title}
        </h3>
        <button 
          onClick={() => onExport(ref)} 
          className="oryx-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
        >
          <Download size={16} /> Export PNG
        </button>
      </div>
      <div style={{ height: heightPx }} className="rounded-lg bg-slate-900/30 p-3">
        {children}
      </div>
    </div>
  )
}

function PeopleChart({ data, onExport }) {
  return (
    <Card title="Total Hours by Staff Member" onExport={onExport}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis type="number" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
          <YAxis dataKey="name" type="category" width={160} interval={0} tick={{ fill: '#cbd5e1', fontSize: 12 }} />
          <ReTooltip 
            formatter={(v) => [`${v.toFixed(2)} h`, 'Hours']} 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #475569', 
              borderRadius: '8px',
              color: '#cbd5e1'
            }}
          />
          <Bar dataKey="hours" fill="#84cc16">
            <LabelList dataKey="hours" position="right" formatter={(v) => v.toFixed(1)} className="text-[10px] fill-slate-200" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

function ClientsChart({ data, onExport }) {
  return (
    <Card title="Top 10 Clients by Hours" onExport={onExport}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 64 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis 
            dataKey="name" 
            interval={0} 
            angle={-35} 
            textAnchor="end" 
            height={60}
            tick={{ fill: '#cbd5e1', fontSize: 12 }}
          />
          <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
          <ReTooltip 
            formatter={(v) => [`${v.toFixed(2)} h`, 'Hours']}
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #475569', 
              borderRadius: '8px',
              color: '#cbd5e1'
            }}
          />
          <Bar dataKey="hours" fill="#22d3ee" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

const PIE_COLORS = ['#22d3ee','#67e8f9','#a5f3fc','#38bdf8','#7dd3fc','#93c5fd','#60a5fa','#5eead4','#86efac','#fde68a']
const PASTEL_BARS = [
  "#84cc16", "#22d3ee", "#a78bfa", "#fb7185", "#fbbf24", "#34d399",
  "#f472b6", "#60a5fa", "#f97316", "#10b981", "#8b5cf6", "#ef4444"
]
const ORYX_COLORS = ['#84cc16', '#22d3ee', '#a78bfa', '#fb7185', '#fbbf24', '#34d399', '#f472b6', '#60a5fa']

function ProjectTypeBars({ filteredRows, onExport, onReset }) {
  const { sorted, total } = useMemo(() => {
    if (!filteredRows?.length) return { sorted: [], total: 0 }
    
    const map = new Map()
    let totalHours = 0
    
    for (const r of filteredRows) {
      const projectType = r['Project Type'] || 'Unknown'
      const hours = r.Hours
      map.set(projectType, (map.get(projectType) || 0) + hours)
      totalHours += hours
    }
    
    const data = Array.from(map.entries())
      .map(([name, hours]) => ({ name, hours: roundToQuarter(hours) }))
      .sort((a, b) => b.hours - a.hours)
    
    return { sorted: data, total: totalHours }
  }, [filteredRows])
  
  const hasData = sorted.some((d) => d.hours > 0)
  const heightPx = useMemo(() => {
    const perBar = 32 // px per category row for readability
    const base = 140  // axes + padding
    const calc = perBar * sorted.length + base
    return Math.max(420, Math.min(calc, 900))
  }, [sorted.length])
  const renderLabel = (props) => {
    const { x = 0, y = 0, width = 0, height = 0, value } = props || {}
    const hours = Number(value || 0)
    const pct = total > 0 ? ((hours / total) * 100).toFixed(1) : '0.0'
    const label = `${formatHours(hours)} (${pct}%)`
    const tx = x + width + 8
    const ty = y + height / 2
    return (
      <text x={tx} y={ty} fontSize={12} fill="#cbd5e1" textAnchor="start" dominantBaseline="central" style={{ whiteSpace: 'pre' }}>
        {label}
      </text>
    )
  }
  return (
    <Card title="Overall Time Allocation by Project Type" onExport={onExport} heightPx={heightPx}>
      {!hasData ? (
        <EmptyState title="No project type data" onReset={onReset} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ left: 12, right: 160, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis type="number" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <YAxis dataKey="name" type="category" width={220} interval={0} tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <ReTooltip 
              formatter={(v, name, props) => {
                const hours = Number(v)
                const pct = total > 0 ? ((hours / total) * 100).toFixed(1) : '0.0'
                return [`${formatTooltipHours(hours)} (${pct}%)`, props && props.payload ? props.payload.name : name]
              }}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #475569', 
                borderRadius: '8px',
                color: '#cbd5e1'
              }}
            />
            <Bar dataKey="hours">
              <LabelList dataKey="hours" content={renderLabel} />
              {sorted.map((_, i) => (
                <Cell key={i} fill={ACCESSIBLE_COLORS[i % ACCESSIBLE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

function WeeklyTeamTrend({ filteredRows, onExport, onReset }) {
  const { series, teams } = useMemo(() => {
    try {
      console.log('WeeklyTeamTrend - Processing', filteredRows?.length, 'rows')
      
      if (!filteredRows?.length) return { series: [], teams: [] }
      
      // Collect teams and pre-aggregate by ISO week
      const teamWeekData = {}
      const allTeams = new Set()
      
      for (const r of filteredRows) {
        const team = r.Role || 'Unknown'
        const week = r.isoWeek
        const hours = r.Hours || 0
        
        // Skip rows without valid week data
        if (!week) {
          console.log('WeeklyTeamTrend - Skipping row without isoWeek:', r)
          continue
        }
        
        allTeams.add(team)
        
        if (!teamWeekData[week]) {
          teamWeekData[week] = {}
        }
        teamWeekData[week][team] = (teamWeekData[week][team] || 0) + hours
      }
      
      const teamsList = Array.from(allTeams).sort()
      console.log('WeeklyTeamTrend - Teams found:', teamsList)
      
      // Get date range and fill missing weeks
      const allWeeks = Object.keys(teamWeekData).sort()
      console.log('WeeklyTeamTrend - Weeks found:', allWeeks.slice(0, 5), '...')
      
      if (allWeeks.length === 0) return { series: [], teams: teamsList }
      
      const startWeek = allWeeks[0]
      const endWeek = allWeeks[allWeeks.length - 1]
      
      // Simplified approach - just use the weeks we have data for
      const seriesData = allWeeks.map(week => {
        const weekEntry = { week }
        teamsList.forEach(team => {
          weekEntry[team] = roundToQuarter(teamWeekData[week]?.[team] || 0)
        })
        return weekEntry
      })
      
      console.log('WeeklyTeamTrend - Series data length:', seriesData.length)
      return { series: seriesData, teams: teamsList }
      
    } catch (error) {
      console.error('WeeklyTeamTrend - Error:', error)
      return { series: [], teams: [] }
    }
  }, [filteredRows])
  
  const colors = ACCESSIBLE_COLORS
  const hasData = series.length > 0 && teams.length > 0
  
  return (
    <Card title="Teams Hours Over Time (Weekly)" onExport={onExport}>
      {!hasData ? (
        <EmptyState title="No team trend data" onReset={onReset} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="week" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
            <ReTooltip 
              formatter={(v, name) => [formatTooltipHours(Number(v)), name]}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #475569', 
                borderRadius: '8px',
                color: '#cbd5e1'
              }}
            />
            {teams.map((t, i) => (
              <Line 
                key={t} 
                type="monotone" 
                dataKey={t} 
                stroke={colors[i % colors.length]} 
                strokeWidth={3} 
                dot={{ r: 3, fill: colors[i % colors.length] }} 
                activeDot={{ r: 5, fill: colors[i % colors.length] }} 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
