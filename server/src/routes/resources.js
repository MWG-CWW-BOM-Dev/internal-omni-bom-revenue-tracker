import Resource from '../models/Resource.js';
import { crudRouter } from './crud.js';

export default crudRouter(Resource, ['marketId']);
