const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { ideas, notes, attachments } = require('./db');

// Configure upload directory
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// GET all ideas
router.get('/ideas', async (req, res) => {
  try {
    const allIdeas = await ideas.getAll();
    res.json(allIdeas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

// GET a single idea by ID
router.get('/ideas/:id', async (req, res) => {
  try {
    const idea = await ideas.getById(req.params.id);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    res.json(idea);
  } catch (error) {
    console.error('Error fetching idea:', error);
    res.status(500).json({ error: 'Failed to fetch idea' });
  }
});

// POST a new idea
router.post('/ideas', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const newIdea = {
      id: uuidv4(),
      title,
      description: description || '',
      created_at: Date.now()
    };
    
    const created = await ideas.create(newIdea);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating idea:', error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

// PUT/update an idea
router.put('/ideas/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    const updates = {};
    
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    
    const updated = await ideas.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ error: 'Failed to update idea' });
  }
});

// POST to upvote an idea
router.post('/ideas/:id/upvote', async (req, res) => {
  try {
    const upvoted = await ideas.upvote(req.params.id);
    if (!upvoted) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    res.json(upvoted);
  } catch (error) {
    console.error('Error upvoting idea:', error);
    res.status(500).json({ error: 'Failed to upvote idea' });
  }
});

// DELETE an idea
router.delete('/ideas/:id', async (req, res) => {
  try {
    const result = await ideas.delete(req.params.id);
    if (!result.deleted) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

// POST a new note to an idea
router.post('/ideas/:ideaId/notes', async (req, res) => {
  try {
    const { content } = req.body;
    const { ideaId } = req.params;
    
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'Note content is required' });
    }
    
    // Check if idea exists
    const idea = await ideas.getById(ideaId);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    const newNote = {
      id: uuidv4(),
      idea_id: ideaId,
      content,
      created_at: Date.now()
    };
    
    const created = await notes.create(newNote);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// GET all notes for an idea
router.get('/ideas/:ideaId/notes', async (req, res) => {
  try {
    const { ideaId } = req.params;
    
    // Check if idea exists
    const idea = await ideas.getById(ideaId);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    const ideaNotes = await notes.getByIdeaId(ideaId);
    res.json(ideaNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// DELETE a note
router.delete('/notes/:id', async (req, res) => {
  try {
    const result = await notes.delete(req.params.id);
    if (!result.deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// POST a new file attachment to an idea
router.post('/ideas/:ideaId/attachments', async (req, res) => {
  try {
    const { ideaId } = req.params;
    
    // Check if idea exists
    const idea = await ideas.getById(ideaId);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = req.files.file;
    const fileId = uuidv4();
    const fileExt = path.extname(file.name);
    const filename = `${fileId}${fileExt}`;
    const filepath = path.join(uploadDir, filename);
    
    // Move the file to upload directory
    file.mv(filepath, async (err) => {
      if (err) {
        console.error('Error moving file:', err);
        return res.status(500).json({ error: 'Failed to upload file' });
      }
      
      const newAttachment = {
        id: fileId,
        idea_id: ideaId,
        filename: file.name,
        filepath: `/uploads/${filename}`,
        mimetype: file.mimetype,
        created_at: Date.now()
      };
      
      const created = await attachments.create(newAttachment);
      res.status(201).json(created);
    });
  } catch (error) {
    console.error('Error adding attachment:', error);
    res.status(500).json({ error: 'Failed to add attachment' });
  }
});

// GET all attachments for an idea
router.get('/ideas/:ideaId/attachments', async (req, res) => {
  try {
    const { ideaId } = req.params;
    
    // Check if idea exists
    const idea = await ideas.getById(ideaId);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    const ideaAttachments = await attachments.getByIdeaId(ideaId);
    res.json(ideaAttachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

// DELETE an attachment
router.delete('/attachments/:id', async (req, res) => {
  try {
    // Get attachment to find the file path
    const attachment = await attachments.getById(req.params.id);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Delete the file
    const filePath = path.join(__dirname, '..', attachment.filepath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete the database record
    const result = await attachments.delete(req.params.id);
    if (!result.deleted) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

module.exports = router;