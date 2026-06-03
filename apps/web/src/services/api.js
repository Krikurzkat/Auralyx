function getApiBaseUrl() {
    const configuredUrl = import.meta.env.VITE_API_URL;
    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, '');
    }
    return '';
}
export function apiUrl(path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${getApiBaseUrl()}${normalizedPath}`;
}
export function getNetworkErrorMessage(error) {
    if (error instanceof TypeError) {
        return 'Could not reach the API server. Make sure the server is running, then try again.';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Something went wrong. Please try again.';
}
