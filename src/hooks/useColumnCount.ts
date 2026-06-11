import { useEffect, useState } from 'react';

const QUERIES: [string, number][] = [
  ['(min-width: 1536px)', 3],
  ['(min-width: 768px)', 2]
];

export const useColumnCount = () => {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const lists = QUERIES.map(([query]) => window.matchMedia(query));
    const update = () => {
      const match = QUERIES.find(([query]) => window.matchMedia(query).matches);
      setColumns(match?.[1] ?? 1);
    };
    update();
    lists.forEach((list) => list.addEventListener('change', update));
    return () => lists.forEach((list) => list.removeEventListener('change', update));
  }, []);

  return columns;
};
