import React, { useState, useRef, useEffect } from 'react';
import { X, Eraser, Upload, Check, Pencil, AlertCircle } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  currentTtdUrl: string;
  onSaveSuccess: (newTtdUrl: string) => void;
}

export default function SignatureModal({
  isOpen,
  onClose,
  username,
  currentTtdUrl,
  onSaveSuccess
}: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Drawing states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  // File upload states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState('');
  const [fileName, setFileName] = useState('');

  // Reset states when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setUploadedBase64('');
      setFileName('');
      // Give DOM time to update so canvas is available
      setTimeout(() => {
        initCanvas();
      }, 100);
    }
  }, [isOpen, activeTab]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset size to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 200; // Fixed high-def aspect ratio height

    // Standard canvas stylings
    ctx.strokeStyle = '#1e1b4b'; // Deep navy blue
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Fill canvas with white (to ensure it has a solid background when saving)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  if (!isOpen) return null;

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const coords = getEventCoords(e);
    lastX.current = coords.x;
    lastY.current = coords.y;
    
    // Start drawing dot
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getEventCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastX.current = coords.x;
    lastY.current = coords.y;
    
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    initCanvas();
  };

  const getEventCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Map viewport coordinates back to canvas absolute coordinates
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Upload handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    if (!file.type.includes('image/')) {
      setErrorMsg('Mohon unggah file gambar (PNG/JPEG) saja.');
      return;
    }

    setFileName(file.name);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        setUploadedBase64(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit handler
  const handleSaveSignature = async () => {
    let base64Payload = '';

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Check if canvas is empty (completely white) by analyzing some pixel bytes
      // To be simple, we just generate the base64 URL directly
      base64Payload = canvas.toDataURL('image/png');
    } else {
      if (!uploadedBase64) {
        setErrorMsg('Silakan pilih file gambar tanda tangan terlebih dahulu.');
        return;
      }
      base64Payload = uploadedBase64;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/users/signature/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          ttdBase64: base64Payload
        })
      });

      const result = await response.json();
      if (result.success) {
        setSuccessMsg('Tanda tangan digital Anda berhasil disimpan!');
        onSaveSuccess(result.ttdUrl);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(result.message || 'Gagal menyimpan tanda tangan.');
      }
    } catch (err: any) {
      console.error('Signature save error:', err);
      setErrorMsg('Gagal menyambung ke server: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to get image source bypassing CORS using proxy
  const getSignaturePreviewSrc = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url; // Already a local base64 string
    // Route it through the local server web proxy to avoid iframe sandbox CORS errors
    return `/api/drive-proxy?url=${encodeURIComponent(url)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Tanda Tangan Online</h3>
              <p className="text-[10px] text-slate-400">Atur & simpan identitas tanda tangan persetujuan resmi Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-5 space-y-5">
          
          {/* Current signature display */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Tanda Tangan Aktif Saat Ini:</h4>
            {currentTtdUrl ? (
              <div className="bg-white p-2 border rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={getSignaturePreviewSrc(currentTtdUrl)}
                  alt="Tanda Tangan Digital Saya"
                  className="h-20 object-contain"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="text-xs font-bold text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Belum ada tanda tangan yang tersimpan. Silakan buat di bawah agar Anda dapat menyetujui dokumen secara instan.
                </span>
              </div>
            )}
          </div>

          {/* Tab selector */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('draw')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
                activeTab === 'draw'
                  ? 'border-indigo-600 text-indigo-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Coret Tanda Tangan
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${
                activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Unggah File Gambar
            </button>
          </div>

          {/* Tabs Work Content */}
          {activeTab === 'draw' ? (
            <div className="space-y-3">
              <div className="border border-slate-300 rounded-xl overflow-hidden relative shadow-inner bg-white">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[200px] cursor-crosshair touch-none"
                />
                
                <button
                  onClick={clearCanvas}
                  className="absolute bottom-3 right-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Eraser className="h-3.5 w-3.5" /> Hapus Coretan
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                💡 Gambar tanda tangan Anda di atas menggunakan mouse atau jari/stylus Anda pada smartphone/tablet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50 p-6 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition"
              >
                <div className="p-3 bg-white rounded-full shadow-sm border">
                  <Upload className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-700 block">Pilih file tanda tangan (.png)</span>
                  <span className="text-[10px] text-slate-400">Direkomendasikan format PNG transparan</span>
                </div>
                {fileName && (
                  <span className="inline-block mt-2 px-3 py-1 bg-indigo-50 border border-indigo-150 rounded-full font-mono text-[10px] font-bold text-indigo-700">
                    {fileName}
                  </span>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {uploadedBase64 && (
                <div className="p-3 bg-slate-55 rounded-xl border flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-450 block font-bold mb-1.5">Tampilan Ttd Terpilih:</span>
                    <img src={uploadedBase64} alt="Pratinjau unggahan" className="h-20 object-contain max-w-full" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
              <Check className="h-4 w-4 bg-emerald-500 text-white rounded-full p-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

        </div>

        {/* Action Button Footer */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-3.5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition text-xs font-bold cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSaveSignature}
            disabled={isSaving || (activeTab === 'upload' && !uploadedBase64)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
          </button>
        </div>

      </div>
    </div>
  );
}
