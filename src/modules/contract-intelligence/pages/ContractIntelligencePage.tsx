import React from 'react';
import { useProjectStore, useProjectActions, useSelectedProject } from '../../../stores/projectStore';
import { useTeamStore } from '../../../stores/teamStore';
import { useRdoStore } from '../../../stores/rdoStore';
import CoreContractIntelligencePage from '../../../../components/ContractIntelligence/ContractIntelligencePage';

export const ContractIntelligencePage: React.FC = () => {
  const projects = useProjectStore((state) => state.projects);
  const selectedProject = useSelectedProject();
  const teams = useTeamStore((state) => state.teams);
  const rdos = useRdoStore((state) => state.rdos);
  const { setSelectedProject } = useProjectActions();

  return (
    <CoreContractIntelligencePage
      projects={projects}
      teams={teams}
      rdos={rdos}
      selectedProject={selectedProject}
      onSelectProject={setSelectedProject}
    />
  );
};
