import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';

// Skema validasi login untuk kredensial sementara
const LoginSchema = z.object({
  username: z.string().startsWith('tmp_user_', "Username must be a temporary user"),
  password: z.string().startsWith('tmp_pass_', "Password must be a temporary password")
});

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasi input untuk kredensial sementara
    LoginSchema.parse({ username, password });

    // Generate ID unik untuk pengguna sementara
    const userId = `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Generate token
    const token = jwt.sign(
      { 
        id: userId, 
        username: username,
        type: 'temporary'
      }, 
      JWT_SECRET, 
      { 
        expiresIn: '1h' 
      }
    );

    res.json({
      token,
      user: {
        id: userId,
        username: username
      }
    });
  } catch (error) {
    console.error('Temporary Login Error:', error);
    
    // Tangani kesalahan validasi atau autentikasi
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid temporary credentials',
        errors: error.errors 
      });
    }

    res.status(401).json({ 
      message: 'Temporary login failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
