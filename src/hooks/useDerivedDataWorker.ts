import { useEffect, useMemo, useRef, useState, type DependencyList } from 'react';
import type { WorkerRequest, WorkerResponse } from '~/workers/derived-data';

type RequestType = WorkerRequest['type'];
type RequestFor<T extends RequestType> = Extract<WorkerRequest, { type: T }>;
type ResponseFor<T extends RequestType> = Extract<WorkerResponse, { type: T }>['result'];

let requestId = 0;

export const useDerivedDataWorker = <T extends RequestType>(
  type: T,
  payload: RequestFor<T>['payload'],
  deps: DependencyList
) => {
  const [result, setResult] = useState<WorkerResponse['result']>();
  const [pending, setPending] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  const payloadMemo = useMemo(() => payload, deps);

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setPending(false);
      return;
    }

    const id = ++requestId;
    const worker =
      workerRef.current ??
      new Worker(new URL('../workers/derived-data.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setPending(true);

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id || event.data.type !== type) return;
      setResult(event.data.result);
      setPending(false);
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ id, type, payload: payloadMemo } as RequestFor<T>);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [type, payloadMemo]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    []
  );

  return { result: result as ResponseFor<T> | undefined, pending };
};
