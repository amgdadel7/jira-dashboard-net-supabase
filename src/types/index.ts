export type Status = 'todo' | 'inprogress' | 'inreview' | 'done';
export type IssueType = 'story' | 'task' | 'bug' | 'epic';
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';
export type SprintState = 'active' | 'future' | 'closed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
  initials: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  type: string;
  leadId: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string; // ISO
  endDate: string; // ISO
  state: SprintState;
}

export interface IssueComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  key: string;
  summary: string;
  description: string;
  type: IssueType;
  priority: Priority;
  status: Status;
  storyPoints: number | null;
  assigneeId: string | null;
  reporterId: string;
  sprintId: string | null;
  epicId: string | null;
  labels: string[];
  rank: number;
  createdAt: string;
  updatedAt: string;
  comments: IssueComment[];
}

export interface Epic {
  id: string;
  key: string;
  title: string;
  color: string;
  startDate: string;
  endDate: string;
}

export interface Workspace {
  project: Project;
  users: User[];
  sprints: Sprint[];
  issues: Issue[];
  epics: Epic[];
}

export interface CreateIssueInput {
  summary: string;
  type: IssueType;
  priority: Priority;
  status: Status;
  assigneeId: string | null;
  storyPoints: number | null;
  sprintId: string | null;
  epicId: string | null;
  labels: string[];
  description: string;
}

export const STATUS_META: Record<Status, { label: string; short: string }> = {
  todo: { label: 'To Do', short: 'TODO' },
  inprogress: { label: 'In Progress', short: 'IN PROGRESS' },
  inreview: { label: 'In Review', short: 'IN REVIEW' },
  done: { label: 'Done', short: 'DONE' },
};

export const BOARD_COLUMNS: Status[] = ['todo', 'inprogress', 'inreview', 'done'];

export const PRIORITY_ORDER: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest'];
