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
  if (res.status === 403) {
    alert('Anda tidak memiliki akses ke fitur ini');
    throw new Error('Forbidden');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API Error');
  return data;
}

window.apiRequest = apiRequest;
window.BASE_URL = BASE_URL;
window.getToken = getToken;

window.fetchStoresForOwner = async function() {
  const role = (localStorage.getItem('role') || '').toLowerCase();
  if (role !== 'owner') return [];
  try {
    const res = await window.apiRequest('/stores');
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res?.data?.stores && Array.isArray(res.data.stores)) return res.data.stores;
    if (res?.stores && Array.isArray(res.stores)) return res.stores;
    if (res?.data?.items && Array.isArray(res.data.items)) return res.data.items;
    return [];
  } catch (err) {
    return [];
  }
};

window.fetchStoreForUser = async function() {
  const storeId = localStorage.getItem('store_id');
  if (!storeId) return null;
  try {
    const res = await window.apiRequest(`/stores/${storeId}`);
    if (res?.data) return res.data;
    return null;
  } catch (err) {
    return null;
  }
};