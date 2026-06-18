import { useEffect, useState } from 'react';
import { loadAnalysis, type AnalysisResults } from '~/utils/setlistAnalysis';

export type { AnalysisResults };

export const useAnalysis = (includeSpinoff = false): AnalysisResults | undefined => {
  const [data, setData] = useState<AnalysisResults>();
  useEffect(() => {
    let mounted = true;
    loadAnalysis(includeSpinoff).then((d) => mounted && setData(d));
    return () => {
      mounted = false;
    };
  }, [includeSpinoff]);
  return data;
};
