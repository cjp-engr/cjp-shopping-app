export function formatNetworkError(err: unknown): string {
  if (
    err instanceof TypeError &&
    err.message.toLowerCase().includes('failed to fetch')
  ) {
    return 'No internet connection. Please check your connection and try again.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}
