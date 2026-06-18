import characterInfo from '../../data/character-info.json';
import type { Character } from '~/types';

export const characters = characterInfo as unknown as Character[];
