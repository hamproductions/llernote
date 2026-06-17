import { ANALYSIS, ANALYSIS_SPIN } from '~/utils/setlistAnalysis';

export type AnalysisResults = typeof ANALYSIS;
export const useAnalysis = (includeSpinoff = false): AnalysisResults =>
  includeSpinoff ? (ANALYSIS_SPIN as AnalysisResults) : ANALYSIS;
