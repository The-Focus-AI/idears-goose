const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'idears.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Ideas table
      db.run(`CREATE TABLE IF NOT EXISTS ideas (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        votes INTEGER DEFAULT 0
      )`);

      // Notes table
      db.run(`CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        idea_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
      )`);

      // Attachments table
      db.run(`CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        idea_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        mimetype TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Ideas CRUD operations
const ideas = {
  // Create a new idea
  create: (idea) => {
    return new Promise((resolve, reject) => {
      const { id, title, description, created_at } = idea;
      db.run(
        'INSERT INTO ideas (id, title, description, created_at, votes) VALUES (?, ?, ?, ?, 0)',
        [id, title, description, created_at],
        function (err) {
          if (err) return reject(err);
          resolve({ id, title, description, created_at, votes: 0 });
        }
      );
    });
  },

  // Get all ideas sorted by votes (descending)
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM ideas ORDER BY votes DESC, created_at DESC', (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  // Get a single idea by ID
  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM ideas WHERE id = ?', [id], (err, idea) => {
        if (err) return reject(err);
        if (!idea) return resolve(null);
        
        // Get notes for this idea
        db.all('SELECT * FROM notes WHERE idea_id = ? ORDER BY created_at DESC', [id], (err, notes) => {
          if (err) return reject(err);
          
          // Get attachments for this idea
          db.all('SELECT * FROM attachments WHERE idea_id = ? ORDER BY created_at DESC', [id], (err, attachments) => {
            if (err) return reject(err);
            
            idea.notes = notes || [];
            idea.attachments = attachments || [];
            resolve(idea);
          });
        });
      });
    });
  },

  // Update an idea
  update: (id, updates) => {
    return new Promise((resolve, reject) => {
      const allowedUpdates = ['title', 'description'];
      const updateFields = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .map(key => `${key} = ?`);
      
      if (updateFields.length === 0) return resolve(null);
      
      const values = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .map(key => updates[key]);
      
      values.push(id);
      
      db.run(
        `UPDATE ideas SET ${updateFields.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) return reject(err);
          if (this.changes === 0) return resolve(null);
          
          ideas.getById(id)
            .then(resolve)
            .catch(reject);
        }
      );
    });
  },

  // Upvote an idea
  upvote: (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE ideas SET votes = votes + 1 WHERE id = ?',
        [id],
        function (err) {
          if (err) return reject(err);
          if (this.changes === 0) return resolve(null);
          
          ideas.getById(id)
            .then(resolve)
            .catch(reject);
        }
      );
    });
  },

  // Delete an idea
  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM ideas WHERE id = ?', [id], function (err) {
        if (err) return reject(err);
        resolve({ deleted: this.changes > 0 });
      });
    });
  }
};

// Notes CRUD operations
const notes = {
  // Add a note to an idea
  create: (note) => {
    return new Promise((resolve, reject) => {
      const { id, idea_id, content, created_at } = note;
      db.run(
        'INSERT INTO notes (id, idea_id, content, created_at) VALUES (?, ?, ?, ?)',
        [id, idea_id, content, created_at],
        function (err) {
          if (err) return reject(err);
          resolve({ id, idea_id, content, created_at });
        }
      );
    });
  },

  // Get all notes for an idea
  getByIdeaId: (ideaId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM notes WHERE idea_id = ? ORDER BY created_at DESC',
        [ideaId],
        (err, notes) => {
          if (err) return reject(err);
          resolve(notes);
        }
      );
    });
  },

  // Delete a note
  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM notes WHERE id = ?', [id], function (err) {
        if (err) return reject(err);
        resolve({ deleted: this.changes > 0 });
      });
    });
  }
};

// Attachments CRUD operations
const attachments = {
  // Add an attachment to an idea
  create: (attachment) => {
    return new Promise((resolve, reject) => {
      const { id, idea_id, filename, filepath, mimetype, created_at } = attachment;
      db.run(
        'INSERT INTO attachments (id, idea_id, filename, filepath, mimetype, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, idea_id, filename, filepath, mimetype, created_at],
        function (err) {
          if (err) return reject(err);
          resolve({ id, idea_id, filename, filepath, mimetype, created_at });
        }
      );
    });
  },

  // Get all attachments for an idea
  getByIdeaId: (ideaId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM attachments WHERE idea_id = ? ORDER BY created_at DESC',
        [ideaId],
        (err, attachments) => {
          if (err) return reject(err);
          resolve(attachments);
        }
      );
    });
  },

  // Get a single attachment by ID
  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM attachments WHERE id = ?', [id], (err, attachment) => {
        if (err) return reject(err);
        resolve(attachment);
      });
    });
  },

  // Delete an attachment
  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM attachments WHERE id = ?', [id], function (err) {
        if (err) return reject(err);
        resolve({ deleted: this.changes > 0 });
      });
    });
  }
};

module.exports = {
  initDatabase,
  ideas,
  notes,
  attachments,
  db
};