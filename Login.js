require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const entriesRoutes = require('./routes/entries');
const Entry = require('./models/Entry');


const app = express();
const port = 3000;
app.use('/api/entries', entriesRoutes);
app.set('view engine', 'ejs');

const fonts = [
    {
      name: 'Poppins',
      url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap',
      family: "'Poppins', sans-serif"
    },
    {
      name: 'Playfair Display',
      url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap',
      family: "'Playfair Display', serif"
    },
    {
      name: 'Roboto',
      url: 'https://fonts.googleapis.com/css2?family=Roboto&display=swap',
      family: "'Roboto', sans-serif"
    },
    {
      name: 'Bebas Neue',
      url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
      family: "'Bebas Neue', cursive"
    },
    {
      name: 'Bungee Spice',
      url: 'https://fonts.googleapis.com/css2?family=Bungee+Spice&display=swap',
      family: "'Bungee Spice', cursive"
    },
    {
      name: 'Caveat',
      url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap',
      family: "'Caveat', cursive"
    },
    {
      name: 'Dancing Script',
      url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap',
      family: "'Dancing Script', cursive"
    },
    {
      name: 'EB Garamond',
      url: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap',
      family: "'EB Garamond', serif"
    },
    {
      name: 'Great Vibes',
      url: 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap',
      family: "'Great Vibes', cursive"
    },
    {
      name: 'Italianno',
      url: 'https://fonts.googleapis.com/css2?family=Italianno&display=swap',
      family: "'Italianno', cursive"
    },
    {
      name: 'Luxurious Roman',
      url: 'https://fonts.googleapis.com/css2?family=Luxurious+Roman&display=swap',
      family: "'Luxurious Roman', serif"
    },
    {
      name: 'Mandali',
      url: 'https://fonts.googleapis.com/css2?family=Mandali&display=swap',
      family: "'Mandali', sans-serif"
    },
    {
      name: 'National Park',
      url: 'https://fonts.googleapis.com/css2?family=National+Park:wght@200..800&display=swap',
      family: "'National Park', serif"
    },
    {
      name: 'Noto Sans JP',
      url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap',
      family: "'Noto Sans JP', sans-serif"
    },
    {
      name: 'Noto Sans TC',
      url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@100..900&display=swap',
      family: "'Noto Sans TC', sans-serif"
    },
    {
      name: 'Satisfy',
      url: 'https://fonts.googleapis.com/css2?family=Satisfy&display=swap',
      family: "'Satisfy', cursive"
    }
  ];
  

const selectedFont = fonts[0];

const mongoURI = 'mongodb://127.0.0.1:27017/healthcare';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB (healthcare)");
}).catch(err => {
    console.error("MongoDB connection error:", err);
});

const patientSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    age: Number,
    active: Boolean,
    medicalHistory: String,
    appointments: [
        {
            doctor: String,
            appointmentSlot: String
        }
    ],
    notifications: { type: String, default: '' },
    preferredFont: { type: String, default: 'Poppins' }
});
const Patient = mongoose.model('patient', patientSchema);

const doctorSchema = new mongoose.Schema({
    name: String,
    specialization: String,
    email: String,
    active: Boolean,
    phone: String,
    appointments: [
        {
            patientName: String,
            patientEmail: String,
            appointmentSlot: String
        }
    ],
    notifications: [
        {
            patientName: String,
            patientEmail: String,
            appointmentSlot: String,
            status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
            createdAt: { type: Date, default: Date.now } 
        }
    ],
    availableSlots: [String],
    preferredFont: { type: String, default: 'Poppins' }
});

const Doctor = mongoose.model('Doctor', doctorSchema);

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

let otpStorage = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});


const session = require('express-session');

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateAvailableSlots = () => {
    const today = moment().startOf('day');
    const nextWeek = moment().add(1, 'week').endOf('day');
    const availableSlots = [];
    let currentDay = today.clone();

    while (currentDay.isBefore(nextWeek)) {
        for (let hour = 9; hour < 17; hour++) {
            const slot = currentDay.clone().hour(hour).minute(0).second(0);
            if (slot.isAfter(moment())) {
                availableSlots.push(slot.format('YYYY-MM-DDTHH:mm:ss'));
            }
        }
        currentDay.add(1, 'day');
    }
    return availableSlots;
};

