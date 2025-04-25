import request from 'supertest';
import { app } from '../app.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Authentication Flow', () => {
  let testUser: any;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
    
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      isEmailVerified: true
    });
  });

  afterAll(async () => {
    // Clean up
    await User.deleteOne({ email: 'test@example.com' });
    await mongoose.connection.close();
  });

  describe('Login Flow', () => {
    it('should login and receive tokens in cookies', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      
      // Check for cookies
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.includes('accessToken'))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.includes('refreshToken'))).toBe(true);
      
      // Store tokens for later tests
      accessToken = cookies.find((cookie: string) => cookie.includes('accessToken')).split(';')[0].split('=')[1];
      refreshToken = cookies.find((cookie: string) => cookie.includes('refreshToken')).split(';')[0].split('=')[1];
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh tokens when access token is about to expire', async () => {
      // Create a token that's about to expire
      const expiringToken = jwt.sign(
        { userId: testUser._id },
        JWT_SECRET,
        { expiresIn: '1s' }
      );

      // Wait for token to be close to expiration
      await new Promise(resolve => setTimeout(resolve, 900));

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', [`refreshToken=${refreshToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);

      // Check for new cookies
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.includes('accessToken'))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.includes('refreshToken'))).toBe(true);
    });

    it('should handle concurrent token refresh requests', async () => {
      // Create multiple refresh requests
      const refreshPromises = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/auth/refresh-token')
          .set('Cookie', [`refreshToken=${refreshToken}`])
      );

      // Execute all requests concurrently
      const responses = await Promise.all(refreshPromises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.statusCode).toBe(200);
      });

      // Verify all responses have new tokens
      responses.forEach(response => {
        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies.some((cookie: string) => cookie.includes('accessToken'))).toBe(true);
        expect(cookies.some((cookie: string) => cookie.includes('refreshToken'))).toBe(true);
      });
    });

    it('should handle invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', [`refreshToken=${invalidToken}`]);

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Invalid refresh token');
    });
  });

  describe('Protected Route Access', () => {
    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should fail to access protected route with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Cookie', [`accessToken=${expiredToken}`]);

      expect(response.status).toBe(401);
    });
  });

  describe('Logout Flow', () => {
    it('should clear tokens on logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(response.status).toBe(200);
      
      // Check that cookies are cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.includes('accessToken=;'))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.includes('refreshToken=;'))).toBe(true);
    });
  });
}); 