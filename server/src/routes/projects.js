import Project from '../models/Project.js';
import { crudRouter } from './crud.js';

export default crudRouter(Project, ['marketId', 'brandId']);
