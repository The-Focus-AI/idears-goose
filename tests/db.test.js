const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { initDatabase, ideas, notes, attachments, db } = require('../src/db');

// Create a test database path
const testDbPath = path.join(__dirname, 'test.db');

// Mock the database path for testing
jest.mock('../src/db', () => {
  const sqlite3 = require('sqlite3').verbose();
  const originalModule = jest.requireActual('../src/db');
  
  // Create a test database
  const testDb = new sqlite3.Database(':memory:');
  
  return {
    ...originalModule,
    db: testDb
  };
});

describe('Database Operations', () => {
  beforeAll(async () => {
    // Initialize test database
    await initDatabase();
  });

  afterAll(() => {
    // Close database connection
    db.close();
    
    // Remove test database file if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Ideas', () => {
    let testIdeaId;

    test('should create a new idea', async () => {
      const testIdea = {
        id: uuidv4(),
        title: 'Test Idea',
        description: 'This is a test idea',
        created_at: Date.now()
      };
      
      const created = await ideas.create(testIdea);
      testIdeaId = created.id;
      
      expect(created).toEqual({
        ...testIdea,
        votes: 0
      });
    });

    test('should get all ideas', async () => {
      const allIdeas = await ideas.getAll();
      
      expect(Array.isArray(allIdeas)).toBe(true);
      expect(allIdeas.length).toBeGreaterThan(0);
      expect(allIdeas[0]).toHaveProperty('id');
      expect(allIdeas[0]).toHaveProperty('title');
      expect(allIdeas[0]).toHaveProperty('votes');
    });

    test('should get an idea by ID', async () => {
      const idea = await ideas.getById(testIdeaId);
      
      expect(idea).toHaveProperty('id', testIdeaId);
      expect(idea).toHaveProperty('title', 'Test Idea');
      expect(idea).toHaveProperty('description', 'This is a test idea');
      expect(idea).toHaveProperty('votes', 0);
      expect(idea).toHaveProperty('notes');
      expect(idea).toHaveProperty('attachments');
      expect(Array.isArray(idea.notes)).toBe(true);
      expect(Array.isArray(idea.attachments)).toBe(true);
    });

    test('should update an idea', async () => {
      const updates = {
        title: 'Updated Test Idea',
        description: 'This is an updated test idea'
      };
      
      const updated = await ideas.update(testIdeaId, updates);
      
      expect(updated).toHaveProperty('id', testIdeaId);
      expect(updated).toHaveProperty('title', 'Updated Test Idea');
      expect(updated).toHaveProperty('description', 'This is an updated test idea');
    });

    test('should upvote an idea', async () => {
      const upvoted = await ideas.upvote(testIdeaId);
      
      expect(upvoted).toHaveProperty('id', testIdeaId);
      expect(upvoted).toHaveProperty('votes', 1);
    });

    test('should delete an idea', async () => {
      const result = await ideas.delete(testIdeaId);
      
      expect(result).toHaveProperty('deleted', true);
      
      // Verify it's gone
      const idea = await ideas.getById(testIdeaId);
      expect(idea).toBeNull();
    });
  });

  describe('Notes', () => {
    let testIdeaId;
    let testNoteId;

    beforeAll(async () => {
      // Create a test idea first
      const testIdea = {
        id: uuidv4(),
        title: 'Idea with Notes',
        description: 'Testing notes functionality',
        created_at: Date.now()
      };
      
      const created = await ideas.create(testIdea);
      testIdeaId = created.id;
    });

    test('should add a note to an idea', async () => {
      const testNote = {
        id: uuidv4(),
        idea_id: testIdeaId,
        content: 'This is a test note',
        created_at: Date.now()
      };
      
      const created = await notes.create(testNote);
      testNoteId = created.id;
      
      expect(created).toEqual(testNote);
    });

    test('should get notes for an idea', async () => {
      const ideaNotes = await notes.getByIdeaId(testIdeaId);
      
      expect(Array.isArray(ideaNotes)).toBe(true);
      expect(ideaNotes.length).toBeGreaterThan(0);
      expect(ideaNotes[0]).toHaveProperty('id');
      expect(ideaNotes[0]).toHaveProperty('idea_id', testIdeaId);
      expect(ideaNotes[0]).toHaveProperty('content');
    });

    test('should delete a note', async () => {
      const result = await notes.delete(testNoteId);
      
      expect(result).toHaveProperty('deleted', true);
      
      // Verify it's gone
      const ideaNotes = await notes.getByIdeaId(testIdeaId);
      expect(ideaNotes.length).toBe(0);
    });
  });
});