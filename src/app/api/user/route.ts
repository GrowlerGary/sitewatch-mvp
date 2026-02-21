import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { supabase, isSupabaseConfigured } from '@/src/lib/db';
import { TierKey } from '@/src/lib/tiers';
import { authRateLimiter, getClientIP } from '@/src/lib/rate-limiter';

const SALT_ROUNDS = 12;

// Generic error message helper
function getGenericErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Invalid request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not found';
    case 429: return 'Too many requests';
    default: return 'An error occurred';
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const email = url.searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json(
        { error: 'User ID or email required' },
        { status: 400 }
      );
    }

    let user = null;
    let subscription = null;

    if (isSupabaseConfigured() && supabase) {
      // Fetch from Supabase
      let query = supabase.from('users').select('*');
      
      if (id) {
        query = query.eq('id', id);
      } else if (email) {
        query = query.eq('email', email);
      }

      const { data: userData, error: userError } = await query.single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      user = userData;

      // Fetch subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      subscription = subData || null;
    } else {
      // In-memory fallback
      const { getUser, getUserByEmail, getSubscriptionByUserId } = await import('@/src/lib/db');
      
      if (id) {
        user = await getUser(id);
      } else if (email) {
        user = await getUserByEmail(email);
      }

      if (user) {
        subscription = await getSubscriptionByUserId(user.id);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        phoneNumber: user.phone_number || user.phoneNumber,
        stripeCustomerId: user.stripe_customer_id || user.stripeCustomerId,
        smsCountMonthly: user.sms_count_monthly || user.smsCountMonthly || 0,
        smsCountResetAt: user.sms_count_reset_at || user.smsCountResetAt,
        createdAt: user.created_at || user.createdAt,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodEnd: subscription.current_period_end || subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancelAtPeriodEnd,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: getGenericErrorMessage(500) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    try {
      await authRateLimiter.consume(clientIP);
    } catch {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    // Validate password (if provided)
    if (password && typeof password === 'string') {
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }
      // Check for at least one uppercase, one lowercase, and one number
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return NextResponse.json(
          { error: 'Password must contain uppercase, lowercase, and number' },
          { status: 400 }
        );
      }
    }

    const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    if (isSupabaseConfigured() && supabase) {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in.' },
          { status: 409 }
        );
      }

      // Create user in Supabase
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          plan: 'free',
          stripe_customer_id: null,
          phone_number: null,
          sms_count_monthly: 0,
          sms_count_reset_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        user: {
          id: newUser.id,
          email: newUser.email,
          plan: newUser.plan,
          isNew: true,
        },
        subscription: null,
      }, { status: 201 });
    } else {
      // In-memory fallback
      const { getUserByEmail, createUser } = await import('@/src/lib/db');
      
      let user = await getUserByEmail(email);
      
      if (user) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in.' },
          { status: 409 }
        );
      }

      user = await createUser({
        email,
        passwordHash,
        stripeCustomerId: null,
        plan: 'free',
        phoneNumber: null,
        smsCountMonthly: 0,
        smsCountResetAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          plan: user.plan,
          isNew: true,
        },
        subscription: null,
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: getGenericErrorMessage(500) },
      { status: 500 }
    );
  }
}

// Login endpoint
export async function PUT(request: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    try {
      await authRateLimiter.consume(clientIP);
    } catch {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    let user = null;
    let subscription = null;

    if (isSupabaseConfigured() && supabase) {
      // Fetch user from Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      user = userData;

      // Verify password
      if (user.password_hash) {
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        }
      }

      // Fetch subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      subscription = subData || null;
    } else {
      // In-memory fallback
      const { getUserByEmail, getSubscriptionByUserId } = await import('@/src/lib/db');
      
      user = await getUserByEmail(email);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Verify password
      if (user.passwordHash) {
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        }
      }

      subscription = await getSubscriptionByUserId(user.id);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan || 'free',
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodEnd: subscription.current_period_end || subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancelAtPeriodEnd,
      } : null,
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: getGenericErrorMessage(500) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured() && supabase) {
      // Delete user's subscriptions first
      await supabase.from('subscriptions').delete().eq('user_id', id);
      
      // Delete user's websites
      await supabase.from('websites').delete().eq('user_id', id);
      
      // Delete user
      const { error } = await supabase.from('users').delete().eq('id', id);
      
      if (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
          { error: 'Failed to delete account' },
          { status: 500 }
        );
      }
    } else {
      // In-memory fallback
      const { deleteWebsite, getAllWebsites } = await import('@/src/lib/db');
      const websites = await getAllWebsites(id);
      for (const website of websites) {
        await deleteWebsite(website.id, id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: getGenericErrorMessage(500) },
      { status: 500 }
    );
  }
}
