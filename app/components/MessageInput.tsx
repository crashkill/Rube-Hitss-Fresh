'use client';

import { KeyboardEvent, useState, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  placeholder: string;
  isLoading: boolean;
  latestAssistantMessage?: string;
}

export function MessageInput({
  value,
  onChange,
  onSendMessage,
  placeholder,
  isLoading,
  latestAssistantMessage,
}: MessageInputProps) {
  const placeholderSuggestions = [
    "Hey Rube, can you fetch my emails",
    "Hey Rube, can you search my twitter",
    "Hey Rube, can you fetch the reddit posts in r/localllama"
  ];

  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [displayPlaceholder, setDisplayPlaceholder] = useState(placeholderSuggestions[0]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [lastSpokenMessage, setLastSpokenMessage] = useState<string | null>(null);

  // Speech Recognition
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: sttSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    language: 'pt-BR',
    continuous: true,
  });

  // Text-to-Speech
  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isSupported: ttsSupported,
  } = useTextToSpeech({ language: 'pt-BR' });

  // Update input with transcript
  useEffect(() => {
    if (transcript) {
      onChange(transcript);
    }
  }, [transcript, onChange]);

  // Auto-speak new assistant messages
  useEffect(() => {
    if (autoSpeak && latestAssistantMessage && latestAssistantMessage !== lastSpokenMessage && !isLoading) {
      speak(latestAssistantMessage);
      setLastSpokenMessage(latestAssistantMessage);
    }
  }, [latestAssistantMessage, autoSpeak, isLoading, speak, lastSpokenMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % placeholderSuggestions.length;
        setDisplayPlaceholder(placeholderSuggestions[nextIndex]);
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const messageToSend = value || transcript || interimTranscript;
    if (messageToSend.trim()) {
      onSendMessage(messageToSend);
      onChange('');
      if (isListening) {
        stopListening();
      }
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      // Send message if there's content
      if (transcript.trim()) {
        handleSend();
      }
    } else {
      stopSpeaking();
      onChange('');
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

  return (
    <div className="input-bar">
      {/* Listening Indicator */}
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-100 rounded-t-xl">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-sm text-red-700">Listening...</span>
          {interimTranscript && (
            <span className="text-sm text-red-500 italic ml-2">{interimTranscript}</span>
          )}
        </div>
      )}

      <div className="flex-1 text-neutral-700">
        <textarea
          rows={2}
          value={isListening ? (transcript + interimTranscript) : value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="font-inter m-1 w-full resize-none border-0 bg-transparent px-2 sm:px-3 py-2 text-sm leading-relaxed text-gray-900 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={isListening ? "Speak now..." : displayPlaceholder}
          disabled={isListening}
        />
      </div>
      <div className="flex w-full items-center justify-between gap-1 pt-2">
        <div className="flex items-center gap-1">
          {/* Plus/Attach button */}
          <button
            type="button"
            className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-100 focus:outline-none bg-gray-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-plus text-neutral-600"
            >
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
          </button>

          {/* Auto-speak Toggle */}
          {ttsSupported && (
            <button
              type="button"
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all duration-200 focus:outline-none ${autoSpeak
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
            >
              {autoSpeak ? '🔊' : '🔇'}
            </button>
          )}

          {/* Speak Last Response */}
          {ttsSupported && latestAssistantMessage && (
            <button
              type="button"
              onClick={handleSpeakToggle}
              className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all duration-200 focus:outline-none ${isSpeaking
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              title={isSpeaking ? 'Stop speaking' : 'Speak last response'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isSpeaking ? (
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                ) : (
                  <>
                    <path d="M15.536 8.464a5 5 0 010 7.072" />
                    <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Microphone Button */}
          {sttSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={isLoading}
              className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all duration-200 focus:outline-none ${isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-600 hover:bg-gray-100 bg-gray-50'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isListening ? 'Stop & Send' : 'Voice input'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-mic"
              >
                {isListening ? (
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                ) : (
                  <>
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" x2="12" y1="19" y2="22"></line>
                  </>
                )}
              </svg>
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={(!value.trim() && !transcript.trim()) || isLoading}
            className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gray-900 text-white transition-all duration-200 hover:bg-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-arrow-up"
            >
              <path d="m5 12 7-7 7 7"></path>
              <path d="M12 19V5"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}