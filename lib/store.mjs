const pendingAuth = new Map();
let authorizedAccount = null;

export function savePending(state, data) {
  pendingAuth.set(state, { ...data, createdAt: Date.now() });
}

export function takePending(state) {
  const entry = pendingAuth.get(state) || null;
  if (entry) pendingAuth.delete(state);
  return entry;
}

export function saveAuthorizedAccount(data) {
  authorizedAccount = {
    ...data,
    savedAt: new Date().toISOString(),
  };
}

export function getAuthorizedAccount() {
  return authorizedAccount;
}
