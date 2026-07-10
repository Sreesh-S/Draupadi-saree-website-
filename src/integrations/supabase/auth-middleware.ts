import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { supabase } from './client'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    // Decode the mock token (base64 encoded JSON string)
    let claims: any;
    try {
      claims = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    } catch (err) {
      // Fallback: treat the raw token as the user ID
      claims = { sub: token, email: "unknown@example.com" };
    }

    if (!claims.sub) {
      throw new Error('Unauthorized: Invalid token structure');
    }

    return next({
      context: {
        supabase,
        userId: claims.sub,
        claims: claims,
      },
    });
  },
);
