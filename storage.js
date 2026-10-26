'use strict';
// Persistence boundary: UI owns event state; adapters own reading/writing snapshots.
// Retain the original key and v1 backup shape so existing data keeps working.
window.EventRepository = (() => {
  const key = 'my-event-planner-v1';
  const adapter = {
    async load() {
      const raw = localStorage.getItem(key);
      return raw === null ? {version: 1, events: []} : JSON.parse(raw);
    },
    async save(snapshot) { localStorage.setItem(key, JSON.stringify(snapshot)); }
  };
  let writes = Promise.resolve();
  return {
    load: () => adapter.load(),
    save(snapshot) {
      // Capture now; serialize writes so a future async adapter preserves order.
      const copy = JSON.parse(JSON.stringify(snapshot));
      const result = writes.catch(() => {}).then(() => adapter.save(copy));
      writes = result;
      return result;
    }
  };
})();
