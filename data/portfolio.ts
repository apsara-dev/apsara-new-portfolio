import rawPortfolioData from "./portfolio.json";

export interface TelemetryItem {
  value: string;
  label: string;
  detail: string;
}

export interface ProfileData {
  name: string;
  title: string;
  specialization: string;
  tagline: string;
  positioning: string;
  telemetry: TelemetryItem[];
  summary: string[];
  location: string;
  availability: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  resume: string;
}

export interface ArchitecturePillar {
  id: string;
  badge: string;
  title: string;
  description: string;
  tech: string[];
}

export interface BlueprintNode {
  step: string;
  title: string;
  detail: string;
}

export interface ArchitectureBlueprint {
  id: string;
  name: string;
  summary: string;
  nodes: BlueprintNode[];
}

export interface ArchitectureData {
  headline: string;
  subheadline: string;
  pillars: ArchitecturePillar[];
  blueprints: ArchitectureBlueprint[];
}

export interface ProjectItem {
  id: string;
  name: string;
  kind: string;
  featured?: boolean;
  metrics?: string;
  problem: string;
  solution: string;
  architectureHighlight?: string;
  contribution: string[];
  outcome: string;
  tech: string[];
  demo: string;
  code: string;
}

export interface ExperienceItem {
  id?: string;
  role: string;
  company: string;
  place: string;
  period: string;
  type?: string;
  tech?: string[];
  points: string[];
}

export interface SkillGroup {
  group: string;
  badge?: string;
  description?: string;
  items: string[];
}

export interface GitHubRepoItem {
  name: string;
  fullName: string;
  description: string;
  language: string;
  Url: string;
  demoUrl?: string;
  highlights: string[];
}

export interface EducationItem {
  title: string;
  school: string;
  period: string;
  detail: string;
}

export interface PortfolioPayload {
  meta?: {
    lastSyncedAt: string;
    syncSource: string;
    version: number;
    dbStatus?: string;
    contactCount?: number;
  };
  profile: ProfileData;
  stackHighlights: string[];
  architecture: ArchitectureData;
  projects: ProjectItem[];
  experience: ExperienceItem[];
  skills: SkillGroup[];
  githubRepos: GitHubRepoItem[];
  education: EducationItem[];
}

export const defaultPortfolioData: PortfolioPayload =
  rawPortfolioData as PortfolioPayload;

export const profile = defaultPortfolioData.profile;
export const stackHighlights = defaultPortfolioData.stackHighlights;
export const architecture = defaultPortfolioData.architecture;
export const projects = defaultPortfolioData.projects;
export const experience = defaultPortfolioData.experience;
export const skills = defaultPortfolioData.skills;
export const githubRepos = defaultPortfolioData.githubRepos;
export const education = defaultPortfolioData.education;
