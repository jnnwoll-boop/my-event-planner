'use strict';
const IDEA_CATEGORIES = ['Decor', 'Food', 'Cake', 'Invitations', 'Colors', 'Outfits', 'Other'];
const IDEA_STORAGE_CHARS = 1800000; // Conservative shared localStorage budget (~3.6 MB UTF-16).
const IDEA_IMAGE_CHARS = 180000;
function validateIdeas(ideas) {
  if (ideas === undefined) return; // Existing events/backups remain compatible.
  if (!Array.isArray(ideas) || ideas.length > 100) throw Error('Invalid ideas');
  const ids = new Set();
  for (const idea of ideas) {
    if (!idea || typeof idea.id !== 'string' || !/^[\w-]{1,100}$/.test(idea.id) || ids.has(idea.id)
      || typeof idea.caption !== 'string' || idea.caption.length > 240
      || !IDEA_CATEGORIES.includes(idea.category) || typeof idea.image !== 'string'
      || idea.image.length > IDEA_IMAGE_CHARS
      || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(idea.image)) throw Error('Invalid idea');
    ids.add(idea.id);
  }
}
async function compressIdea(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') throw Error('Choose a photo (JPEG, PNG, WebP, or a format your browser can open).');
  if (file.size > 20 * 1024 * 1024) throw Error('This photo is too large. Choose one smaller than 20 MB.');
  let bitmap;
  try { bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'}); }
  catch { throw Error('This photo format could not be opened. Try a JPEG or PNG; for iPhone HEIC photos, export a JPEG first.'); }
  try {
    if (bitmap.width * bitmap.height > 50000000) throw Error('This photo has too many pixels. Choose a smaller version.');
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.78, 0.6, 0.4, 0.25]) {
      const image = canvas.toDataURL('image/jpeg', quality);
      if (image.length <= IDEA_IMAGE_CHARS) return image;
    }
    throw Error('This photo is still too detailed after compression. Try a smaller image.');
  } finally { bitmap.close(); }
}
function ideasBoard(e, container) {
  const ideas = e.ideas || [];
  container.innerHTML = `<section class="panel"><h2>Inspiration Board</h2><p class="muted">Collect the little things that bring your celebration to life.</p>
    <div class="ideas-help"><p>Photos stay on this device and are included in your event backups. We resize and compress them to save space. Keep your original photos elsewhere.</p><p>Browser space is limited and shared by all events. If it fills up, export a backup, then delete unneeded photos. No cloud upload or sync.</p></div>
    <label for="ideaPhotos">Add photos</label><input id="ideaPhotos" type="file" accept="image/*" multiple aria-describedby="photoHint"><p id="photoHint" class="muted">Choose photos from your photo library or computer. Up to 20 MB per original; unsupported formats will show a message.</p>
    <p id="ideaStatus" role="status" aria-live="polite"></p>
    <div class="ideas-gallery">${ideas.map((idea, index) => `<article class="idea-card"><img src="${idea.image}" alt="${esc(idea.caption || idea.category + ' inspiration') }" loading="lazy" width="1000" height="750"><form data-idea="${idea.id}"><label>Caption or note<input name="caption" maxlength="240" value="${esc(idea.caption)}" placeholder="What do you love about this idea?" aria-label="Caption for photo ${index + 1}"></label><label>Category<select name="category" aria-label="Category for photo ${index + 1}">${IDEA_CATEGORIES.map(category => `<option ${category === idea.category ? 'selected' : ''}>${category}</option>`).join('')}</select></label><div class="idea-actions"><button class="primary" type="submit">Save details</button><button class="danger" type="button" data-delete-idea="${idea.id}" aria-label="Delete photo ${index + 1}">Delete photo</button></div></form></article>`).join('')}</div>
    ${ideas.length ? '' : '<div class="empty"><div class="flower">✳</div><h3>A little inspiration goes a long way.</h3><p>Add your first photo above—decor, cake, colors, or anything you love.</p></div>'}</section>`;
  let busy = false;
  const status = text => { if (container.isConnected) container.querySelector('#ideaStatus').textContent = text; };
  const lock = value => { busy = value; container.querySelectorAll('input,select,button').forEach(control => control.disabled = value); };
  async function persist(next) {
    if (!storageOK) throw Error('Browser saving is unavailable. Export a backup before closing.');
    if (!events.includes(e)) throw Error('This event was deleted. The photo was not added.');
    const previous = e.ideas;
    e.ideas = next;
    try { await EventRepository.save({version: 1, events}); }
    catch { if (previous === undefined) delete e.ideas; else e.ideas = previous; throw Error('Browser storage is full or unavailable. Nothing was changed. Export a backup, then delete unneeded photos to free space.'); }
  }
  container.querySelector('#ideaPhotos').onchange = async ev => {
    if (busy) return;
    const files = [...ev.target.files];
    if (!files.length) return;
    lock(true);
    let added = 0; const failures = [];
    for (const file of files) {
      status(`Preparing photo ${added + failures.length + 1} of ${files.length}…`);
      try {
        if ((e.ideas || []).length >= 100) throw Error('This event already has 100 photos. Delete some before adding more.');
        const image = await compressIdea(file);
        const idea = {id: uid(), image, caption: '', category: 'Other'};
        const next = [...(e.ideas || []), idea];
        const snapshot = {version: 1, events: events.map(event => event === e ? {...e, ideas: next} : event)};
        if (JSON.stringify(snapshot).length > IDEA_STORAGE_CHARS) throw Error('Photo storage is nearly full. Export a backup, then delete unneeded photos before adding more.');
        await persist(next); added++;
      } catch (error) { failures.push(`${file.name}: ${error.message}`); }
    }
    lock(false);
    if (selected === e.id && tab === 'ideas') {
      ideasBoard(e, container);
      container.querySelector('#ideaStatus').textContent = `${added} photo${added === 1 ? '' : 's'} added.${failures.length ? ' ' + failures.join(' ') : ''}`;
    }
  };
  container.querySelectorAll('[data-idea]').forEach(form => form.onsubmit = async ev => {
    ev.preventDefault(); if (busy) return; lock(true);
    try {
      await persist((e.ideas || []).map(idea => idea.id === form.dataset.idea ? {...idea, caption: form.elements.caption.value.trim(), category: form.elements.category.value} : idea));
      status('Photo details saved.');
      const image = form.closest('.idea-card').querySelector('img');
      image.alt = form.elements.caption.value.trim() || form.elements.category.value + ' inspiration';
    } catch (error) { status(error.message); }
    finally { lock(false); }
  });
  container.querySelectorAll('[data-delete-idea]').forEach(button => button.onclick = async () => {
    if (busy || !confirm('Delete this photo and its note? This cannot be undone.')) return;
    lock(true);
    try {
      await persist((e.ideas || []).filter(idea => idea.id !== button.dataset.deleteIdea));
      if (selected === e.id && tab === 'ideas') { ideasBoard(e, container); container.querySelector('#ideaStatus').textContent = 'Photo deleted.'; }
    } catch (error) { status(error.message); lock(false); }
  });
}
