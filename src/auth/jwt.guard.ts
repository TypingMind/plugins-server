import { 
    Injectable, 
    ExecutionContext, 
    UnauthorizedException 
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  
  @Injectable()
  export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
      // Tambahkan logging untuk debugging
      console.log('JWT Guard Activated');
      console.log('Context Type:', context.getType());
      
      try {
        return super.canActivate(context);
      } catch (error) {
        console.error('JWT Guard Error:', error);
        throw new UnauthorizedException('Authentication failed');
      }
    }
  
    handleRequest(err: any, user: any, info: any) {
      // Logging untuk memahami proses autentikasi
      console.log('Handle Request Error:', err);
      console.log('User:', user);
      console.log('Info:', info);
  
      if (err) {
        console.error('JWT Verification Error:', err);
        throw new UnauthorizedException(err.message || 'Token verification failed');
      }
  
      if (!user) {
        throw new UnauthorizedException('No user found');
      }
  
      return user;
    }
  }
  