const cleanUpPastAppointments = async () => {
    try {
        const doctors = await Doctor.find();

        for (let doctor of doctors) {
            const currentDate = moment().startOf('day');
            doctor.availableSlots = doctor.availableSlots.filter(slot => moment(slot).isAfter(currentDate));
            doctor.appointments = doctor.appointments.filter(appointment => moment(appointment.appointmentSlot).isAfter(currentDate));
            await doctor.save();
        }

        console.log('Past appointments and slots cleaned up.');
    } catch (err) {
        console.error('Error cleaning up past appointments and slots:', err);
    }
};

const updateDoctorsWithSlots = async () => {
    try {
        const availableSlots = generateAvailableSlots();
        const doctors = await Doctor.find();

        for (let doctor of doctors) {
            doctor.availableSlots = availableSlots;
            await doctor.save();
        }

        console.log('Available slots updated for doctors.');
    } catch (err) {
        console.error('Error updating doctors with available slots:', err);
    }
};

const updateSlotsAndCleanUp = async () => {
    await cleanUpPastAppointments();
    await updateDoctorsWithSlots();
};

const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled job to clean up and update slots.');
    await updateSlotsAndCleanUp();
});

updateSlotsAndCleanUp();

app.post('/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).send({ error: 'Email is required' });

    const otp = generateOTP();
    otpStorage[email] = otp;

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}. It is valid for 5 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("OTP email sent successfully.");
        res.status(200).send({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error sending OTP' });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).send({ error: 'Email and OTP are required' });
    }

    console.log("OTP stored:", otpStorage[email]);
    console.log("OTP received:", otp);

    if (String(otpStorage[email]) === String(otp)) {
        delete otpStorage[email];
        return res.status(200).json({ message: 'OTP verified', redirect: '/welcome' });
    }

    try {
        const result = await Patient.deleteOne({ email });
        console.log("Delete result:", result);
        return res.status(400).send({ error: 'Invalid or expired OTP' });
    } catch (err) {
        console.error("Delete error:", err);
        return res.status(500).send({ error: 'Server error during delete' });
    }
});

app.post('/fverify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (otpStorage[email] === otp) {
        delete otpStorage[email];
        res.json({ message: 'OTP verified successfully' });
    } else {
        res.status(400).json({ error: 'Invalid or expired OTP' });
    }
});

app.get('/', (req, res) => res.redirect('/Login'));

app.get('/Login', (req, res) => res.sendFile(path.join(__dirname, 'templates/login.html')));

