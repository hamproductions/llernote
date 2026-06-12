export const localizedName = (
  language: string,
  name: string,
  englishName?: string | null
): string => (language.startsWith('en') && englishName ? englishName : name);

export const castName = (language: string, seiyuu: string, englishName?: string | null): string =>
  language.startsWith('en') && englishName ? englishName.split(' ').toReversed().join(' ') : seiyuu;
