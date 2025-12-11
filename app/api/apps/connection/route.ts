import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { getComposio } from '../../../utils/composio';

// Define interfaces for Composio API response types
interface AuthConfig {
  id: string;
  toolkit: string | { slug: string };
}

interface ComposioError extends Error {
  body?: Record<string, unknown>;
}

// GET: Check connection status for all toolkits for authenticated user
export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const composio = getComposio();

    // Fetch connected accounts for the user
    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [user.email]
    });

    console.log('Connected accounts for user:', user.email, `(${connectedAccounts.items?.length || 0} accounts)`);

    // Get detailed info for each connected account
    const detailedAccounts = await Promise.all(
      (connectedAccounts.items || []).map(async (account) => {
        try {
          const accountDetails = await composio.connectedAccounts.get(account.id);
          // Log only essential info without sensitive data
          console.log('Account details for', account.id, ':', {
            toolkit: accountDetails.toolkit?.slug,
            connectionId: accountDetails.id,
            authConfigId: accountDetails.authConfig?.id,
            status: accountDetails.status
          });
          return accountDetails;
        } catch (error) {
          console.error('Error fetching account details for', account.id, ':', error);
          return account; // fallback to original if details fetch fails
        }
      })
    );

    return NextResponse.json({ connectedAccounts: detailedAccounts });
  } catch (error) {
    console.error('Error fetching connection status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection status' },
      { status: 500 }
    );
  }
}

// POST: Create auth link for connecting a toolkit
export async function POST(request: NextRequest) {
  const timestamp = () => new Date().toISOString();
  const log = (msg: string, ...args: unknown[]) => console.log(`[${timestamp()}] 🔗 CONNECTION:`, msg, ...args);
  const logError = (msg: string, ...args: unknown[]) => console.error(`[${timestamp()}] ❌ CONNECTION ERROR:`, msg, ...args);

  try {
    const body = await request.json();
    let authConfigId = body.authConfigId;
    const toolkitSlug = body.toolkitSlug;

    log(`Request received - toolkit: ${toolkitSlug}, authConfigId: ${authConfigId || 'not provided'}`);

    if (!authConfigId && !toolkitSlug) {
      logError('Missing required parameters');
      return NextResponse.json(
        { error: 'Either authConfigId or toolkitSlug is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const composio = getComposio();

    // If no authConfigId provided, try to find one or create one
    if (!authConfigId && toolkitSlug) {
      log(`Searching for existing auth config for ${toolkitSlug}...`);

      // 1. List existing configs to see if we can reuse one
      // Note: In a real multi-tenant app, you might want specific naming conventions
      const authConfigs = await composio.authConfigs.list();

      const existingConfig = authConfigs.items.find((config: AuthConfig) => {
        // Handle both string and object formats for toolkit
        const configToolkit = typeof config.toolkit === 'string' ? config.toolkit : config.toolkit?.slug;
        return configToolkit === toolkitSlug;
      });

      if (existingConfig) {
        log(`Found existing auth config: ${existingConfig.id}`);
        authConfigId = existingConfig.id;
      } else {
        log(`No existing auth config found. Creating new one...`);
        try {
          // Use toolkitSlug as the argument based on SDK type definition
          const newConfig = await composio.authConfigs.create(toolkitSlug);
          log(`Created new auth config: ${newConfig.id}`);
          authConfigId = newConfig.id;
        } catch (createError) {
          const err = createError as ComposioError;
          const errorMessage = err?.message || String(createError);
          // Check for "no auth toolkit" error
          if (errorMessage.includes('no auth toolkit') || (err?.body && JSON.stringify(err.body).includes('no auth toolkit'))) {
            log(`Toolkit ${toolkitSlug} is no-auth type. Skipping auth config.`);
            authConfigId = toolkitSlug;
          } else {
            logError(`Failed to create auth config:`, createError);
            // Fallback: try object syntax just in case runtime differs from type def
            try {
              log('Retrying with object syntax...');
              const newConfig = await composio.authConfigs.create({
                handle: toolkitSlug,
                toolkit: toolkitSlug
              } as unknown as string);
              log(`Created auth config (fallback): ${newConfig.id}`);
              authConfigId = newConfig.id;
            } catch (fallbackError) {
              logError('Fallback creation also failed:', fallbackError);
              throw createError;
            }
          }
        }
      }
    }

    // If it's a no-auth toolkit (detected above), skip the link creation
    if (authConfigId === toolkitSlug) {
      log(`No-auth toolkit detected. Returning success without redirect.`);
      return NextResponse.json({
        status: 'success',
        redirectUrl: null // No redirect needed
      });
    }

    log(`Creating auth link - user: ${user.email}, authConfig: ${authConfigId}`);

    const connectionRequest = await composio.connectedAccounts.link(
      user.email,
      authConfigId,
      {
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/apps`
      }
    );

    log(`Auth link created successfully. Redirect URL: ${connectionRequest.redirectUrl}`);
    return NextResponse.json(connectionRequest);
  } catch (error) {
    logError(`FINAL ERROR:`, error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to create auth link', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE: Disconnect a toolkit
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    console.log('Disconnecting account:', accountId, 'for user:', user.email);

    const composio = getComposio();
    const result = await composio.connectedAccounts.delete(accountId);

    console.log('Disconnect result:', result);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}