app.post('/Login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const patient = await Patient.findOne({ email, password });
        if (patient) {
            patient.active = true;
            await patient.save();
            req.session.email = email;
            req.session.role = 'patient'; 
            res.redirect('/welcome');
        } else {
            const doctor = await Doctor.findOne({ email, password });

            if (doctor) {
                doctor.active = true;
                await doctor.save();
                req.session.email = email;
                req.session.role = 'doctor'; 
                res.redirect('/welcome');
            } else {
                res.send('Invalid Email or Password');
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

function requireLogin(req, res, next) {
    if (!req.session.email) return res.redirect('/Login');
    res.set('Cache-Control', 'no-store');
    next();
}

app.get('/Sign_up', (req, res) => res.sendFile(path.join(__dirname, 'templates/signup.html')));

app.post('/Sign_up', async (req, res) => {
    const { name, email, password, age, medicalHistory } = req.body;
    try {
        const existingPatient = await Patient.findOne({ email });
        if (existingPatient) return res.send('Email already exists. Try logging in.');

        const newPatient = new Patient({ name, email, password, age, medicalHistory });
        await newPatient.save();

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStorage[email] = otp;

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is: ${otp}. It is valid for 5 minutes.`
        };

        await transporter.sendMail(mailOptions);
        console.log('OTP sent to:', email, 'Code:', otp);

        res.render('Genotp', { email: email, gotp: otp });
    } catch (err) {
        console.error('Sign up or OTP error:', err);
        res.status(500).send('Error registering patient or sending OTP');
    }
});

app.get('/forgot_password', (req, res) => res.sendFile(path.join(__dirname, 'templates/forgotpass.html')));

app.post('/forgot_password', async (req, res) => {
    const { email } = req.body;

    try {
        const existingPatient = await Patient.findOne({ email });

        if (!existingPatient) {
            return res.status(404).send('No account found with this email.');
        }

        const fotp = generateOTP();
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code for Forgot Password is: ${fotp}. It is valid for 5 minutes.`
        };

        await transporter.sendMail(mailOptions);

        res.render('fgetotp', { email: email, fotp: fotp });
    } catch (err) {
        console.error('Error sending forgot OTP:', err);
        res.status(500).send('Error sending forgot OTP. Please try again.');
    }
});

app.get('/change_password', (req, res) => res.sendFile(path.join(__dirname, 'templates/changepass.html')));

app.get('/newpass', (req, res) => res.render('newpass', { email: req.query.email }));

app.post('/newpass', async (req, res) => {
    const { email, pass1, pass2 } = req.body;

    if (!email || !pass1 || !pass2) {
        return res.status(400).send({ error: 'All fields are required' });
    }

    if (pass1 !== pass2) {
        return res.status(400).send({ error: 'Passwords do not match' });
    }

    try {

        const updatedPatient = await Patient.findOneAndUpdate(
            { email },
            { password: pass1 },
            { new: true }
        );

        if (!updatedPatient) {
            return res.status(400).send({ error: 'Email not found' });
        }

        res.send(`
            <script>
                alert("Password updated successfully!");
                window.location.href = "/welcome";
            </script>
        `);
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).send({ error: 'Server error' });
    }
});

app.get('/change_password', (req, res) => res.sendFile(path.join(__dirname, 'templates/changepass.html')));

app.get('/welcome', requireLogin, async (req, res) => {
    const email = req.session.email;
    const role = req.session.role;

    try {
        if (role === 'doctor') {
            const doctor = await Doctor.findOne({ email });
            if (!doctor || !doctor.active) {
                return res.status(403).send('Access denied. Doctor not active.');
            }
            const selectedFont = fonts.find(f => f.name === doctor.preferredFont) || fonts[0];

            res.render('welcome', { role,
                fon: selectedFont.url,
                fonfam: selectedFont.family,
                fonts: fonts,
                selectedFont: selectedFont
             });
        } else if (role === 'patient') {
            const patient = await Patient.findOne({ email });
            if (!patient || !patient.active) {
                return res.status(403).send('Access denied. Patient not active.');
            }
            const selectedFont = fonts.find(f => f.name === patient.preferredFont) || fonts[0];

            res.render('welcome', { role,
                fon: selectedFont.url,
                fonfam: selectedFont.family,
                fonts: fonts,
                selectedFont: selectedFont

             });
        } else {
            res.status(400).send('Unknown role');
        }
    } catch (err) {
        console.error('Error in /welcome:', err);
        res.status(500).send('Server error');
    }
});

app.get('/appointments', async (req, res) => {
    try {
        const email = req.session.email;
        const user = await Patient.findOne({ email: email });
        const selectedFont = fonts.find(f => f.name === user.preferredFont) || fonts[0];

        if (!user) return res.status(404).send("User not found");

        const appointments = user.appointments || [];

        res.render('appointments', { appointments,
            fon: selectedFont.url,
                fonfam: selectedFont.family,
                fonts: fonts,
                selectedFont: selectedFont
         });
    } catch (err) {
        console.error("Error fetching appointments:", err);
        res.status(500).send("Internal server error");
    }
});

app.get('/selectDoc', async (req, res) => {
    try {
        const email = req.session.email;
        const doctors = await Doctor.find();
        const patient = await Patient.findOne({ email });
        const selectedFont = fonts.find(f => f.name === patient.preferredFont) || fonts[0];

        res.render('selectDoc', { doctors,
            fon: selectedFont.url,
            fonfam: selectedFont.family,
            fonts: fonts,
            selectedFont: selectedFont });
    } catch (err) {
        console.error("Error fetching doctors:", err);
        res.status(500).send("Internal server error");
    }
});

const moment = require('moment');

app.post('/bookAppointment', async (req, res) => {
    const { doctorId } = req.body;

    if (!doctorId) {
        return res.status(400).send("Doctor ID is required");
    }

    try {
        const doctor = await Doctor.findById(doctorId);
        console.log(doctor);
        if (!doctor) {
            return res.status(404).send("Doctor not found");
        }

        const today = moment().startOf('day');
        const nextWeek = moment().add(1, 'week').endOf('day');

        const availableSlots = [];
        let currentDay = today.clone();

        while (currentDay.isBefore(nextWeek)) {
            for (let hour = 9; hour < 17; hour++) {
                const slot = currentDay.clone().hour(hour).minute(0).second(0);
                if (slot.isAfter(moment())) {  
                    availableSlots.push(slot.format('YYYY-MM-DDTHH:mm:ss'));
                }
            }
            currentDay.add(1, 'day');
        }

        res.render('bookAppointment', {
            name: doctor.name,
            _id: doctor._id,
            specialization: doctor.specialization,
            email: doctor.email,
            phone: doctor.phone,
            availableSlots: availableSlots
        });

    } catch (err) {
        console.error("Error booking appointment:", err);
        res.status(500).send("Server error while booking appointment");
    }
});

app.post('/submit-appointment', async (req, res) => {
    const userEmail = req.session.email;
    const { doctorId, appointmentSlot } = req.body;

    if (!doctorId || !appointmentSlot || !userEmail) {
        return res.status(400).send("Doctor ID, appointment slot, and user email are required");
    }

    try {
        const doctor = await Doctor.findById(doctorId);
        const patient = await Patient.findOne({ email: userEmail });

        if (!doctor || !patient) {
            return res.status(404).send("Doctor or Patient not found");
        }

        const notification = {
            patientName: patient.name,
            patientEmail: patient.email,
            appointmentSlot,
            status: "pending"  
        };

        doctor.notifications = doctor.notifications || [];
        doctor.notifications.push(notification);
        await doctor.save();

        res.send(`Appointment request sent to Dr. ${doctor.name} for approval.`);
    } catch (err) {
        console.error("Error submitting appointment:", err);
        res.status(500).send("Server error while submitting appointment request");
    }
});

app.post('/accept-appointment', async (req, res) => {
    const { doctorId, patientEmail, appointmentSlot } = req.body;

    if (!doctorId || !patientEmail || !appointmentSlot) {
        return res.status(400).send("Doctor ID, patient email, and appointment slot are required");
    }

    try {
        const doctor = await Doctor.findById(doctorId);
        const patient = await Patient.findOne({ email: patientEmail });

        if (!doctor || !patient) {
            return res.status(404).send("Doctor or Patient not found");
        }

        const notificationIndex = doctor.notifications.findIndex(notification =>
            notification.patientEmail === patientEmail &&
            notification.appointmentSlot === appointmentSlot &&
            notification.status === "pending"
        );

        if (notificationIndex === -1) {
            return res.status(404).send("No pending appointment request found");
        }

        doctor.notifications[notificationIndex].status = 'accepted';

        doctor.appointments = doctor.appointments || [];
        doctor.appointments.push({
            patientName: patient.name,
            patientEmail: patient.email,
            appointmentSlot
        });

        patient.appointments = patient.appointments || [];
        patient.appointments.push({
            doctor: doctor.name,
            appointmentSlot
        });

        doctor.availableSlots = doctor.availableSlots.filter(slot => slot !== appointmentSlot);

        await doctor.save();
        await patient.save();

        const mailOptions = {
            from: process.env.EMAIL,
            to: patientEmail,
            subject: 'Appointment Confirmed',
            text: `Dear ${patient.name},\n\nYour appointment with Dr. ${doctor.name} has been successfully booked for ${appointmentSlot}.\n\nThank you for using our healthcare service.\n\nBest regards,\nHealthcare Team`
        };

        await transporter.sendMail(mailOptions);

        res.send(`Appointment with Dr. ${doctor.name} has been successfully booked for ${appointmentSlot}`);
    } catch (err) {
        console.error("Error accepting appointment:", err);
        res.status(500).send("Server error while accepting appointment");
    }
});

app.post('/reject-appointment', async (req, res) => {
    const { doctorId, patientEmail, appointmentSlot } = req.body;

    if (!doctorId || !patientEmail || !appointmentSlot) {
        return res.status(400).send("Doctor ID, patient email, and appointment slot are required");
    }

    try {
        const doctor = await Doctor.findById(doctorId);
        const patient = await Patient.findOne({ email: patientEmail });

        if (!doctor || !patient) {
            return res.status(404).send("Doctor or Patient not found");
        }

        const notificationIndex = doctor.notifications.findIndex(notification => 
            notification.patientEmail === patientEmail && notification.appointmentSlot === appointmentSlot && notification.status === "pending"
        );

        if (notificationIndex === -1) {
            return res.status(404).send("No pending appointment request found");
        }

        doctor.notifications.splice(notificationIndex, 1);
        await doctor.save();

        const mailOptions = {
            from: process.env.EMAIL,
            to: patientEmail,
            subject: 'Your Appointment Rejected',
            text: `Dear ${patient.name},\n\nWe regret to inform you that your appointment with Dr. ${doctor.name} at ${appointmentSlot} has been rejected.\n\nPlease log in to your account to book another available slot.\n\nWe apologize for any inconvenience caused.\n\nBest regards,\nHealthcare Team`
        };

        await transporter.sendMail(mailOptions);

        res.send(`Appointment request for ${patient.name} at ${appointmentSlot} has been rejected.`);
        
    } catch (err) {
        console.error("Error rejecting appointment:", err);
        res.status(500).send("Server error while rejecting appointment");
    }
});

app.get('/doctor-notifications', async (req, res) => {
    const doctorEmail = req.session.email; 

    if (!doctorEmail) {
        return res.status(400).send("Doctor email is required");
    }

    try {
        const doctor = await Doctor.findOne({ email: doctorEmail });
        const selectedFont = fonts.find(f => f.name === doctor.preferredFont) || fonts[0];

        if (!doctor) {
            return res.status(404).send("Doctor not found");
        }

        const pendingAppointments = doctor.notifications.filter(notification => notification.status === "pending");

        res.render('doctorNotifications', { pendingAppointments,doctor: doctor,
            fon: selectedFont.url,
            fonfam: selectedFont.family,
            fonts: fonts,
            selectedFont: selectedFont
         });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).send("Server error while fetching notifications");
    }
});

