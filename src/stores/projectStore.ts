import { create } from 'zustand';
import { Project, ServiceItem } from '../../types';
import { FirestoreProjectRepository } from '../repositories/FirestoreProjectRepository';
import { generateUUID } from '../../utils';
import { read, utils } from 'xlsx';

const projectRepo = new FirestoreProjectRepository();

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  actions: {
    setProjects: (projects: Project[]) => void;
    setSelectedProject: (project: Project | null) => void;
    loadProjects: () => Promise<Project[]>;
    saveProject: (name: string, regional: string, isEditMode: boolean, editingItemId: string | null) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    handleServicesUpload: (file: File) => Promise<void>;
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProject: null,
  actions: {
    setProjects: (projects) => set({ projects }),
    setSelectedProject: (selectedProject) => set({ selectedProject }),
    loadProjects: async () => {
      const projectsList = await projectRepo.getAll();
      set({ projects: projectsList });
      return projectsList;
    },
    saveProject: async (name, regional, isEditMode, editingItemId) => {
      const { projects } = get();
      if (!name.trim()) return;

      if (isEditMode && editingItemId) {
        const updatedProjects = projects.map(p =>
          p.id === editingItemId ? {
            ...p,
            name,
            regional
          } : p
        );
        const projectToUpdate = updatedProjects.find(p => p.id === editingItemId);
        if (projectToUpdate) await projectRepo.update(projectToUpdate);
        set({ projects: updatedProjects });
        
        const currentSelected = get().selectedProject;
        if (currentSelected && currentSelected.id === editingItemId && projectToUpdate) {
          set({ selectedProject: projectToUpdate });
        }
      } else {
        const newProject: Project = {
          id: generateUUID(),
          name,
          regional,
          createdAt: new Date().toISOString(),
          services: []
        };
        await projectRepo.save(newProject);
        set({ projects: [newProject, ...projects] });
      }
    },
    deleteProject: async (id) => {
      const { projects } = get();
      await projectRepo.delete(id);
      set({ projects: projects.filter(p => p.id !== id) });
      if (get().selectedProject?.id === id) {
        set({ selectedProject: null });
      }
    },
    handleServicesUpload: async (file) => {
      const selected = get().selectedProject;
      if (!file || !selected) return;

      const arrayBuffer = await file.arrayBuffer();
      const workbook = read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 });

      const services: ServiceItem[] = [];

      jsonData.forEach((row: any) => {
        if (row.length >= 4) {
          const code = String(row[0]);
          if (code && !['código', 'code', 'item'].includes(code.toLowerCase())) {
            const val = row[3];
            let numVal = 0;
            if (typeof val === 'number') numVal = val;
            else if (typeof val === 'string') {
              numVal = parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
            }

            services.push({
              code: code,
              scope: String(row[1]),
              unit: String(row[2]),
              value: numVal || 0
            });
          }
        }
      });

      const updatedProject = { ...selected, services };
      const updatedProjects = get().projects.map(p => p.id === selected.id ? updatedProject : p);

      await projectRepo.update(updatedProject);
      set({ 
        projects: updatedProjects,
        selectedProject: updatedProject
      });
    }
  }
}));

// Selectors
export const useProjectsList = () => useProjectStore((state) => state.projects);
export const useSelectedProject = () => useProjectStore((state) => state.selectedProject);
export const useProjectActions = () => useProjectStore((state) => state.actions);
