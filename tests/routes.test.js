const request = require('supertest');
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Mock database module
jest.mock('../src/db', () => {
  // Create mock functions with the same interface as the real db module
  return {
    initDatabase: jest.fn().mockResolvedValue(),
    ideas: {
      create: jest.fn(idea => Promise.resolve({ ...idea, votes: 0 })),
      getAll: jest.fn(() => Promise.resolve([
        { id: 'idea1', title: 'Idea 1', description: 'Description 1', created_at: Date.now(), votes: 5 },
        { id: 'idea2', title: 'Idea 2', description: 'Description 2', created_at: Date.now(), votes: 3 }
      ])),
      getById: jest.fn((id) => {
        if (id === 'nonexistent') return Promise.resolve(null);
        return Promise.resolve({
          id,
          title: 'Test Idea',
          description: 'Test Description',
          created_at: Date.now(),
          votes: 1,
          notes: [],
          attachments: []
        });
      }),
      update: jest.fn((id, updates) => {
        if (id === 'nonexistent') return Promise.resolve(null);
        return Promise.resolve({
          id,
          ...updates,
          created_at: Date.now(),
          votes: 1,
          notes: [],
          attachments: []
        });
      }),
      upvote: jest.fn((id) => {
        if (id === 'nonexistent') return Promise.resolve(null);
        return Promise.resolve({
          id,
          title: 'Test Idea',
          description: 'Test Description',
          created_at: Date.now(),
          votes: 2,
          notes: [],
          attachments: []
        });
      }),
      delete: jest.fn((id) => {
        if (id === 'nonexistent') return Promise.resolve({ deleted: false });
        return Promise.resolve({ deleted: true });
      })
    },
    notes: {
      create: jest.fn(note => Promise.resolve(note)),
      getByIdeaId: jest.fn((ideaId) => Promise.resolve([
        { id: 'note1', idea_id: ideaId, content: 'Test note', created_at: Date.now() }
      ])),
      delete: jest.fn((id) => {
        if (id === 'nonexistent') return Promise.resolve({ deleted: false });
        return Promise.resolve({ deleted: true });
      })
    },
    attachments: {
      create: jest.fn(attachment => Promise.resolve(attachment)),
      getByIdeaId: jest.fn((ideaId) => Promise.resolve([
        {
          id: 'attachment1',
          idea_id: ideaId,
          filename: 'test.txt',
          filepath: '/uploads/test.txt',
          mimetype: 'text/plain',
          created_at: Date.now()
        }
      ])),
      getById: jest.fn((id) => {
        if (id === 'nonexistent') return Promise.resolve(null);
        return Promise.resolve({
          id,
          idea_id: 'idea1',
          filename: 'test.txt',
          filepath: '/uploads/test.txt',
          mimetype: 'text/plain',
          created_at: Date.now()
        });
      }),
      delete: jest.fn((id) => {
        if (id === 'nonexistent') return Promise.resolve({ deleted: false });
        return Promise.resolve({ deleted: true });
      })
    }
  };
});

// Mock UUID for predictable IDs
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

// Mock file system
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true),
  unlinkSync: jest.fn()
}));

// Create a test app with our routes
const routes = require('../src/routes');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
app.use('/api', routes);

describe('API Routes', () => {
  describe('Ideas Endpoints', () => {
    test('GET /api/ideas should return all ideas', async () => {
      const response = await request(app).get('/api/ideas');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    test('GET /api/ideas/:id should return a single idea', async () => {
      const response = await request(app).get('/api/ideas/idea1');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'idea1');
      expect(response.body).toHaveProperty('title', 'Test Idea');
    });

    test('GET /api/ideas/:id should return 404 for nonexistent idea', async () => {
      const response = await request(app).get('/api/ideas/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Idea not found');
    });

    test('POST /api/ideas should create a new idea', async () => {
      const response = await request(app)
        .post('/api/ideas')
        .send({
          title: 'New Idea',
          description: 'New idea description'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'test-uuid');
      expect(response.body).toHaveProperty('title', 'New Idea');
      expect(response.body).toHaveProperty('description', 'New idea description');
    });

    test('POST /api/ideas should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/ideas')
        .send({
          description: 'Missing title'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title is required');
    });

    test('PUT /api/ideas/:id should update an idea', async () => {
      const response = await request(app)
        .put('/api/ideas/idea1')
        .send({
          title: 'Updated Title',
          description: 'Updated description'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'idea1');
      expect(response.body).toHaveProperty('title', 'Updated Title');
      expect(response.body).toHaveProperty('description', 'Updated description');
    });

    test('PUT /api/ideas/:id should return 404 for nonexistent idea', async () => {
      const response = await request(app)
        .put('/api/ideas/nonexistent')
        .send({
          title: 'Updated Title'
        });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Idea not found');
    });

    test('POST /api/ideas/:id/upvote should upvote an idea', async () => {
      const response = await request(app)
        .post('/api/ideas/idea1/upvote');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'idea1');
      expect(response.body).toHaveProperty('votes', 2);
    });

    test('POST /api/ideas/:id/upvote should return 404 for nonexistent idea', async () => {
      const response = await request(app)
        .post('/api/ideas/nonexistent/upvote');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Idea not found');
    });

    test('DELETE /api/ideas/:id should delete an idea', async () => {
      const response = await request(app)
        .delete('/api/ideas/idea1');
      
      expect(response.status).toBe(204);
    });

    test('DELETE /api/ideas/:id should return 404 for nonexistent idea', async () => {
      const response = await request(app)
        .delete('/api/ideas/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Idea not found');
    });
  });

  describe('Notes Endpoints', () => {
    test('GET /api/ideas/:ideaId/notes should return notes for an idea', async () => {
      const response = await request(app).get('/api/ideas/idea1/notes');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('idea_id', 'idea1');
    });

    test('POST /api/ideas/:ideaId/notes should add a note to an idea', async () => {
      const response = await request(app)
        .post('/api/ideas/idea1/notes')
        .send({
          content: 'New test note'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'test-uuid');
      expect(response.body).toHaveProperty('idea_id', 'idea1');
      expect(response.body).toHaveProperty('content', 'New test note');
    });

    test('DELETE /api/notes/:id should delete a note', async () => {
      const response = await request(app)
        .delete('/api/notes/note1');
      
      expect(response.status).toBe(204);
    });
  });

  describe('Attachments Endpoints', () => {
    test('GET /api/ideas/:ideaId/attachments should return attachments for an idea', async () => {
      const response = await request(app).get('/api/ideas/idea1/attachments');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('idea_id', 'idea1');
    });

    test('DELETE /api/attachments/:id should delete an attachment', async () => {
      const response = await request(app)
        .delete('/api/attachments/attachment1');
      
      expect(response.status).toBe(204);
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });
});