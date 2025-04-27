import { OAuth2Client } from 'google-auth-library';
import { googleConfig } from '../config/googleAuth.js';

class GoogleAuthService {
    private client: OAuth2Client;

    constructor() {
        this.client = new OAuth2Client(
            googleConfig.clientID,
            googleConfig.clientSecret,
            googleConfig.callbackURL
        );
    }

    async verifyGoogleToken(token: string) {
        try {
            const ticket = await this.client.verifyIdToken({
                idToken: token,
                audience: googleConfig.clientID
            });
            const payload = ticket.getPayload();
            
            if (!payload) {
                throw new Error('Invalid token payload');
            }

            return {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                googleId: payload.sub
            };
        } catch (error) {
            throw new Error('Failed to verify Google token');
        }
    }
}

export const googleAuthService = new GoogleAuthService(); 