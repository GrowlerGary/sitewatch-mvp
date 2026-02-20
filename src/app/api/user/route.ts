import { NextResponse } from 'next/server';
import { getUserByEmail, createUser, getUser, deleteWebsite, getAllWebsites } from '@/src/lib/db';
import { TierKey } from '@/src/lib/tiers';

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
    
    if (id) {
      user = await getUser(id);
    } else if (email) {
      user = await getUserByEmail(email);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's websites count
    const websites = await getAllWebsites(user.id);

    return NextResponse.json({
      user: {
        ...user,
        siteCount: websites.length,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    // Check if user exists
    let user = await getUserByEmail(email);
    
    if (user) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      );
    }
    
    // Create new user
    user = await createUser({
      email,
      passwordHash: password ? await hashPassword(password) : null,
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// Simple password hashing for MVP (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  // For MVP, we'll use a simple hash. In production, use bcrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sitewatch-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Login endpoint
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await getUserByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const hashedPassword = await hashPassword(password);
    
    // For existing users without passwords (created before this update), allow login
    if (user.passwordHash && user.passwordHash !== hashedPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Failed to sign in' },
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

    // Get all user's websites and delete them
    const websites = await getAllWebsites(id);
    for (const website of websites) {
      await deleteWebsite(website.id, id);
    }

    // Note: In a real app, you'd also delete the user from the database
    // For now, we just return success

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
