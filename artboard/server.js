 
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

const db = new sqlite3.Database('database.db');

// Create tables for posts, replies, and images
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS replies (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER, content TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS images (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, filename TEXT, path TEXT)');
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Specify the directory where uploaded files will be stored
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original filename for the uploaded file
  }
});

const upload = multer({ storage: storage });

 

app.get('/api/posts', (req, res) => {
  db.all('SELECT posts.*, images.path FROM posts LEFT JOIN images ON posts.id = images.post_id', (err, posts) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve posts' });
    } else {
      const postsWithReplies = [];

      posts.forEach((post, index) => {
        db.all('SELECT * FROM replies WHERE parent_id = ? ORDER BY id ASC', post.id, (err, replies) => {
          if (err) {
            console.error(err);
          } else {
            const postWithImage = {
              id: post.id,
              content: post.content,
              replies: replies,
              image: {
                filename: post.filename,
                path: post.path
              }
            };
 
            postsWithReplies.push(postWithImage);

            if (index === posts.length - 1) {
              res.json(postsWithReplies);
            }
          }
        });
      });
    }
  });
});


app.post('/api/posts', upload.single('image'), (req, res) => {
  const { content } = req.body;

  if (req.file) {
    const { filename, path } = req.file;

    db.run('INSERT INTO posts (content) VALUES (?)', content, function (err) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create post' });
      } else {
        const post_id = this.lastID;

        db.run('INSERT INTO images (post_id, filename, path) VALUES (?, ?, ?)', [post_id, filename, path], function (err) {
          if (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to upload image' });
          } else {
            res.json({ post_id: post_id, image_id: this.lastID });
          }
        });
      }
    });
  } else {
    db.run('INSERT INTO posts (content) VALUES (?)', content, function (err) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create post' });
      } else {
        res.json({ post_id: this.lastID });
      }
    });
  }
});


app.post('/api/posts', upload.single('image'), (req, res) => {
  const { content } = req.body;
  const { filename, path } = req.file;

  if (req.file) {
    db.run('INSERT INTO posts (content) VALUES (?)', content, function (err) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create post' });
      } else {
        const post_id = this.lastID;

        db.run('INSERT INTO images (post_id, filename, path) VALUES (?, ?, ?)', [post_id, filename, path], function (err) {
          if (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to upload image' });
          } else {
            res.json({ post_id: post_id, image_id: this.lastID });
          }
        });
      }
    });
  } else {
    db.run('INSERT INTO posts (content) VALUES (?)', content, function (err) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create post' });
      } else {
        res.json({ post_id: this.lastID });
      }
    });
  }
});
 
app.post('/api/posts/:postId/replies', (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  db.run('INSERT INTO replies (parent_id, content) VALUES (?, ?)', [postId, content], function (err) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create reply' });
    } else {
      res.json({ reply_id: this.lastID });
    }
  });
});

let port = "2";

app.listen(port, () => {
  console.log('Server started on port ' + port);
});

 