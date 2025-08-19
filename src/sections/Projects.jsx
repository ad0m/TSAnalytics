import { useState } from 'react'
import TopProjectsBar from '../components/TopProjectsBar.jsx'
import ProjectTypeTrend from '../components/ProjectTypeTrend.jsx'
import RoleByWorkTypeHeatmap from '../components/RoleByWorkTypeHeatmap.jsx'
import CumulativeBillableVsNon from '../components/CumulativeBillableVsNon.jsx'
import ProjectDetailDrawer from '../components/ProjectDetailDrawer.jsx'

export default function Projects({ filteredRows, onCompanyFilter }) {
  const [selectedProject, setSelectedProject] = useState(null)

  const handleProjectClick = (projectName) => {
    setSelectedProject(projectName)
  }

  const handleCloseDrawer = () => {
    setSelectedProject(null)
  }

  return (
    <div className="space-y-6">
      {/* Top Projects Bar */}
      <section>
        <TopProjectsBar 
          filteredRows={filteredRows} 
          onProjectClick={handleProjectClick}
        />
      </section>

      {/* Project Type Trend - Full Width */}
      <section>
        <ProjectTypeTrend filteredRows={filteredRows} />
      </section>

      {/* Full Width Charts */}
      <div className="space-y-6">
        {/* Role by Work Type Heatmap - Full Width */}
        <RoleByWorkTypeHeatmap filteredRows={filteredRows} />
        
        {/* Cumulative Billable vs Non-billable - Full Width */}
        <CumulativeBillableVsNon filteredRows={filteredRows} />
      </div>

      {/* Project Detail Drawer */}
      {selectedProject && (
        <ProjectDetailDrawer 
          projectName={selectedProject}
          filteredRows={filteredRows}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  )
}
