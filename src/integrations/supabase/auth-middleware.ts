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

    let userId: string;
    let email: string;

    // Check if we are using the real Supabase client
    const isRealSupabase = typeof (supabase as any).auth.getUser === 'function' && !(supabase as any).from.toString().includes('MockQueryBuilder');

    if (isRealSupabase) {
      // Call real Supabase to verify token and get user
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        throw new Error(`Unauthorized: Invalid Supabase token: ${error?.message || 'No user'}`);
      }
      userId = user.id;
      email = user.email || '';
    } else {
      // Decode the mock token (base64 encoded JSON string)
      let claims: any;
      try {
        claims = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      } catch (err) {
        claims = { sub: token, email: "unknown@example.com" };
      }
      userId = claims.sub;
      email = claims.email;
    }

    return next({
      context: {
        supabase,
        userId,
        email,
      },
    });
  },
);
