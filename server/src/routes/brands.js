import Brand from '../models/Brand.js';
import { crudRouter } from './crud.js';

export default crudRouter(Brand, ['marketId']);
