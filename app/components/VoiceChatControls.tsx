'use client';

import { useState, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface VoiceChatControlsProps {
    onVoiceInput: (text: string) => void;
    onSpeakMessage: (text: string) => void;
    latestAssistantMessage?: string;
    isProcessing?: boolean;
}

export function VoiceChatControls({
    onVoiceInput,
    onSpeakMessage: _onSpeakMessage,
    latestAssistantMessage,
    isProcessing = false,
}: VoiceChatControlsProps) {
    // Silence unused variable warning - kept for future external-speak-button functionality
    void _onSpeakMessage;
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    const {
        isListening,
        transcript,
        interimTranscript,
        isSupported: sttSupported,
        startListening,
        stopListening,
        resetTranscript,
    } = useSpeechRecognition({
        language: 'pt-BR',
        onResult: (text) => {
            // Automatically send when user stops speaking
            if (text.trim()) {
                onVoiceInput(text);
                resetTranscript();
            }
        },
    });

    const {
        speak,
        stop: stopSpeaking,
        isSpeaking,
        isSupported: ttsSupported,
        voices,
        selectedVoice,
        setVoice,
    } = useTextToSpeech({ language: 'pt-BR' });

    // Auto-speak new assistant messages if enabled
    useEffect(() => {
        if (autoSpeak && latestAssistantMessage && !isProcessing) {
            speak(latestAssistantMessage);
        }
    }, [latestAssistantMessage, autoSpeak, isProcessing, speak]);

    const handleMicToggle = () => {
        if (isListening) {
            stopListening();
        } else {
            // Stop any ongoing speech before listening
            stopSpeaking();
            startListening();
        }
    };

    const handleSpeakToggle = () => {
        if (isSpeaking) {
            stopSpeaking();
        } else if (latestAssistantMessage) {
            speak(latestAssistantMessage);
        }
    };

    if (!sttSupported && !ttsSupported) {
        return (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span>🔇</span>
                <span>Voice not supported in this browser</span>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Main Controls */}
            <div className="flex items-center gap-2">
                {/* Microphone Button */}
                {sttSupported && (
                    <button
                        onClick={handleMicToggle}
                        disabled={isProcessing}
                        className={`relative p-3 rounded-full transition-all duration-200 ${isListening
                            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isListening ? 'Stop listening' : 'Start voice input'}
                    >
                        {isListening ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="6" width="12" height="12" rx="1" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}

                        {/* Listening indicator */}
                        {isListening && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                )}

                {/* Speaker Button */}
                {ttsSupported && (
                    <button
                        onClick={handleSpeakToggle}
                        disabled={!latestAssistantMessage}
                        className={`p-3 rounded-full transition-all duration-200 ${isSpeaking
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${!latestAssistantMessage ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isSpeaking ? 'Stop speaking' : 'Speak last message'}
                    >
                        {isSpeaking ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Settings Button */}
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-3 rounded-full transition-all duration-200 ${showSettings
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    title="Voice settings"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>

                {/* Auto-speak Toggle */}
                <button
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    className={`p-2 rounded-lg text-xs font-medium transition-all duration-200 ${autoSpeak
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                        }`}
                    title={autoSpeak ? 'Auto-speak enabled' : 'Auto-speak disabled'}
                >
                    {autoSpeak ? '🔊 Auto' : '🔇 Auto'}
                </button>
            </div>

            {/* Interim Transcript Display */}
            {(isListening || interimTranscript || transcript) && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        <span>{isListening ? 'Listening...' : 'Captured'}</span>
                    </div>
                    <p className="text-gray-900">
                        {transcript}
                        <span className="text-gray-400">{interimTranscript}</span>
                    </p>
                </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <div className="absolute bottom-full mb-2 left-0 right-0 p-4 bg-white rounded-xl shadow-lg border border-gray-200 z-10">
                    <h3 className="font-semibold text-gray-900 mb-3">Voice Settings</h3>

                    {/* Voice Selection */}
                    {voices.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
                            <select
                                value={selectedVoice?.name || ''}
                                onChange={(e) => {
                                    const voice = voices.find(v => v.name === e.target.value);
                                    if (voice) setVoice(voice);
                                }}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                            >
                                {voices.map((voice) => (
                                    <option key={voice.name} value={voice.name}>
                                        {voice.name} ({voice.lang})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Speech Recognition: {sttSupported ? '✅' : '❌'}</span>
                        <span>Text-to-Speech: {ttsSupported ? '✅' : '❌'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
