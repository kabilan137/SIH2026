import { useCallback, useContext } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { deleteHistoryItem, fetchHistory, fetchHistoryItem, submitAnalysis, fetchAnalysisStatus } from '../api/analysisApi.js';
import { AnalysisContext } from '../context/AnalysisContext.jsx';

export function useAnalysis() {
  const { state, dispatch } = useContext(AnalysisContext);
  const { getToken } = useAuth();

  const createAnalysis = useCallback(
    async (input) => {
      dispatch({ type: 'REQUEST_START' });
      try {
        const token = await getToken();
        const job = await submitAnalysis(input, token);
        const jobId = job.id;

        let completed = false;
        let finalResult = null;

        while (!completed) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const freshToken = await getToken();
          const jobStatus = await fetchAnalysisStatus(jobId, freshToken);

          dispatch({
            type: 'UPDATE_PROGRESS',
            payload: {
              progress: jobStatus.progress,
              status: jobStatus.status
            }
          });

          if (jobStatus.progress === 100) {
            completed = true;
            if (jobStatus.error) {
              throw new Error(jobStatus.error);
            }
            finalResult = jobStatus.result;
          }
        }

        dispatch({ type: 'SET_ANALYSIS', payload: finalResult });
        return finalResult;
      } catch (error) {
        dispatch({ type: 'REQUEST_FAILURE', payload: error.message });
        throw error;
      }
    },
    [dispatch, getToken]
  );

  const loadAnalysis = useCallback(
    async (id) => {
      dispatch({ type: 'REQUEST_START' });
      try {
        const token = await getToken();
        const analysis = await fetchHistoryItem(id, token);
        dispatch({ type: 'SET_ANALYSIS', payload: analysis });
        return analysis;
      } catch (error) {
        dispatch({ type: 'REQUEST_FAILURE', payload: error.message });
        throw error;
      }
    },
    [dispatch, getToken]
  );

  const loadHistory = useCallback(
    async (limit = 25) => {
      dispatch({ type: 'REQUEST_START' });
      try {
        const token = await getToken();
        const history = await fetchHistory(limit, token);
        dispatch({ type: 'SET_HISTORY', payload: history });
        return history;
      } catch (error) {
        dispatch({ type: 'REQUEST_FAILURE', payload: error.message });
        throw error;
      }
    },
    [dispatch, getToken]
  );

  const removeHistoryItem = useCallback(
    async (id) => {
      const token = await getToken();
      await deleteHistoryItem(id, token);
      dispatch({ type: 'REMOVE_HISTORY_ITEM', payload: id });
    },
    [dispatch, getToken]
  );

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), [dispatch]);

  return {
    state,
    createAnalysis,
    loadAnalysis,
    loadHistory,
    removeHistoryItem,
    clearError
  };
}
