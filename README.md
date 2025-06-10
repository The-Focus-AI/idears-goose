# Idears - Idea Collection System

Idears is a web application for collecting, voting on, and organizing ideas. Users can submit new ideas, vote on existing ones, add notes, and attach files to provide more details.

## Features

- Create and manage ideas with titles and descriptions
- Upvote ideas to move them up in the list
- Add notes to ideas for additional context
- Attach files to ideas (documents, images, etc.)
- Responsive web interface for desktop and mobile
- Persistent storage using SQLite database
- API for integration with other systems

## Technologies Used

- Node.js and Express.js for the backend
- SQLite for data storage
- Vanilla JavaScript, HTML, and CSS for the frontend
- Bootstrap for UI components
- Docker for containerization

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Docker](https://www.docker.com/) (for containerized deployment)

## Installation and Setup

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/yourusername/idears.git
cd idears
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3001

### Docker Deployment

1. Build and start the Docker container:

```bash
docker-compose up -d
```

The application will be available at http://localhost:3001

## Data Persistence

Data is stored in a SQLite database file located in the `data` directory. When running with Docker, this directory is mounted as a volume to ensure data persistence between container restarts.

Uploaded files are stored in the `uploads` directory, which is also mounted as a volume in Docker.

## Testing

Run the test suite with:

```bash
npm test
```

This will run all unit tests and generate a coverage report.

## API Documentation

### Ideas

- `GET /api/ideas` - Get all ideas (sorted by votes)
- `GET /api/ideas/:id` - Get a specific idea by ID
- `POST /api/ideas` - Create a new idea
- `PUT /api/ideas/:id` - Update an idea
- `POST /api/ideas/:id/upvote` - Upvote an idea
- `DELETE /api/ideas/:id` - Delete an idea

### Notes

- `GET /api/ideas/:ideaId/notes` - Get all notes for an idea
- `POST /api/ideas/:ideaId/notes` - Add a note to an idea
- `DELETE /api/notes/:id` - Delete a note

### Attachments

- `GET /api/ideas/:ideaId/attachments` - Get all attachments for an idea
- `POST /api/ideas/:ideaId/attachments` - Upload a file attachment to an idea
- `DELETE /api/attachments/:id` - Delete an attachment

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request