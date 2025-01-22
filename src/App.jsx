import { useState, useRef, useEffect } from 'react';
import { Mic, Music, Loader2 } from 'lucide-react';
import AudioVisualizer from './components/AudioVisualizer';

export default function AudioRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [recordType, setRecordType] = useState('audio');
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const analyzerRef = useRef(null);
  const dataArrayRef = useRef(null);
  const audioContextRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      // Set up audio analyzer
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      source.connect(analyzerRef.current);
      
      dataArrayRef.current = new Uint8Array(analyzerRef.current.frequencyBinCount);
      
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await sendAudioForRecognition(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          await audioContextRef.current.close();
        }
      };

      mediaRecorder.current.start(200);
      setIsRecording(true);
      setResult(null);
      setError(null);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioForRecognition = async (audioBlob) => {
    setIsProcessing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('recordType', recordType);

    try {
      const response = await fetch('http://localhost:5000/api/recognize', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Recognition failed');
      }

      const data = await response.json();
      console.log('Recognition response:', data);
      
      if (data.status?.code !== 0 && data.status?.msg) {
        throw new Error(data.status.msg);
      }
      
      setResult(data);
    } catch (err) {
      console.error('Recognition error:', err);
      setError(err.message || 'Failed to recognize audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const displayResults = () => {
    if (!result?.metadata) {
      return <p className="text-gray-700">No matches found. Please try again.</p>;
    }

    // Handle both direct music matches and humming matches
    const matches = result.metadata.music || result.metadata.humming || [];
    
    if (matches.length === 0) {
      return <p className="text-gray-700">No matches found. Please try again.</p>;
    }

    return matches.map((track, index) => (
      <div key={index} className="p-4 bg-white shadow rounded-lg mb-4">
        <h3 className="font-bold text-lg">{track.title}</h3>
        <p className="text-gray-600">Artist: {track.artists?.[0]?.name || 'Unknown'}</p>
        {track.album?.name && (
          <p className="text-gray-600">Title: {track.album.name}</p>
        )}
        {track.score && (
          <p className="text-gray-600">Match Score: {Math.round(track.score)}%</p>
        )}
        {track.external_metadata?.spotify && (
          <a
            href={`https://open.spotify.com/track/${track.external_metadata.spotify.track.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 mt-2 inline-block"
          >
            Open in Spotify
          </a>
        )}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Top Section */}
        <div className="flex flex-col items-center space-y-6">
          {/* Mode Toggle */}
          <div className="bg-gray-900/50 backdrop-blur-sm p-1 rounded-full">
            <div className="flex space-x-1">
              <button
                onClick={() => setRecordType('audio')}
                className={`px-6 py-2 rounded-full transition-all duration-300 ${
                  recordType === 'audio'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Song Recognition
              </button>
              <button
                onClick={() => setRecordType('humming')}
                className={`px-6 py-2 rounded-full transition-all duration-300 ${
                  recordType === 'humming'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Melody Recognition
              </button>
            </div>
          </div>

          {/* Visualizer Container */}
          <div className="w-full h-[300px] aspect-video bg-gray-900/30 backdrop-blur-md rounded-2xl shadow-xl border border-gray-800/50 flex justify-center items-center">
            <AudioVisualizer 
              isRecording={isRecording}
              analyzerRef={analyzerRef}
              dataArrayRef={dataArrayRef}
            />
          </div>

          {/* Record Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-full max-w-md px-8 py-4 rounded-full font-medium transition-all duration-300 
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/25'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
              } 
              shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
              transform hover:scale-[1.02] active:scale-[0.98]`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <Loader2 className="animate-spin mr-2" />
                Processing...
              </span>
            ) : isRecording ? (
              <span className="flex items-center justify-center">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                Stop Recording
              </span>
            ) : (
              'Start Recording'
            )}
          </button>
        </div>

        {/* Results Section */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {(result.metadata?.music || result.metadata?.humming || []).map((track, index) => (
              <div 
                key={index}
                className="p-6 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800/50 
                          transition-all duration-300 hover:border-gray-700/50 hover:bg-gray-900/70"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-white">{track.title}</h3>
                    <p className="text-gray-400">{track.artists?.[0]?.name || 'Unknown Artist'}</p>
                    {track.album?.name && (
                      <p className="text-gray-500 text-sm">{track.album.name}</p>
                    )}
                  </div>
                  {track.score && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                      {Math.round(track.score)}% Match
                    </span>
                  )}
                </div>
                
                {track.external_metadata?.spotify && (
                  <a
                    href={`https://open.spotify.com/track/${track.external_metadata.spotify.track.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center px-4 py-2 bg-green-600/20 text-green-400 
                             rounded-full text-sm hover:bg-green-600/30 transition-colors duration-300"
                  >
                    Open in Spotify
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

