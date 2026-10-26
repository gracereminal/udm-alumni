import { loadCatalog } from '../data/colleges';
import { loadQuestionConfig } from './questionStore';

let pending = null;

/**
 * The college / program catalog and the Admin's tracer question edits, which the forms read synchronously. Only the
 * pages that use them wait (routes/AppRoutes.jsx), alongside their own code, so Sign In renders without them.
 * Started once; a failure clears it so the next call tries again.
 */
export function startupData() {
  if (!pending) {
    pending = Promise.all([loadCatalog(), loadQuestionConfig()]).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}
