// auth.controller.ts
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface LoginDto {
  username: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private jwtService: JwtService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // For demo purposes - replace with your actual user validation
    if (loginDto.username === 'admin' && loginDto.password === 'admin123') {
      const payload = { 
        sub: '1', // user id
        email: loginDto.username,
      };

      const token = this.jwtService.sign(payload);
      
      return {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600 // 1 hour
      };
    }

    throw new UnauthorizedException('Invalid credentials');
  }
}