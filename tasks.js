'use strict';
// Existing tasks retain text/due/done; optional fields make old backups compatible.
function validateTaskDetails(tasks, ideas) {
  const ids = new Set();
  const photos = new Set((ideas || []).map(idea => idea.id));
  function check(task, child) {
    if (ids.has(task.id)) throw Error('Duplicate task ID');
    ids.add(task.id);
    if (task.notes !== undefined && (typeof task.notes !== 'string' || task.notes.length > 10000)) throw Error('Invalid task notes');
    if (task.collapsed !== undefined && typeof task.collapsed !== 'boolean') throw Error('Invalid task state');
    if (task.photoIds !== undefined && (!Array.isArray(task.photoIds) || task.photoIds.length > 100 || new Set(task.photoIds).size !== task.photoIds.length || task.photoIds.some(id => !photos.has(id)))) throw Error('Invalid task photos');
    if (task.subtasks !== undefined) {
      if (child || !Array.isArray(task.subtasks) || task.subtasks.length > 1000) throw Error('Invalid subtasks');
      for (const sub of task.subtasks) {
        if (!sub || typeof sub.id !== 'string' || !sub.id.length || sub.id.length > 500 || typeof sub.text !== 'string' || !sub.text.trim() || sub.text.length > 300 || typeof sub.done !== 'boolean' || typeof sub.due !== 'string' || (sub.due !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(sub.due) || !Number.isFinite(Date.parse(sub.due + 'T12:00:00')) || new Date(sub.due + 'T12:00:00').toISOString().slice(0,10) !== sub.due))) throw Error('Invalid subtask');
        check(sub, true);
      }
    }
  }
  tasks.forEach(task => check(task, false));
}
function taskPhotoViewer(idea) {
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-viewer';
  dialog.innerHTML = `<div class="sectionhead"><h2>${esc(idea.caption || idea.category + ' inspiration')}</h2><button type="button" aria-label="Close photo">✕</button></div><img src="${idea.image}" alt="${esc(idea.caption || idea.category + ' inspiration')}">`;
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.onclose = () => dialog.remove();
  document.body.append(dialog); dialog.showModal();
}
function taskPlanner(e, container) {
  let busy = false;
  const locate = id => {
    for (const main of e.tasks) {
      if (main.id === id) return {task: main, list: e.tasks};
      const task = (main.subtasks || []).find(sub => sub.id === id);
      if (task) return {task, list: main.subtasks, parent: main};
    }
  };
  async function change(mutate) {
    if (busy) return false;
    if (!storageOK || !events.includes(e)) { notify('Saving is unavailable. Export a backup before closing.'); return false; }
    busy = true;
    const previousTasks = structuredClone(e.tasks), previousIdeas = e.ideas;
    try {
      mutate();
      validateTaskDetails(e.tasks, e.ideas);
      await EventRepository.save({version: 1, events});
      return true;
    } catch (error) {
      e.tasks = previousTasks;
      if (previousIdeas === undefined) delete e.ideas; else e.ideas = previousIdeas;
      notify('Could not save: ' + (error.message || 'Browser storage is full or unavailable.') + ' Nothing was changed. Export a backup before closing.');
      return false;
    } finally { busy = false; }
  }
  const refresh = () => { if (selected === e.id && tab === 'checklist' && container.isConnected) draw(); };
  function photoMarkup(task) {
    return `<div class="task-photos">${(task.photoIds || []).map(id => {
      const idea = (e.ideas || []).find(idea => idea.id === id);
      return idea ? `<div><button type="button" data-view-photo="${esc(id)}" aria-label="Enlarge ${esc(idea.caption || idea.category + ' photo')}"><img src="${idea.image}" alt="${esc(idea.caption || idea.category + ' inspiration')}" loading="lazy"></button><button type="button" data-unlink-photo="${esc(id)}" data-owner="${esc(task.id)}" aria-label="Unlink photo from ${esc(task.text)}">Unlink</button></div>` : '';
    }).join('')}</div>`;
  }
  function taskMarkup(task, list, child = false) {
    const count = (task.subtasks || []).length, done = (task.subtasks || []).filter(sub => sub.done).length;
    const index = list.indexOf(task);
    return `<article class="${child ? 'subtask' : 'task'} task-node" data-node="${esc(task.id)}"><div class="task-heading"><input type="checkbox" data-complete="${esc(task.id)}" aria-label="Complete ${esc(task.text)}" ${task.done ? 'checked' : ''}><div><h3 class="${task.done ? 'completed-title' : ''}">${esc(task.text)}</h3><small>${date(task.due)}</small></div></div>
      ${task.notes ? `<p class="task-notes">${esc(task.notes)}</p>` : ''}${photoMarkup(task)}
      <div class="task-controls"><button type="button" data-edit="${esc(task.id)}">Edit</button><button type="button" data-duplicate="${esc(task.id)}">Duplicate</button><button type="button" data-move="${esc(task.id)}" data-step="-1" aria-label="Move ${esc(task.text)} up" ${index === 0 ? 'disabled' : ''}>↑ Up</button><button type="button" data-move="${esc(task.id)}" data-step="1" aria-label="Move ${esc(task.text)} down" ${index === list.length - 1 ? 'disabled' : ''}>↓ Down</button><button type="button" class="danger" data-delete="${esc(task.id)}">Delete</button></div>
      ${!child ? `<div class="subtask-progress"><p>${done} of ${count} subtasks complete${count ? ` · ${Math.round(done / count * 100)}%` : ''}</p><progress max="${count || 1}" value="${done}" aria-label="Subtask progress for ${esc(task.text)}"></progress></div><div class="task-controls"><button type="button" data-add-sub="${esc(task.id)}">+ Add subtask</button>${count ? `<button type="button" data-toggle="${esc(task.id)}" aria-expanded="${!task.collapsed}">${task.collapsed ? 'Show' : 'Hide'} subtasks</button>` : ''}</div><div class="subtask-list" ${task.collapsed ? 'hidden' : ''}>${(task.subtasks || []).map(sub => taskMarkup(sub, task.subtasks, true)).join('')}</div>` : ''}</article>`;
  }
  function draw() {
    container.innerHTML = `<section class="panel"><h2>Task Planner</h2><p class="muted">Plan the big jobs and the little details. Main task checkboxes are independent; progress counts completed subtasks.</p><form id="taskForm" class="inline"><label>Main task title<input name="text" required maxlength="300" placeholder="e.g. Entry Table Setup"></label><label>Due date<input name="due" type="date"></label><button class="primary">Add task</button></form><p class="muted">Use Edit to add detailed notes and photos. Up and Down buttons change the order.</p><div class="task-list">${e.tasks.map(task => taskMarkup(task, e.tasks)).join('') || '<p class="muted">No tasks yet. Add your first main task above.</p>'}</div></section>`;
    container.querySelector('#taskForm').onsubmit = async ev => {
      ev.preventDefault(); const f = ev.target; const text = f.elements.text.value.trim(); if (!text) return;
      if (await change(() => e.tasks.push({id: uid(), text, due: f.elements.due.value, done: false, notes: '', photoIds: [], subtasks: []}))) refresh();
    };
    container.querySelectorAll('[data-complete]').forEach(input => input.onchange = async () => {
      const id = input.dataset.complete, value = input.checked;
      if (await change(() => locate(id).task.done = value)) refresh(); else input.checked = !value;
    });
    container.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => editTask(button.dataset.edit));
    container.querySelectorAll('[data-add-sub]').forEach(button => button.onclick = () => editTask(null, button.dataset.addSub));
    container.querySelectorAll('[data-delete]').forEach(button => button.onclick = async () => {
      const found = locate(button.dataset.delete);
      if (!confirm(`Delete “${found.task.text}”${found.parent ? '' : ' and its subtasks'}? Photos will stay in the Inspiration Gallery.`)) return;
      if (await change(() => found.list.splice(found.list.indexOf(found.task), 1))) refresh();
    });
    container.querySelectorAll('[data-move]').forEach(button => button.onclick = async () => {
      if (await change(() => { const {list, task} = locate(button.dataset.move); const i = list.indexOf(task), j = i + Number(button.dataset.step); if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]]; })) refresh();
    });
    container.querySelectorAll('[data-duplicate]').forEach(button => button.onclick = async () => {
      if (await change(() => {
        const {task, list} = locate(button.dataset.duplicate), copy = structuredClone(task);
        copy.id = uid(); copy.text = task.text.slice(0, 293) + ' (copy)'; copy.done = false;
        if (copy.subtasks) copy.subtasks.forEach(sub => { sub.id = uid(); sub.done = false; });
        list.splice(list.indexOf(task) + 1, 0, copy);
      })) refresh();
    });
    container.querySelectorAll('[data-toggle]').forEach(button => button.onclick = async () => {
      if (await change(() => { const task = locate(button.dataset.toggle).task; task.collapsed = !task.collapsed; })) refresh();
    });
    container.querySelectorAll('[data-view-photo]').forEach(button => button.onclick = () => taskPhotoViewer(e.ideas.find(idea => idea.id === button.dataset.viewPhoto)));
    container.querySelectorAll('[data-unlink-photo]').forEach(button => button.onclick = async () => {
      if (await change(() => { const task = locate(button.dataset.owner).task; task.photoIds = task.photoIds.filter(id => id !== button.dataset.unlinkPhoto); })) refresh();
    });
  }
  function editTask(id, parentId) {
    const current = id ? locate(id)?.task : null;
    if (id && !current) return;
    const dialog = document.createElement('dialog'); dialog.className = 'task-editor';
    dialog.innerHTML = `<form><div class="sectionhead"><h2>${current ? 'Edit task' : 'Add subtask'}</h2><button type="button" data-close aria-label="Close task editor">✕</button></div><label>Title<input name="text" maxlength="300" required value="${esc(current?.text || '')}"></label><label>Notes and instructions<textarea name="notes" maxlength="10000" rows="5" placeholder="Measurements, supplies, setup instructions…">${esc(current?.notes || '')}</textarea></label><label>Due date<input name="due" type="date" value="${esc(current?.due || '')}"></label><label class="task-check"><input name="done" type="checkbox" ${current?.done ? 'checked' : ''}> Completed</label><fieldset><legend>Photos from this event’s Inspiration Gallery</legend><p class="muted">Select any number. The same photo can be used on several tasks.</p><div class="photo-picker">${(e.ideas || []).map((idea, index) => `<label><input type="checkbox" name="photo" value="${esc(idea.id)}" ${(current?.photoIds || []).includes(idea.id) ? 'checked' : ''}><img src="${idea.image}" alt="${esc(idea.caption || idea.category + ' inspiration')}"><span>${esc(idea.caption || idea.category + ' photo ' + (index + 1))}</span></label>`).join('') || '<p class="muted">No gallery photos yet. Upload some below.</p>'}</div></fieldset><label>Upload new photos<input name="uploads" type="file" accept="image/*" multiple></label><p class="muted">New photos are compressed, added to the gallery, and linked here when you save. Unchecking a photo only unlinks it; the gallery keeps it. Existing browser storage limits apply.</p><p class="editor-status" role="status"></p><button class="primary" type="submit">Save task</button></form>`;
    const form = dialog.querySelector('form'); let saving = false;
    const error = message => dialog.querySelector('.editor-status').textContent = message;
    dialog.querySelector('[data-close]').onclick = () => { if (!saving) dialog.close(); };
    dialog.addEventListener('cancel', ev => { if (saving) ev.preventDefault(); });
    dialog.onclose = () => dialog.remove(); document.body.append(dialog); dialog.showModal();
    form.onsubmit = async ev => {
      ev.preventDefault(); if (saving || busy) return;
      const f = new FormData(form), text = String(f.get('text')).trim(); if (!text) return;
      saving = true; form.querySelectorAll('button,input,textarea,select').forEach(input => input.disabled = true); error('Saving task…');
      try {
        const newPhotos = [];
        if ((e.ideas || []).length + form.elements.uploads.files.length > 100) throw Error('This event can hold at most 100 gallery photos. Delete unneeded photos first.');
        for (const file of form.elements.uploads.files) newPhotos.push({id: uid(), image: await compressIdea(file), caption: '', category: 'Other'});
        if ((e.ideas || []).length + newPhotos.length > 100) throw Error('This event can hold at most 100 gallery photos. Delete unneeded photos first.');
        const targetId = id || uid();
        const fields = {text, notes: String(f.get('notes')).trim(), due: String(f.get('due')), done: f.has('done'), photoIds: [...f.getAll('photo'), ...newPhotos.map(photo => photo.id)]};
        const ok = await change(() => {
          const found = id ? locate(id) : null, parent = parentId ? locate(parentId)?.task : null;
          if ((id && !found) || (parentId && !parent)) throw Error('This task is no longer available. Reopen the planner.');
          if (newPhotos.length) e.ideas = [...(e.ideas || []), ...newPhotos];
          if (found) Object.assign(found.task, fields);
          else { parent.subtasks ||= []; parent.subtasks.push({id: targetId, ...fields}); parent.collapsed = false; }
          if (newPhotos.length && JSON.stringify({version: 1, events}).length > IDEA_STORAGE_CHARS) throw Error('Photo storage is nearly full. Export a backup, then remove unneeded gallery photos.');
          validateTaskDetails(e.tasks, e.ideas);
        });
        if (ok) { dialog.close(); refresh(); notify('Task saved.'); }
        else error('Task was not saved. Check browser storage and try again.');
      } catch (err) { error(err.message); }
      finally { saving = false; if (dialog.isConnected) form.querySelectorAll('button,input,textarea,select').forEach(input => input.disabled = false); }
    };
  }
  draw();
}
