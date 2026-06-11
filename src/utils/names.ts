export const localizedName = (
  language: string,
  name: string,
  englishName?: string | null
): string => (language.startsWith('en') && englishName ? englishName : name);
