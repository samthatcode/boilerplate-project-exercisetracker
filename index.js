const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
});

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});

// Define user and exercise schemas and models
const userSchema = new mongoose.Schema({
  username: String
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: String
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Endpoint to create a new user
app.post('/api/users', async (req, res) => {
  const newUser = new User({username: req.body.username});
  await newUser.save();
  res.json({username: newUser.username, _id: newUser._id});
});

// Endpoint to get a list of all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// Endpoint to add an exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const newExercise = new Exercise({
    userId: req.params._id,
    description: req.body.description,
    duration: Number(req.body.duration),
    date: req.body.date || new Date().toISOString().slice(0,10)  // Use current date if no date supplied
  });
  await newExercise.save();
  const user = await User.findById(req.params._id);
  res.json({
    _id: user._id,
    username: user.username,
    date: new Date(newExercise.date).toDateString(),
    duration: newExercise.duration,
    description: newExercise.description
  });
});

// Endpoint to retrieve a full exercise log of any user
app.get('/api/users/:_id/logs', async (req, res) => {
  const user = await User.findById(req.params._id);
  let logs = await Exercise.find({userId: req.params._id});
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  const limit = req.query.limit;

  if(req.query.from) {
    logs = logs.filter(log => new Date(log.date) >= from);
  }
  if(req.query.to) {
    logs = logs.filter(log => new Date(log.date) <= to);
  }
  if(req.query.limit) {
    logs = logs.slice(0, limit);
  }

  res.json({
    _id: user._id,
    username: user.username,
    count: logs.length,
    log: logs.map(log => ({
      description: log.description,
      duration: log.duration,
      date: new Date(log.date).toDateString()
    }))
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
