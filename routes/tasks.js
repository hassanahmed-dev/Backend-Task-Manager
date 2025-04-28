const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// Middleware to protect routes
router.use(auth);

// Get all tasks for the logged in user
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get a single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, dueDate, priority, status } = req.body;
    
    // Create task
    const task = await Task.create({
      title,
      description,
      dueDate,
      priority,
      status,
      user: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (err) {
    console.error('Error creating task:', err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, dueDate, priority, status } = req.body;
    
    // Find task
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Update task
    task = await Task.findByIdAndUpdate(req.params.id, {
      title: title || task.title,
      description: description !== undefined ? description : task.description,
      dueDate: dueDate || task.dueDate,
      priority: priority || task.priority,
      status: status || task.status
    }, { 
      new: true, 
      runValidators: true 
    });
    
    res.json({
      success: true,
      data: task
    });
  } catch (err) {
    console.error('Error updating task:', err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    await task.deleteOne();
    
    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router; 