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
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setRecordType('audio')}
            className={`px-4 py-2 rounded-lg flex items-center ${
              recordType === 'audio' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <Music className="mr-2 h-5 w-5" /> 
            Song Recognition
          </button>
          <button
            onClick={() => setRecordType('humming')}
            className={`px-4 py-2 rounded-lg flex items-center ${
              recordType === 'humming' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <Mic className="mr-2 h-5 w-5" /> 
            Humming Recognition
          </button>
        </div>

        <AudioVisualizer 
          isRecording={isRecording}
          analyzerRef={analyzerRef}
          dataArrayRef={dataArrayRef}
        />

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full p-4 rounded-lg transition-colors ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white flex items-center justify-center`}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <><Loader2 className="animate-spin mr-2" /> Processing...</>
          ) : isRecording ? (
            <span className="flex items-center">
              <span className="animate-pulse mr-2">⚫</span>
              Stop Recording
            </span>
          ) : (
            <>Start Recording</>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {displayResults()}
        </div>
      )}
    </div>
  );
}


