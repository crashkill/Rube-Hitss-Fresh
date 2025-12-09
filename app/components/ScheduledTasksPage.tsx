'use client';

import { useState, useEffect } from 'react';

interface ScheduledTask {
    id: string;
    name: string;
    description: string;
    cron_expression: string;
    toolkits: string[];
    is_active: boolean;
    last_run_at: string | null;
    next_run_at: string | null;
    run_count: number;
    created_at: string;
}

interface TaskPlan {
    summary: string;
    requiredToolkits: string[];
    missingConnections: string[];
    steps: Array<{
        stepNumber: number;
        action: string;
        toolkit: string;
        tool: string;
        expectedOutput: string;
    }>;
    estimatedDuration: string;
    warnings: string[];
}

// Cron presets for easy selection
const CRON_PRESETS = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at 9 AM', value: '0 9 * * *' },
    { label: 'Every day at 6 PM', value: '0 18 * * *' },
    { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
    { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
    { label: 'First day of month', value: '0 9 1 * *' },
];

export function ScheduledTasksPage() {
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPlannerModal, setShowPlannerModal] = useState(false);
    const [plannerInput, setPlannerInput] = useState('');
    const [generatingPlan, setGeneratingPlan] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<TaskPlan | null>(null);

    // Form state
    const [newTask, setNewTask] = useState({
        name: '',
        description: '',
        cronExpression: '0 9 * * *',
        toolkits: [] as string[],
    });

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/scheduled-tasks');
            const data = await response.json();
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const generatePlan = async () => {
        if (!plannerInput.trim()) return;

        setGeneratingPlan(true);
        try {
            const response = await fetch('/api/task-planner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskDescription: plannerInput }),
            });

            const data = await response.json();
            if (data.plan) {
                setCurrentPlan(data.plan);
                // Pre-fill the task form with plan data
                setNewTask({
                    name: data.plan.summary?.substring(0, 50) || 'New Task',
                    description: plannerInput,
                    cronExpression: '0 9 * * *',
                    toolkits: data.plan.requiredToolkits || [],
                });
            }
        } catch (error) {
            console.error('Error generating plan:', error);
        } finally {
            setGeneratingPlan(false);
        }
    };

    const createTask = async () => {
        try {
            const response = await fetch('/api/scheduled-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask),
            });

            if (response.ok) {
                fetchTasks();
                setShowCreateModal(false);
                setNewTask({ name: '', description: '', cronExpression: '0 9 * * *', toolkits: [] });
            }
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    const toggleTask = async (task: ScheduledTask) => {
        try {
            await fetch('/api/scheduled-tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: task.id, isActive: !task.is_active }),
            });
            fetchTasks();
        } catch (error) {
            console.error('Error toggling task:', error);
        }
    };

    const deleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this scheduled task?')) return;

        try {
            await fetch('/api/scheduled-tasks', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId }),
            });
            fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Scheduled Tasks</h1>
                    <p className="text-gray-600 mt-1">Automate workflows to run at specified times</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowPlannerModal(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <span>🧠</span>
                        <span>AI Planner</span>
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                    >
                        <span>+</span>
                        <span>New Task</span>
                    </button>
                </div>
            </div>

            {/* Tasks Grid */}
            {tasks.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="text-4xl mb-4">📅</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Tasks</h3>
                    <p className="text-gray-600 mb-6">Create your first scheduled task to automate workflows</p>
                    <button
                        onClick={() => setShowPlannerModal(true)}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                        Create with AI Planner
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`bg-white rounded-xl border p-6 ${task.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-gray-900">{task.name}</h3>
                                        <span
                                            className={`px-2 py-0.5 text-xs rounded-full ${task.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            {task.is_active ? 'Active' : 'Paused'}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 mt-1">{task.description}</p>

                                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <span>⏰</span>
                                            <code className="bg-gray-100 px-2 py-0.5 rounded">{task.cron_expression}</code>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span>▶️</span>
                                            Runs: {task.run_count}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span>📅</span>
                                            Next: {formatDate(task.next_run_at)}
                                        </span>
                                    </div>

                                    {task.toolkits.length > 0 && (
                                        <div className="flex gap-2 mt-3">
                                            {task.toolkits.map((toolkit) => (
                                                <span
                                                    key={toolkit}
                                                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                                                >
                                                    {toolkit}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleTask(task)}
                                        className={`p-2 rounded-lg ${task.is_active
                                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                            }`}
                                        title={task.is_active ? 'Pause' : 'Resume'}
                                    >
                                        {task.is_active ? '⏸️' : '▶️'}
                                    </button>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Task Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
                        <h2 className="text-xl font-bold mb-4">Create Scheduled Task</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newTask.name}
                                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="Daily Report Generator"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    rows={3}
                                    placeholder="Describe what this task should do..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                                <select
                                    value={newTask.cronExpression}
                                    onChange={(e) => setNewTask({ ...newTask, cronExpression: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                >
                                    {CRON_PRESETS.map((preset) => (
                                        <option key={preset.value} value={preset.value}>
                                            {preset.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Cron: <code className="bg-gray-100 px-1 rounded">{newTask.cronExpression}</code>
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createTask}
                                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                            >
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Planner Modal */}
            {showPlannerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">🧠</span>
                            <h2 className="text-xl font-bold">AI Task Planner</h2>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Describe what you want to automate, and AI will create an execution plan.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <textarea
                                    value={plannerInput}
                                    onChange={(e) => setPlannerInput(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    rows={4}
                                    placeholder="Example: Every morning, fetch the latest news about my company and send a summary to my Slack channel"
                                />
                            </div>

                            <button
                                onClick={generatePlan}
                                disabled={generatingPlan || !plannerInput.trim()}
                                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {generatingPlan ? (
                                    <>
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                        <span>Generating Plan...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span>
                                        <span>Generate Plan</span>
                                    </>
                                )}
                            </button>

                            {/* Display Generated Plan */}
                            {currentPlan && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-xl border">
                                    <h3 className="font-semibold text-gray-900 mb-2">{currentPlan.summary}</h3>

                                    {currentPlan.missingConnections.length > 0 && (
                                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-yellow-800 font-medium">⚠️ Connect these apps first:</p>
                                            <div className="flex gap-2 mt-2">
                                                {currentPlan.missingConnections.map((toolkit) => (
                                                    <span key={toolkit} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded">
                                                        {toolkit}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <h4 className="font-medium text-gray-700">Execution Steps:</h4>
                                        {currentPlan.steps.map((step) => (
                                            <div key={step.stepNumber} className="flex gap-3 p-3 bg-white rounded-lg border">
                                                <div className="flex-shrink-0 w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold">
                                                    {step.stepNumber}
                                                </div>
                                                <div>
                                                    <p className="text-gray-900">{step.action}</p>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Using: <code className="bg-gray-100 px-1 rounded">{step.toolkit}.{step.tool}</code>
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {currentPlan.warnings.length > 0 && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-blue-800 font-medium">ℹ️ Notes:</p>
                                            <ul className="list-disc list-inside text-blue-700 text-sm mt-1">
                                                {currentPlan.warnings.map((warning, i) => (
                                                    <li key={i}>{warning}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setShowPlannerModal(false);
                                            setShowCreateModal(true);
                                        }}
                                        className="w-full mt-4 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                    >
                                        Create Scheduled Task from Plan
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setShowPlannerModal(false);
                                setCurrentPlan(null);
                                setPlannerInput('');
                            }}
                            className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