app.get('/doctor-notifications', async (req, res) => {
    const doctorEmail = req.session.email; 
    const doctor = await Doctor.findOne({ doctorEmail });
const selectedFont = fonts.find(f => f.name === doctor.preferredFont) || fonts[0];

    if (!doctorEmail) {
        return res.status(400).send("Doctor email is required");
    }

    try {
        const doctor = await Doctor.findOne({ email: doctorEmail });

        if (!doctor) {
            return res.status(404).send("Doctor not found");
        }

        const pendingAppointments = doctor.notifications.filter(notification => notification.status === "pending");

        res.render('doctorNotifications', { 
            pendingAppointments: pendingAppointments, 
            doctor: doctor,
            fon: selectedFont.url,
            fonfam: selectedFont.family,
            fonts: fonts,
            selectedFont: selectedFont
        });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).send("Server error while fetching notifications");
    }
});

app.get('/docAppointments', async (req, res) => {
    const email = req.session.email;

    try {
        const doctor = await Doctor.findOne({ email });
        const selectedFont = fonts.find(f => f.name === doctor.preferredFont) || fonts[0];

        if (!doctor) {
            return res.status(404).send("Doctor not found");
        }

        const appointments = await Patient.find({
            "appointments.doctor": doctor.name
        }, {
            name: 1,
            email: 1,
            appointments: 1
        });

        const doctorAppointments = [];

        appointments.forEach(patient => {
            patient.appointments.forEach(appointment => {
                if (appointment.doctor === doctor.name) {
                    doctorAppointments.push({
                        patientName: patient.name,
                        patientEmail: patient.email,
                        slot: appointment.appointmentSlot
                    });
                }
            });
        });

        res.render('docAppoints', { doctorAppointments,
            fon: selectedFont.url,
            fonfam: selectedFont.family,
            fonts: fonts,
            selectedFont: selectedFont
         });
    } catch (err) {
        console.error("Error fetching doctor's appointments:", err);
        res.status(500).send("Server error");
    }
});

