import type { Project, ProjectEdge, ProjectNode, Requirement, ScopeChange, SourceDocument, TeamMember } from '../domain/models';

export interface ProjectSnapshot {
  project: Project;
  documents: SourceDocument[];
  requirements: Requirement[];
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  members: TeamMember[];
  changes: ScopeChange[];
}

export interface ProjectStore {
  load(projectId: string): Promise<ProjectSnapshot | null>;
  save(snapshot: ProjectSnapshot): Promise<void>;
}

export class BrowserProjectStore implements ProjectStore {
  constructor(private readonly keyPrefix = 'tuydui-project:') {}

  async load(projectId: string): Promise<ProjectSnapshot | null> {
    const raw = localStorage.getItem(`${this.keyPrefix}${projectId}`);
    return raw ? (JSON.parse(raw) as ProjectSnapshot) : null;
  }

  async save(snapshot: ProjectSnapshot): Promise<void> {
    localStorage.setItem(`${this.keyPrefix}${snapshot.project.id}`, JSON.stringify(snapshot));
  }
}
