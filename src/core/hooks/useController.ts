import { useMemo, useSyncExternalStore } from "react";

import { useDI } from "@/src/core/di/DIProvider";

export interface Subscribable<TSnapshot> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): TSnapshot;
}

export function useController<TController extends Subscribable<TSnapshot>, TSnapshot>(
  token: symbol,
): [TSnapshot, TController] {
  const di = useDI();

  const controller = useMemo(() => di.resolve<TController>(token), [di, token]);

  const snapshot = useSyncExternalStore(
    controller.subscribe.bind(controller),
    controller.getSnapshot.bind(controller),
  );

  return [snapshot, controller];
}
