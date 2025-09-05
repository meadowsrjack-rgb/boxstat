
export function useSearchParams() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  return [params] as const;
}
