require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const entriesRoutes = require('./routes/entries');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'ejs'); 

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tribal';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

const userSchema = new mongoose.Schema({
  name: String,
  password: String,
  age: Number,
  active: { type: Boolean, default: false }
});

const adminSchema = new mongoose.Schema({
  name: String,
  password: String,
  age: Number,
  active: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);

app.use('/api/entries', entriesRoutes);

app.get('/create-admin', async (req, res) => {
  try {
    const newAdmin = new Admin({
      name: 'admin',
      password: 'admin123', 
      age: 30,
      active: false
    });

    await newAdmin.save();
    res.send('✅ Admin created successfully!');
  } catch (err) {
    console.error('Error creating admin:', err);
    res.status(500).send('Server error while creating admin');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'login.html'));
});

app.post('/', async (req, res) => {
  const { name, password } = req.body;
  try {
    const user = await User.findOne({ name, password });
    if (user) {
      user.active = true;
      await user.save();
      req.session.name = name;
      req.session.role = 'user';
      return res.redirect('/index');
    }

    const admin = await Admin.findOne({ name, password });
    if (admin) {
      admin.active = true;
      await admin.save();
      req.session.name = name;
      req.session.role = 'admin';
      return res.redirect('/index');
    }

    res.send('Invalid name or password');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});

app.get('/Sign_up', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'signup.html'));
});

app.post('/Sign_up', async (req, res) => {
  const { name, email, password, age } = req.body;
  try {
    const existingUser = await User.findOne({ name });
    if (existingUser) return res.send('Username already exists. Try logging in.');

    const newUser = new User({ name, email, password, age });
    await newUser.save();

    res.send('Registration successful. Please log in.');
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).send('Error registering user');
  }
});

app.get('/index', (req, res) => {
  if (!req.session || !req.session.role) {
    return res.redirect('/');
  }
  res.render('index', { role: req.session.role });
});

app.get('/adm', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/admin.html'));
});

app.get('/submit', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/submit.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("http://localhost:5000/");
  console.log(`🚀 Server is running on port ${PORT}`);
});
