import { AppError } from '../../utils/app-error.js';
import type { Pagination } from '../../utils/schemas.js';
import { projectsRepository } from './projects.repository.js';
import type { CreateProjectInput, UpdateProjectInput } from './projects.schemas.js';

// Projects of other users answer 404, not 403, so their ids cannot be probed.
export const projectNotFound = () => new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');

export function createProject(ownerId: string, input: CreateProjectInput) {
  return projectsRepository.create(ownerId, input);
}

export function listProjects(ownerId: string, pagination: Pagination) {
  return projectsRepository.findManyByOwner(ownerId, pagination);
}

export async function getProject(ownerId: string, id: string) {
  const project = await projectsRepository.findOwned(id, ownerId);
  if (!project) throw projectNotFound();
  return project;
}

export async function updateProject(ownerId: string, id: string, input: UpdateProjectInput) {
  await getProject(ownerId, id);
  return projectsRepository.updateOwned(id, ownerId, input);
}

export async function deleteProject(ownerId: string, id: string): Promise<void> {
  if (!(await projectsRepository.deleteOwned(id, ownerId))) throw projectNotFound();
}