app.get('/profile', requireLogin, async (req, res) => {
    const email = req.session.email;
    const role = req.session.role;

    if (!email || !role) {
        return res.redirect('/Login');
    }

    try {
        if (role === 'doctor') {
            const doctor = await Doctor.findOne({ email });
            if (!doctor) return res.status(404).send('Doctor not found');

            const selectedFont = fonts.find(f => f.name === doctor.preferredFont) || fonts[0];

            res.render('profile', { 
                user: {
                    name: doctor.name,
                    specialization: doctor.specialization,
                    email: doctor.email,
                    phone: doctor.phone,
                    appointments: doctor.appointments
                },
                role: 'doctor',
                fon: selectedFont.url,
                fonfam: selectedFont.family,
                fonts: fonts,
                selectedFont: selectedFont
            });
        } else if (role === 'patient') {
            const patient = await Patient.findOne({ email });
            if (!patient) return res.status(404).send('Patient not found');

            const selectedFont = fonts.find(f => f.name === patient.preferredFont) || fonts[0];

            res.render('profile', { 
                user: {
                    name: patient.name,
                    age: patient.age,
                    email: patient.email,
                    medicalHistory: patient.medicalHistory,
                    appointments: patient.appointments
                },
                role: 'patient',
                fon: selectedFont.url,
                fonfam: selectedFont.family,
                fonts: fonts,
                selectedFont: selectedFont
            });
        } else {
            res.status(400).send('Unknown role');
        }
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).send('Server error');
    }
});

