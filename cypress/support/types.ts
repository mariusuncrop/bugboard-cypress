export type Status = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type IssueType = 'bug' | 'task';

export interface Issue {
  id: string;
  key: string;
  title: string;
  status: Status;
  priority: Priority;
  type: IssueType;
  assigneeId: string | null;
  labels: string[];
  dueOn: string | null;
  project: { key: string; name: string } | null;
}

export interface IssueInput {
  title: string;
  type?: IssueType;
  status?: Status;
  priority?: Priority;
  assigneeId?: string | null;
  labels?: string[];
  dueOn?: string | null;
  parentId?: string | null;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  members: { id: string; name: string; email: string }[];
}

export type Persona = 'admin' | 'member';
