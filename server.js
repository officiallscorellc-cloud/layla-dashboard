const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'tasks.json');

// Initialize data structure
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return {
    status: 'idle', // 'working' or 'idle'
    currentTask: null,
    queue: [],
    completed: [],
    suggestions: []
  };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  io.emit('update', data);
}

let data = loadData();

// Generate AI task suggestions
function generateSuggestions() {
  const suggestions = [
    { id: uuidv4(), title: 'Analyze competitor ad strategies', description: 'Research top 5 DTC supplement brands and their FB/IG ad approaches', priority: 'medium', category: 'research' },
    { id: uuidv4(), title: 'Create email sequence for cart abandonment', description: 'Draft 3-email sequence for customers who abandon checkout', priority: 'high', category: 'marketing' },
    { id: uuidv4(), title: 'Audit website for conversion optimization', description: 'Review HerSpark.com for UX issues and conversion blockers', priority: 'medium', category: 'operations' },
    { id: uuidv4(), title: 'Generate 10 new TOFU ad concepts', description: 'Create fresh top-of-funnel ad hooks and visuals', priority: 'medium', category: 'creative' },
    { id: uuidv4(), title: 'Research influencer partnership opportunities', description: 'Find 10 micro-influencers in the menopause/wellness space', priority: 'low', category: 'marketing' },
    { id: uuidv4(), title: 'Create customer testimonial compilation', description: 'Gather and organize best reviews for social proof', priority: 'medium', category: 'marketing' },
    { id: uuidv4(), title: 'Analyze Triple Whale metrics for last 7 days', description: 'Review ROAS, CAC, and identify optimization opportunities', priority: 'high', category: 'analytics' },
    { id: uuidv4(), title: 'Draft blog post on menopause and libido', description: 'SEO-optimized content for organic traffic', priority: 'low', category: 'content' },
    { id: uuidv4(), title: 'Set up automated reporting dashboard', description: 'Create weekly KPI summary automation', priority: 'medium', category: 'operations' },
    { id: uuidv4(), title: 'Review and optimize ad targeting', description: 'Analyze audience performance and suggest refinements', priority: 'high', category: 'marketing' }
  ];
  return suggestions;
}

// Initialize suggestions if empty
if (data.suggestions.length === 0) {
  data.suggestions = generateSuggestions();
  saveData(data);
}

// API Routes
app.get('/api/status', (req, res) => {
  res.json(data);
});

app.post('/api/status', (req, res) => {
  const { status } = req.body;
  if (status === 'working' || status === 'idle') {
    data.status = status;
    saveData(data);
  }
  res.json(data);
});

app.post('/api/task/current', (req, res) => {
  const { task } = req.body;
  data.currentTask = task ? {
    id: task.id || uuidv4(),
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'medium',
    source: task.source || 'manual',
    startedAt: new Date().toISOString()
  } : null;
  data.status = task ? 'working' : 'idle';
  saveData(data);
  res.json(data);
});

app.post('/api/task/complete', (req, res) => {
  if (data.currentTask) {
    data.completed.unshift({
      ...data.currentTask,
      completedAt: new Date().toISOString()
    });
    data.currentTask = null;
    
    // Auto-start next in queue
    if (data.queue.length > 0) {
      const next = data.queue.shift();
      data.currentTask = {
        ...next,
        startedAt: new Date().toISOString()
      };
      data.status = 'working';
    } else {
      data.status = 'idle';
    }
    saveData(data);
  }
  res.json(data);
});

app.post('/api/queue/add', (req, res) => {
  const { task } = req.body;
  const newTask = {
    id: uuidv4(),
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'medium',
    source: task.source || 'manual',
    addedAt: new Date().toISOString()
  };
  
  // Insert based on priority
  if (task.priority === 'urgent') {
    data.queue.unshift(newTask);
  } else {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = data.queue.findIndex(t => 
      priorityOrder[t.priority] > priorityOrder[newTask.priority]
    );
    if (insertIndex === -1) {
      data.queue.push(newTask);
    } else {
      data.queue.splice(insertIndex, 0, newTask);
    }
  }
  saveData(data);
  res.json(data);
});

app.post('/api/queue/urgent', (req, res) => {
  const { task } = req.body;
  const urgentTask = {
    id: uuidv4(),
    title: task.title,
    description: task.description || '',
    priority: 'urgent',
    source: task.source || 'discord',
    addedAt: new Date().toISOString()
  };
  
  // If currently working, pause current and queue it
  if (data.currentTask) {
    data.queue.unshift(data.currentTask);
  }
  
  data.currentTask = {
    ...urgentTask,
    startedAt: new Date().toISOString()
  };
  data.status = 'working';
  saveData(data);
  res.json(data);
});

app.delete('/api/queue/:id', (req, res) => {
  data.queue = data.queue.filter(t => t.id !== req.params.id);
  saveData(data);
  res.json(data);
});

app.post('/api/queue/reorder', (req, res) => {
  const { queue } = req.body;
  data.queue = queue;
  saveData(data);
  res.json(data);
});

app.post('/api/suggestions/approve', (req, res) => {
  const { id } = req.body;
  const suggestion = data.suggestions.find(s => s.id === id);
  if (suggestion) {
    data.suggestions = data.suggestions.filter(s => s.id !== id);
    
    // Add to queue
    const newTask = {
      id: uuidv4(),
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      source: 'ai-suggestion',
      addedAt: new Date().toISOString()
    };
    
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = data.queue.findIndex(t => 
      priorityOrder[t.priority] > priorityOrder[newTask.priority]
    );
    if (insertIndex === -1) {
      data.queue.push(newTask);
    } else {
      data.queue.splice(insertIndex, 0, newTask);
    }
    saveData(data);
  }
  res.json(data);
});

app.post('/api/suggestions/refresh', (req, res) => {
  data.suggestions = generateSuggestions();
  saveData(data);
  res.json(data);
});

app.delete('/api/completed/clear', (req, res) => {
  data.completed = [];
  saveData(data);
  res.json(data);
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('update', data);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3847;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Layla Dashboard running on http://localhost:${PORT}`);
  console.log(`Access remotely via your Mac's IP on port ${PORT}`);
});
