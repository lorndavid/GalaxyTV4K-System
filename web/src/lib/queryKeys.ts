export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  attendance: {
    today: ['attendance', 'today'] as const,
    history: (year: number, month: number) => ['attendance', 'history', year, month] as const,
  },
  leave: {
    balances: ['leave', 'balances'] as const,
    myRequests: ['leave', 'myRequests'] as const,
  },
  out: {
    myRequests: ['out', 'myRequests'] as const,
  },
};
