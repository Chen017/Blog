// Share an in-flight request and allow a later attempt after a network failure.
export function createRetryableLoader<T>(load: (attempt: number) => Promise<T>) {
    let pending: Promise<T> | undefined;
    let attempt = 0;
    return () => {
        if (!pending) {
            pending = Promise.resolve().then(() => load(attempt++)).catch(error => {
                pending = undefined;
                throw error;
            });
        }
        return pending;
    };
}
