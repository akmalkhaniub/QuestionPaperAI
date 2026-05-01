import React, { useRef, useState, useEffect } from 'react';
import ScanResultVisualizer from '../components/ScanResultVisualizer';

const ScanSheet: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
      setResult(null);
      setError(null);
      setShowCamera(false);
      stopCamera();
    }
  };

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleUseCamera = async () => {
    setShowCamera(true);
    setResult(null);
    setError(null);
    try {
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      console.log('Camera access granted, stream set.');
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. ' + (err && err.message ? err.message : '')); // Show error details
      setShowCamera(false);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line
  }, []);

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' });
          setImage(file);
          setPreview(URL.createObjectURL(blob));
          setShowCamera(false);
          stopCamera();
        }
      }, 'image/jpeg');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append('file', image);
    try {
      const res = await fetch('/api/scan-sheet', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to scan sheet');
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Scan Answer Sheet</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-2 border border-red-300">
            <strong>Camera Error:</strong> {error}
          </div>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        <div className="flex gap-4">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleCaptureClick}
          >
            Upload Image
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-green-600 text-white rounded"
            onClick={handleUseCamera}
            disabled={cameraActive}
          >
            {cameraActive ? 'Camera Active' : 'Use Camera'}
          </button>
        </div>
        {showCamera && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <video
              ref={videoRef}
              className="rounded border shadow max-w-full max-h-64"
              autoPlay
              playsInline
              style={{ width: '100%' }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleTakePhoto}
              >
                Capture Photo
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={() => { setShowCamera(false); stopCamera(); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {(preview && !showCamera) && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <img src={preview} alt="Preview" className="max-h-48 rounded shadow" />
            <button
              type="button"
              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
              onClick={() => { setImage(null); setPreview(null); setResult(null); setError(null); }}
            >
              Remove
            </button>
          </div>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded w-full"
          disabled={!image || loading}
        >
          {loading ? 'Scanning...' : 'Scan Sheet'}
        </button>
      </form>
      {/* Step-by-step visual feedback */}
      <div className="mt-6">
        <ol className="list-decimal list-inside text-gray-700 space-y-1">
          <li className={image ? 'text-green-600 font-semibold' : ''}>1. Upload or capture an answer sheet image</li>
          <li className={loading ? 'text-blue-600 font-semibold' : result ? 'text-green-600 font-semibold' : ''}>
            2. Scan the image for answers
          </li>
          <li className={result ? 'text-green-600 font-semibold' : ''}>3. View detected answers and marks</li>
        </ol>
      </div>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Scan Result</h2>
          {/* Visualize detected marks over the image if possible */}
          {preview && result.marks && Array.isArray(result.marks) && result.marks.length > 0 ? (
            <ScanResultVisualizer imageUrl={preview} marks={result.marks} />
          ) : null}
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-sm mt-4">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ScanSheet;
