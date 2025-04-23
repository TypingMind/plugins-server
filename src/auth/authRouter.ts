// authRouter.ts
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Basic validation to ensure credentials are provided
  if (!username || !password) {
    return res.status(400).json({ 
      message: 'Username and password are required' 
    });
  }

  // Create a payload using the provided username
  const payload = {
    sub: Date.now().toString(), // Unique ID based on timestamp
    email: username,
    // You can add additional claims if needed
    loginTime: new Date().toISOString(),
    clientId: 'powerpoint-plugin'
  };

  try {
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-secret-key',
      { 
        expiresIn: '5h',
        algorithm: 'HS256'
      }
    );

    // Log successful login attempt (optional)
    console.log(`Login successful for user: ${username}`);

    return res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 18000,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({ 
      message: 'Error generating authentication token' 
    });
  }
});

// Optional: Add a token verification endpoint
router.post('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return res.json({ 
      valid: true, 
      decoded 
    });
  } catch (error) {
    return res.status(401).json({ 
      valid: false, 
      message: 'Invalid token' 
    });
  }
});

export const authRouter = router;