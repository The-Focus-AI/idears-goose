document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const newIdeaBtn = document.getElementById('new-idea-btn');
  const newIdeaForm = document.getElementById('new-idea-form');
  const ideaForm = document.getElementById('idea-form');
  const cancelIdeaBtn = document.getElementById('cancel-idea-btn');
  const ideasContainer = document.getElementById('ideas-container');
  const loadingEl = document.getElementById('loading');
  const noIdeasEl = document.getElementById('no-ideas');
  const ideaDetailModal = new bootstrap.Modal(document.getElementById('idea-detail-modal'));
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const notesContainer = document.getElementById('notes-container');
  const addNoteForm = document.getElementById('add-note-form');
  const attachmentsContainer = document.getElementById('attachments-container');
  const uploadFileForm = document.getElementById('upload-file-form');

  // State
  let currentIdea = null;

  // Event Listeners
  newIdeaBtn.addEventListener('click', () => {
    newIdeaForm.style.display = 'block';
    ideasContainer.style.display = 'none';
  });

  cancelIdeaBtn.addEventListener('click', () => {
    newIdeaForm.style.display = 'none';
    ideasContainer.style.display = 'block';
    ideaForm.reset();
  });

  ideaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('idea-title').value.trim();
    const description = document.getElementById('idea-description').value.trim();

    if (!title) return;

    try {
      await createIdea({ title, description });
      newIdeaForm.style.display = 'none';
      ideasContainer.style.display = 'block';
      ideaForm.reset();
      await loadIdeas();
    } catch (error) {
      console.error('Error creating idea:', error);
      alert('Failed to create idea. Please try again.');
    }
  });

  addNoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('note-content').value.trim();

    if (!content || !currentIdea) return;

    try {
      await addNoteToIdea(currentIdea.id, content);
      document.getElementById('note-content').value = '';
      await loadIdeaDetails(currentIdea.id);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note. Please try again.');
    }
  });

  uploadFileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];

    if (!file || !currentIdea) return;

    try {
      await uploadAttachment(currentIdea.id, file);
      fileInput.value = '';
      await loadIdeaDetails(currentIdea.id);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    }
  });

  // API Functions
  async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  async function loadIdeas() {
    try {
      loadingEl.style.display = 'block';
      noIdeasEl.style.display = 'none';
      
      // Clear existing ideas
      const ideasElements = ideasContainer.querySelectorAll('.col-md-4');
      ideasElements.forEach(el => el.remove());
      
      const ideas = await fetchAPI('/ideas');
      loadingEl.style.display = 'none';
      
      if (ideas.length === 0) {
        noIdeasEl.style.display = 'block';
        return;
      }
      
      // Render ideas
      ideas.forEach(idea => renderIdeaCard(idea));
    } catch (error) {
      console.error('Error loading ideas:', error);
      loadingEl.style.display = 'none';
      alert('Failed to load ideas. Please refresh the page.');
    }
  }

  function renderIdeaCard(idea) {
    const ideaEl = document.createElement('div');
    ideaEl.className = 'col-md-4 mb-4';
    ideaEl.innerHTML = `
      <div class="card idea-card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title">${escapeHtml(idea.title)}</h5>
            <div class="d-flex flex-column align-items-center">
              <button class="vote-btn" data-idea-id="${idea.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-arrow-up-circle" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-7.5 3.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707z"/>
                </svg>
              </button>
              <span class="vote-count">${idea.votes}</span>
            </div>
          </div>
          <p class="card-text">${escapeHtml(idea.description || '').substring(0, 100)}${idea.description && idea.description.length > 100 ? '...' : ''}</p>
          <div class="text-muted small">${formatDate(idea.created_at)}</div>
        </div>
      </div>
    `;

    // Add event listeners
    ideaEl.querySelector('.idea-card').addEventListener('click', (e) => {
      openIdeaDetails(idea.id);
    });

    ideaEl.querySelector('.vote-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await upvoteIdea(idea.id);
        await loadIdeas();
      } catch (error) {
        console.error('Error upvoting idea:', error);
      }
    });

    ideasContainer.appendChild(ideaEl);
  }

  async function openIdeaDetails(ideaId) {
    try {
      await loadIdeaDetails(ideaId);
      ideaDetailModal.show();
    } catch (error) {
      console.error('Error opening idea details:', error);
      alert('Failed to load idea details. Please try again.');
    }
  }

  async function loadIdeaDetails(ideaId) {
    try {
      const idea = await fetchAPI(`/ideas/${ideaId}`);
      currentIdea = idea;
      
      // Update modal content
      modalTitle.textContent = idea.title;
      modalDescription.textContent = idea.description || 'No description provided.';
      
      // Render notes
      renderNotes(idea.notes);
      
      // Render attachments
      renderAttachments(idea.attachments);
    } catch (error) {
      console.error('Error loading idea details:', error);
      throw error;
    }
  }

  function renderNotes(notes) {
    notesContainer.innerHTML = '';
    
    if (!notes || notes.length === 0) {
      notesContainer.innerHTML = '<p class="text-muted">No notes yet.</p>';
      return;
    }
    
    notes.forEach(note => {
      const noteEl = document.createElement('div');
      noteEl.className = 'note-item';
      noteEl.innerHTML = `
        <p>${escapeHtml(note.content)}</p>
        <div class="note-meta d-flex justify-content-between">
          <span>${formatDate(note.created_at)}</span>
          <button class="btn btn-sm text-danger delete-note" data-note-id="${note.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
              <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>
          </button>
        </div>
      `;
      
      // Add delete note event listener
      noteEl.querySelector('.delete-note').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this note?')) {
          try {
            await deleteNote(note.id);
            await loadIdeaDetails(currentIdea.id);
          } catch (error) {
            console.error('Error deleting note:', error);
            alert('Failed to delete note. Please try again.');
          }
        }
      });
      
      notesContainer.appendChild(noteEl);
    });
  }

  function renderAttachments(attachments) {
    attachmentsContainer.innerHTML = '';
    
    if (!attachments || attachments.length === 0) {
      attachmentsContainer.innerHTML = '<p class="text-muted">No attachments yet.</p>';
      return;
    }
    
    attachments.forEach(attachment => {
      const attachmentEl = document.createElement('div');
      attachmentEl.className = 'attachment-item';
      attachmentEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark" viewBox="0 0 16 16">
          <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/>
        </svg>
        <a href="${attachment.filepath}" class="attachment-name" target="_blank">${escapeHtml(attachment.filename)}</a>
        <button class="btn btn-sm text-danger delete-attachment" data-attachment-id="${attachment.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
          </svg>
        </button>
      `;
      
      // Add delete attachment event listener
      attachmentEl.querySelector('.delete-attachment').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this attachment?')) {
          try {
            await deleteAttachment(attachment.id);
            await loadIdeaDetails(currentIdea.id);
          } catch (error) {
            console.error('Error deleting attachment:', error);
            alert('Failed to delete attachment. Please try again.');
          }
        }
      });
      
      attachmentsContainer.appendChild(attachmentEl);
    });
  }

  // API actions
  async function createIdea(ideaData) {
    return fetchAPI('/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ideaData)
    });
  }

  async function upvoteIdea(ideaId) {
    return fetchAPI(`/ideas/${ideaId}/upvote`, { method: 'POST' });
  }

  async function addNoteToIdea(ideaId, content) {
    return fetchAPI(`/ideas/${ideaId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  }

  async function deleteNote(noteId) {
    return fetchAPI(`/notes/${noteId}`, { method: 'DELETE' });
  }

  async function uploadAttachment(ideaId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`/api/ideas/${ideaId}/attachments`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API request failed with status ${response.status}`);
    }
    
    return response.json();
  }

  async function deleteAttachment(attachmentId) {
    return fetchAPI(`/attachments/${attachmentId}`, { method: 'DELETE' });
  }

  // Utility Functions
  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize the app
  loadIdeas();
});