import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createClient } from '@/app/utils/supabase/server';

const execAsync = promisify(exec);

// Ensure temp directory exists
const TEMP_DIR = path.join(process.cwd(), 'temp');

async function ensureTempDir() {
    if (!existsSync(TEMP_DIR)) {
        await mkdir(TEMP_DIR, { recursive: true });
    }
}

// POST: Process video with FFmpeg
export async function POST(request: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const operation = formData.get('operation') as string;
        const options = formData.get('options') as string;

        if (!operation) {
            return NextResponse.json(
                { error: 'operation is required' },
                { status: 400 }
            );
        }

        await ensureTempDir();

        let inputPath = '';
        let outputPath = '';

        // Handle file upload if provided
        if (file) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const inputFilename = `input_${Date.now()}_${file.name}`;
            inputPath = path.join(TEMP_DIR, inputFilename);
            await writeFile(inputPath, buffer);
        }

        // Define output path
        const outputFilename = `output_${Date.now()}.mp4`;
        outputPath = path.join(TEMP_DIR, outputFilename);

        let ffmpegCommand = '';

        switch (operation) {
            case 'convert':
                // Convert video format
                if (!inputPath) {
                    return NextResponse.json({ error: 'File required for convert operation' }, { status: 400 });
                }
                ffmpegCommand = `ffmpeg -i "${inputPath}" ${options || ''} "${outputPath}" -y`;
                break;

            case 'dark-filter':
                // Apply dark/cinematic filter
                if (!inputPath) {
                    return NextResponse.json({ error: 'File required for dark-filter operation' }, { status: 400 });
                }
                ffmpegCommand = `ffmpeg -i "${inputPath}" -vf "eq=brightness=-0.1:contrast=1.2:saturation=0.8,curves=vintage" -c:a copy "${outputPath}" -y`;
                break;

            case 'create-slideshow':
                // Create slideshow from images (expects images in options)
                const parsedOptions = JSON.parse(options || '{}');
                const duration = parsedOptions.duration || 3;
                ffmpegCommand = `ffmpeg -framerate 1/${duration} -pattern_type glob -i "${inputPath}" -c:v libx264 -r 30 -pix_fmt yuv420p "${outputPath}" -y`;
                break;

            case 'add-audio':
                // Add audio to video
                const audioPath = formData.get('audio') as File;
                if (!audioPath) {
                    return NextResponse.json({ error: 'Audio file required' }, { status: 400 });
                }
                const audioBytes = await audioPath.arrayBuffer();
                const audioBuffer = Buffer.from(audioBytes);
                const audioFilename = `audio_${Date.now()}_${audioPath.name}`;
                const audioInputPath = path.join(TEMP_DIR, audioFilename);
                await writeFile(audioInputPath, audioBuffer);

                ffmpegCommand = `ffmpeg -i "${inputPath}" -i "${audioInputPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 "${outputPath}" -y`;
                break;

            case 'extract-audio':
                // Extract audio from video
                if (!inputPath) {
                    return NextResponse.json({ error: 'File required for extract-audio operation' }, { status: 400 });
                }
                outputPath = path.join(TEMP_DIR, `output_${Date.now()}.mp3`);
                ffmpegCommand = `ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}" -y`;
                break;

            case 'thumbnail':
                // Generate thumbnail from video
                if (!inputPath) {
                    return NextResponse.json({ error: 'File required for thumbnail operation' }, { status: 400 });
                }
                outputPath = path.join(TEMP_DIR, `thumb_${Date.now()}.jpg`);
                const timestamp = options || '00:00:01';
                ffmpegCommand = `ffmpeg -i "${inputPath}" -ss ${timestamp} -vframes 1 "${outputPath}" -y`;
                break;

            case 'info':
                // Get video information
                if (!inputPath) {
                    return NextResponse.json({ error: 'File required for info operation' }, { status: 400 });
                }
                ffmpegCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`;

                try {
                    const { stdout } = await execAsync(ffmpegCommand);
                    // Cleanup input file
                    if (inputPath) await unlink(inputPath).catch(() => { });
                    return NextResponse.json({ info: JSON.parse(stdout) });
                } catch (error: any) {
                    if (inputPath) await unlink(inputPath).catch(() => { });
                    return NextResponse.json({ error: 'Failed to get video info', details: error.message }, { status: 500 });
                }

            default:
                return NextResponse.json(
                    { error: `Unknown operation: ${operation}` },
                    { status: 400 }
                );
        }

        console.log(`[FFMPEG] Executing: ${ffmpegCommand}`);

        try {
            const { stdout, stderr } = await execAsync(ffmpegCommand, { maxBuffer: 50 * 1024 * 1024 });
            console.log(`[FFMPEG] Success: ${stdout}`);
            if (stderr) console.log(`[FFMPEG] stderr: ${stderr}`);

            // Read output file and return as base64
            const fs = await import('fs/promises');
            const outputBuffer = await fs.readFile(outputPath);
            const base64 = outputBuffer.toString('base64');
            const mimeType = outputPath.endsWith('.mp3') ? 'audio/mpeg' :
                outputPath.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4';

            // Cleanup
            if (inputPath) await unlink(inputPath).catch(() => { });
            await unlink(outputPath).catch(() => { });

            return NextResponse.json({
                success: true,
                data: `data:${mimeType};base64,${base64}`,
                filename: path.basename(outputPath)
            });

        } catch (error: any) {
            console.error('[FFMPEG] Error:', error);
            // Cleanup on error
            if (inputPath) await unlink(inputPath).catch(() => { });
            if (outputPath) await unlink(outputPath).catch(() => { });

            return NextResponse.json(
                { error: 'FFmpeg operation failed', details: error.message },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Error in POST /api/video:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// GET: Check FFmpeg availability
export async function GET() {
    try {
        const { stdout } = await execAsync('ffmpeg -version');
        const version = stdout.split('\n')[0];

        return NextResponse.json({
            available: true,
            version,
            operations: [
                'convert',
                'dark-filter',
                'create-slideshow',
                'add-audio',
                'extract-audio',
                'thumbnail',
                'info'
            ]
        });
    } catch (error) {
        return NextResponse.json({
            available: false,
            error: 'FFmpeg not installed or not in PATH',
            installInstructions: 'Run: winget install ffmpeg OR choco install ffmpeg'
        });
    }
}
