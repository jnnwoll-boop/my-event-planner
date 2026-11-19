'use strict';
// Existing tasks retain text/due/done; optional fields make old backups compatible.
function validateTaskDetails(tasks, ideas) {
  const ids = new Set();
  const photos = new Set((ideas || []).map(idea => idea.id));
  function check(task, child) {
    if (ids.has(task.id)) throw Error('Duplicate task ID');
    ids.add(task.id);
    if (task.notes !== undefined && (typeof task.notes !== 'string' || task.notes.length > 10000)) throw Error('Invalid task notes');
    if (task.details !== undefined && (!Array.isArray(task.details) || task.details.length > 200 || task.details.some(item => !item || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 500 || !['bullet','check'].includes(item.kind) || typeof item.done !== 'boolean' || (item.kind === 'bullet' && item.done)))) throw Error('Invalid task details');
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
    const details = task.details || [], checks = details.filter(item => item.kind === 'check');
    const detailMarkup = details.length ? `<div class="task-details"><ul>${details.map((item,i) => `<li class="${item.kind === 'check' ? 'detail-check' : 'detail-bullet'}">${item.kind === 'check' ? `<label><input type="checkbox" data-detail-owner="${esc(task.id)}" data-detail-index="${i}" ${item.done ? 'checked' : ''}><span class="${item.done ? 'completed-title' : ''}">${esc(item.text)}</span></label>` : `<span>${esc(item.text)}</span>`}</li>`).join('')}</ul>${checks.length ? `<small>${checks.filter(item => item.done).length} of ${checks.length} checklist items complete</small>` : ''}</div>` : '';
    const index = list.indexOf(task);
    return `<article class="${child ? 'subtask' : 'task'} task-node" data-node="${esc(task.id)}"><div class="task-heading"><input type="checkbox" data-complete="${esc(task.id)}" aria-label="Complete ${esc(task.text)}" ${task.done ? 'checked' : ''}><div><h3 class="${task.done ? 'completed-title' : ''}">${esc(task.text)}</h3><small>${date(task.due)}</small></div></div>
      ${task.notes ? `<p class="task-notes">${esc(task.notes)}</p>` : ''}${detailMarkup}${photoMarkup(task)}
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
    container.querySelectorAll('[data-detail-index]').forEach(input => input.onchange = async () => {
      const value = input.checked, owner = input.dataset.detailOwner, index = Number(input.dataset.detailIndex);
      if (await change(() => { const item = locate(owner).task.details[index]; if (item.kind !== 'check') throw Error('Invalid checklist item'); item.done = value; })) refresh(); else input.checked = !value;
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
        const resetDetails = node => (node.details || []).forEach(item => item.done = false);
        resetDetails(copy);
        if (copy.subtasks) copy.subtasks.forEach(sub => { sub.id = uid(); sub.done = false; resetDetails(sub); });
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
    const details = structuredClone(current?.details || []);
    const detailEditor = document.createElement('fieldset');
    detailEditor.innerHTML = '<legend>Bullets and checklist</legend><p class="muted">Add separate items to check off, or bullets for information. Each line in the box below becomes an item.</p><div data-detail-rows></div><label>New items (one per line)<textarea data-new-details rows="3" maxlength="100000" placeholder="5 mason jars&#10;White paint&#10;Twine"></textarea></label><div class="detail-add"><button type="button" data-add-kind="check">+ Checklist items</button><button type="button" data-add-kind="bullet">+ Bullets</button></div><button type="button" data-copy-notes>Copy notes into items</button>';
    form.querySelector('[name="notes"]').closest('label').after(detailEditor);
    const rows = detailEditor.querySelector('[data-detail-rows]');
    function drawDetails() {
      rows.innerHTML = details.map((item,i) => `<div class="detail-editor-row"><label>Item ${i+1}<input data-detail-text="${i}" maxlength="500" value="${esc(item.text)}" required></label><label>Type<select data-detail-kind="${i}"><option value="check" ${item.kind==='check'?'selected':''}>Checkbox</option><option value="bullet" ${item.kind==='bullet'?'selected':''}>Bullet</option></select></label><div class="detail-editor-actions">${item.kind==='check'?`<label class="detail-done"><input type="checkbox" data-detail-done="${i}" ${item.done?'checked':''}> Done</label>`:''}<button type="button" data-detail-move="${i}" data-direction="-1" ${i===0?'disabled':''} aria-label="Move item ${i+1} up">↑</button><button type="button" data-detail-move="${i}" data-direction="1" ${i===details.length-1?'disabled':''} aria-label="Move item ${i+1} down">↓</button><button type="button" data-detail-remove="${i}" class="danger">Remove</button></div></div>`).join('');
      rows.querySelectorAll('[data-detail-text]').forEach(input => input.oninput = () => details[Number(input.dataset.detailText)].text = input.value);
      rows.querySelectorAll('[data-detail-kind]').forEach(input => input.onchange = () => { const item=details[Number(input.dataset.detailKind)];item.kind=input.value;if(item.kind==='bullet')item.done=false;drawDetails(); });
      rows.querySelectorAll('[data-detail-done]').forEach(input => input.onchange = () => details[Number(input.dataset.detailDone)].done=input.checked);
      rows.querySelectorAll('[data-detail-move]').forEach(button => button.onclick=()=>{const i=Number(button.dataset.detailMove),j=i+Number(button.dataset.direction);if(j>=0&&j<details.length){[details[i],details[j]]=[details[j],details[i]];drawDetails();}});
      rows.querySelectorAll('[data-detail-remove]').forEach(button=>button.onclick=()=>{details.splice(Number(button.dataset.detailRemove),1);drawDetails();});
    }
    function addDetails(raw,kind) {
      const lines=raw.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
      if(details.length+lines.length>200 || lines.some(line=>line.length>500)){error('Use at most 200 items, up to 500 characters each.');return false;}
      for(const text of lines) details.push({text,kind,done:false});
      drawDetails();return true;
    }
    const newDetails=detailEditor.querySelector('[data-new-details]');
    detailEditor.querySelectorAll('[data-add-kind]').forEach(button=>button.onclick=()=>{if(addDetails(newDetails.value,button.dataset.addKind))newDetails.value='';});
    detailEditor.querySelector('[data-copy-notes]').onclick=()=>{if(confirm('Copy each nonempty note line into a checklist item? The original notes will stay unchanged.'))addDetails(form.elements.notes.value,'check');};
    drawDetails();
    const error = message => dialog.querySelector('.editor-status').textContent = message;
    dialog.querySelector('[data-close]').onclick = () => { if (!saving) dialog.close(); };
    dialog.addEventListener('cancel', ev => { if (saving) ev.preventDefault(); });
    dialog.onclose = () => dialog.remove(); document.body.append(dialog); dialog.showModal();
    form.onsubmit = async ev => {
      ev.preventDefault(); if (saving || busy) return;
      const f = new FormData(form), text = String(f.get('text')).trim(); if (!text) return;
      if(newDetails.value.trim()){error('Choose Checklist items or Bullets to add your new lines before saving.');return;}
      if(details.some(item=>!item.text.trim())){error('Fill in or remove empty detail items.');return;}
      saving = true; form.querySelectorAll('button,input,textarea,select').forEach(input => input.disabled = true); error('Saving task…');
      try {
        const newPhotos = [];
        if ((e.ideas || []).length + form.elements.uploads.files.length > 100) throw Error('This event can hold at most 100 gallery photos. Delete unneeded photos first.');
        for (const file of form.elements.uploads.files) newPhotos.push({id: uid(), image: await compressIdea(file), caption: '', category: 'Other'});
        if ((e.ideas || []).length + newPhotos.length > 100) throw Error('This event can hold at most 100 gallery photos. Delete unneeded photos first.');
        const targetId = id || uid();
        const fields = {text, notes: String(f.get('notes')).trim(), due: String(f.get('due')), done: f.has('done'), details: details.map(item=>({...item,text:item.text.trim()})), photoIds: [...f.getAll('photo'), ...newPhotos.map(photo => photo.id)]};
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