app.post('/change-font', async (req, res) => {
    const selectedFont = req.body.fontName;
    const email = req.session.email;
    const role = req.session.role;

    if (!email || !role) {
        return res.redirect('/Login');
    }

    try {
        if (role === 'doctor') {
            await Doctor.updateOne({ email }, { preferredFont: selectedFont });
        } else if (role === 'patient') {
            await Patient.updateOne({ email }, { preferredFont: selectedFont });
        }

        req.session.selectedFont = selectedFont;
        res.redirect('/profile');
    } catch (err) {
        console.error('Error updating font:', err);
        res.status(500).send('Server error');
    }
});

app.post('/logout', async (req, res) => {
    try {
        const { email, role } = req.session;
        if (email && role) {
            if (role === 'doctor') {
                await Doctor.updateOne({ email }, { $set: { active: false } });
            } else if (role === 'patient') {
                await Patient.updateOne({ email }, { $set: { active: false } });
            }
        }

        req.session.destroy(err => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).send('Logout failed');
            }
            res.clearCookie('connect.sid');
            res.sendStatus(200);
        });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).send('Server error');
    }
});

app.get('/reels', async (req, res) => {
    const email = req.session.email
    if(req.session.role === 'doctor'){
        const doctor = await Doctor.findOne({ email });
        const selectedFont = fonts.find(f => f.name === doctor.preferredFont) || fonts[0];
        return res.render('index', { role: 'admin',
            fon: selectedFont.url,
            fonfam: selectedFont.family,
            fonts: fonts,
            selectedFont: selectedFont
         });
    }
    const patient = await Patient.findOne({ email });
    const selectedFont = fonts.find(f => f.name === patient.preferredFont) || fonts[0];
    return res.render('index', { role: 'user',
        fon: selectedFont.url,
        fonfam: selectedFont.family,
        fonts: fonts,
        selectedFont: selectedFont
     });
});

app.get('/adm', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/admin.html'));
});

app.get('/submit', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/submit.html'));
});

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/change-font', async (req, res) => {
    const { fontName } = req.body;
    const selectedFont = fonts.find(font => font.name === fontName);

    const userId = req.user._id; 

    if (req.user.role === 'patient') {
        await Patient.findByIdAndUpdate(userId, { selectedFont: selectedFont });
    } else if (req.user.role === 'doctor') {
        await Doctor.findByIdAndUpdate(userId, { selectedFont: selectedFont });
    }

    res.redirect('/profile');
});

app.listen(port, () => console.log(` Server running on http://localhost:${port}`));
