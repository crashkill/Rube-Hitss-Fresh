'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTextToSpeechOptions {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    language?: string;
}

interface TextToSpeechResult {
    speak: (text: string) => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    isSpeaking: boolean;
    isPaused: boolean;
    isSupported: boolean;
    voices: SpeechSynthesisVoice[];
    selectedVoice: SpeechSynthesisVoice | null;
    setVoice: (voice: SpeechSynthesisVoice) => void;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): TextToSpeechResult {
    const {
        rate = 1,
        pitch = 1,
        volume = 1,
        language = 'pt-BR',
    } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setIsSupported(true);

            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                setVoices(availableVoices);

                // Try to find a Portuguese voice, or fallback to first available
                const ptVoice = availableVoices.find(v => v.lang.startsWith('pt'));
                const defaultVoice = ptVoice || availableVoices[0];

                if (defaultVoice && !selectedVoice) {
                    setSelectedVoice(defaultVoice);
                }
            };

            // Load voices immediately and also on voiceschanged event
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;

            return () => {
                window.speechSynthesis.onvoiceschanged = null;
            };
        }
    }, [selectedVoice]);

    const speak = useCallback((text: string) => {
        if (!isSupported || !text.trim()) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;
        utterance.lang = language;

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            setIsSpeaking(false);
            setIsPaused(false);
        };

        utterance.onpause = () => {
            setIsPaused(true);
        };

        utterance.onresume = () => {
            setIsPaused(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [isSupported, rate, pitch, volume, language, selectedVoice]);

    const stop = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setIsPaused(false);
        }
    }, [isSupported]);

    const pause = useCallback(() => {
        if (isSupported && isSpeaking) {
            window.speechSynthesis.pause();
        }
    }, [isSupported, isSpeaking]);

    const resume = useCallback(() => {
        if (isSupported && isPaused) {
            window.speechSynthesis.resume();
        }
    }, [isSupported, isPaused]);

    const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
        setSelectedVoice(voice);
    }, []);

    return {
        speak,
        stop,
        pause,
        resume,
        isSpeaking,
        isPaused,
        isSupported,
        voices,
        selectedVoice,
        setVoice,
    };
}
