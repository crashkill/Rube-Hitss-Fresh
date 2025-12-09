import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

// Type definitions
interface ScheduledTask {
    id: string;
    user_id: string;
    name: string;
    description: string;
    cron_expression: string;
    toolkits: string[];
    is_active: boolean;
    last_run_at: string | null;
    next_run_at: string | null;
    run_count: number;
    created_at: string;
    updated_at: string;
}

// Helper function to calculate next run time from cron expression
function calculateNextRun(cronExpression: string): Date {
    // Simple cron parser - handles basic patterns
    // Format: minute hour day month weekday
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
        throw new Error('Invalid cron expression');
    }

    const now = new Date();
    const next = new Date(now);

    // For now, just add 1 hour as a placeholder
    // In production, use a proper cron parser like 'cron-parser'
    next.setHours(next.getHours() + 1);

    return next;
}

// GET: List all scheduled tasks for the authenticated user
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const { data: tasks, error } = await supabase
            .from('scheduled_tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching scheduled tasks:', error);
            return NextResponse.json(
                { error: 'Failed to fetch scheduled tasks' },
                { status: 500 }
            );
        }

        return NextResponse.json({ tasks: tasks || [] });
    } catch (error) {
        console.error('Error in GET /api/scheduled-tasks:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Create a new scheduled task
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, description, cronExpression, toolkits } = body;

        if (!name || !description || !cronExpression) {
            return NextResponse.json(
                { error: 'name, description, and cronExpression are required' },
                { status: 400 }
            );
        }

        // Calculate next run time
        let nextRunAt: Date;
        try {
            nextRunAt = calculateNextRun(cronExpression);
        } catch (e) {
            return NextResponse.json(
                { error: 'Invalid cron expression' },
                { status: 400 }
            );
        }

        const { data: task, error } = await supabase
            .from('scheduled_tasks')
            .insert({
                user_id: user.id,
                name,
                description,
                cron_expression: cronExpression,
                toolkits: toolkits || [],
                next_run_at: nextRunAt.toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating scheduled task:', error);
            return NextResponse.json(
                { error: 'Failed to create scheduled task' },
                { status: 500 }
            );
        }

        return NextResponse.json({ task }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/scheduled-tasks:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH: Update a scheduled task
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { id, name, description, cronExpression, toolkits, isActive } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Task id is required' },
                { status: 400 }
            );
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (toolkits !== undefined) updates.toolkits = toolkits;
        if (isActive !== undefined) updates.is_active = isActive;

        if (cronExpression !== undefined) {
            updates.cron_expression = cronExpression;
            try {
                updates.next_run_at = calculateNextRun(cronExpression).toISOString();
            } catch (e) {
                return NextResponse.json(
                    { error: 'Invalid cron expression' },
                    { status: 400 }
                );
            }
        }

        const { data: task, error } = await supabase
            .from('scheduled_tasks')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating scheduled task:', error);
            return NextResponse.json(
                { error: 'Failed to update scheduled task' },
                { status: 500 }
            );
        }

        return NextResponse.json({ task });
    } catch (error) {
        console.error('Error in PATCH /api/scheduled-tasks:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE: Delete a scheduled task
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Task id is required' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('scheduled_tasks')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting scheduled task:', error);
            return NextResponse.json(
                { error: 'Failed to delete scheduled task' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/scheduled-tasks:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
