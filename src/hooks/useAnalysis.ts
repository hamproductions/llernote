import { useEffect, useState } from 'react';
import { loadAnalysis, type AnalysisResults } from '~/utils/setlistAnalysis';

export type { AnalysisResults };

export const useAnalysis = (catsKey: string): AnalysisResults | undefined => {
  const [data, setData] = useState<AnalysisResults>();
  useEffect(() => {
    let mounted = true;
    const cats = catsKey.split(',').filter(Boolean);
    loadAnalysis(cats).then((d) => mounted && setData(d));
    return () => {
      mounted = false;
    };
  }, [catsKey]);
  return data;
};
