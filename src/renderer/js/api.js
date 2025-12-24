const BASE_URL = 'http://103.126.116.119:8001/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const fetchOpts = {
    ...options,
    headers,
  };

  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === 'object') {
      fetchOpts.headers['Content-Type'] = fetchOpts.headers['Content-Type'] || 'application/json';
      fetchOpts.body = JSON.stringify(options.body);
    } else {
      fetchOpts.body = options.body;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, fetchOpts);

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API Error');
  return data;
}

window.apiRequest = apiRequest;
window.BASE_URL = BASE_URL;
window.getToken = getToken;