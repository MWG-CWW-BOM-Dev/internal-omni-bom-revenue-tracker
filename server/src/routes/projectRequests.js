import ProjectRequest from '../models/ProjectRequest.js';
import { crudRouter } from './crud.js';

export default crudRouter(ProjectRequest, ['projectId']);
