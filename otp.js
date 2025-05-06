require('dotenv').config();
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
app.use(cors()); // Allow frontend requests
app.use(bodyParser.json());

let otpStorage = {}; // Temporary storage for OTPs

// Configure Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail
        pass: process.env.EMAIL_PASS  // Your App Password
    }
});

// Function to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// **1️⃣ Send OTP via Email**
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    
    if (!email) return res.status(400).send({ error: 'Email is required' });

    const otp = generateOTP();
    otpStorage[email] = otp; // Store OTP temporarily (Use Redis/DB for production)

    // Email options
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}. It is valid for 5 minutes.`
    };
//handling exceptions
    try {
        await transporter.sendMail(mailOptions);
        res.status(200).send({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error sending OTP' });
    }
});

// **2️⃣ Verify OTP**
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).send({ error: 'Email and OTP are required' });

    if (otpStorage[email] === otp) {
        delete otpStorage[email]; // Remove OTP after verification
        res.status(200).send({ message: 'OTP verified successfully' });
    } else {
        res.status(400).send({ error: 'Invalid or expired OTP' });
    }
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
