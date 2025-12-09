import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { getComposio } from '@/app/utils/composio';

// Task Planner API - Generates execution plans using AI
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
        const { taskDescription } = body;

        if (!taskDescription) {
            return NextResponse.json(
                { error: 'taskDescription is required' },
                { status: 400 }
            );
        }

        console.log(`[TASK_PLANNER] Generating plan for: "${taskDescription.substring(0, 100)}..."`);

        // Get available toolkits from Composio API
        const composio = getComposio();

        // Fetch toolkits from API
        let toolkitsData: any[] = [];
        try {
            const toolkitsResponse = await fetch('https://backend.composio.dev/api/v3/toolkits', {
                headers: {
                    'x-api-key': process.env.COMPOSIO_API_KEY || '',
                    'Content-Type': 'application/json'
                }
            });
            if (toolkitsResponse.ok) {
                const data = await toolkitsResponse.json();
                toolkitsData = data.items || data || [];
            }
        } catch (e) {
            console.warn('[TASK_PLANNER] Failed to fetch toolkits, continuing without list');
        }

        // Get user's connected accounts
        const connectedAccounts = await composio.connectedAccounts.list({
            userIds: [user.email!]
        });

        const connectedToolkits = connectedAccounts.items?.map((acc: any) =>
            acc.toolkit?.slug || acc.toolkitSlug
        ).filter(Boolean) || [];

        // Generate plan using OpenAI
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
            return NextResponse.json(
                { error: 'OpenAI API key not configured' },
                { status: 500 }
            );
        }

        const availableToolkitsInfo = toolkitsData.slice(0, 50).map((tk: any) => ({
            slug: tk.slug,
            name: tk.name,
            description: tk.description?.substring(0, 100),
            isConnected: connectedToolkits.includes(tk.slug)
        }));

        const systemPrompt = `You are a task planning AI that creates step-by-step execution plans for automation tasks.

Available toolkits (some may require connection):
${JSON.stringify(availableToolkitsInfo, null, 2)}

Connected toolkits for this user: ${connectedToolkits.join(', ') || 'None'}

When creating a plan, you should:
1. Analyze the user's task description
2. Identify which tools/toolkits are needed
3. Create a clear step-by-step plan
4. Indicate which toolkits need to be connected first
5. Be specific about which actions to take

Respond with a JSON object in this exact format:
{
  "summary": "Brief summary of what will be accomplished",
  "requiredToolkits": ["toolkit1", "toolkit2"],
  "missingConnections": ["toolkit that needs to be connected"],
  "steps": [
    {
      "stepNumber": 1,
      "action": "Description of the action",
      "toolkit": "toolkit_slug",
      "tool": "SPECIFIC_TOOL_NAME",
      "expectedOutput": "What this step produces"
    }
  ],
  "estimatedDuration": "Approximate time to complete",
  "warnings": ["Any potential issues or considerations"]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Create an execution plan for this task: ${taskDescription}` }
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[TASK_PLANNER] OpenAI API error:', errorData);
            return NextResponse.json(
                { error: 'Failed to generate plan' },
                { status: 500 }
            );
        }

        const data = await response.json();
        const planContent = data.choices[0]?.message?.content;

        if (!planContent) {
            return NextResponse.json(
                { error: 'No plan generated' },
                { status: 500 }
            );
        }

        let plan;
        try {
            plan = JSON.parse(planContent);
        } catch (e) {
            console.error('[TASK_PLANNER] Failed to parse plan:', planContent);
            return NextResponse.json(
                { error: 'Failed to parse plan' },
                { status: 500 }
            );
        }

        console.log(`[TASK_PLANNER] Plan generated with ${plan.steps?.length || 0} steps`);

        return NextResponse.json({
            plan,
            taskDescription,
            connectedToolkits,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in POST /api/task-planner:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
