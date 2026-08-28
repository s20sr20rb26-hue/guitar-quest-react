export type AppHistoryView = 'practice-log' | 'timeline-thread' | 'record-skills';

export interface AppHistoryState extends Record<string, unknown> {
  guitarQuestView?: AppHistoryView;
}

export function getAppHistoryState(): AppHistoryState {
  const state = window.history.state;
  return state && typeof state === 'object' ? state as AppHistoryState : {};
}

export function pushAppHistoryView(view: AppHistoryView, details: Record<string, unknown> = {}) {
  window.history.pushState(
    { ...getAppHistoryState(), ...details, guitarQuestView: view },
    ''
  );
}

export function returnFromAppHistoryView(view: AppHistoryView): boolean {
  if (getAppHistoryState().guitarQuestView !== view) return false;
  window.history.back();
  return true;
}
