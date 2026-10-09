"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { QrCode, Copy, Check, Download, ShieldCheck, Camera, CameraOff } from "lucide-react";
import { Button } from "./Button";
import QRCode from "qrcode";
import jsQR from "jsqr";

export interface QRCardProps {
  tokenId: string;
  teamName: string;
  teamId: string;
  benchLabel?: string;
  venueName?: string;
  className?: string;
}

export const QRCard: React.FC<QRCardProps> = ({
  tokenId,
  teamName,
  teamId,
  benchLabel,
  venueName,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrImage, setQrImage] = useState("");

  useEffect(() => {
    let active = true;
    if (!tokenId) { setQrImage(""); return; }
    QRCode.toDataURL(tokenId, { errorCorrectionLevel: "M", margin: 2, width: 360, color: { dark: "#111827", light: "#ffffff" } })
      .then((url) => { if (active) setQrImage(url); })
      .catch(() => { if (active) setQrImage(""); });
    return () => { active = false; };
  }, [tokenId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(tokenId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "p-6 rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-xl max-w-sm w-full mx-auto flex flex-col items-center text-center space-y-4",
        className
      )}
    >
      <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono tracking-wider uppercase">
        <ShieldCheck className="w-4 h-4" />
        <span>Official EventPass Credential</span>
      </div>

      <div className="p-3 bg-white rounded-xl shadow-inner border-4 border-slate-800 min-h-52 min-w-52 grid place-items-center">
        {qrImage ? <img src={qrImage} alt={`Scannable event pass for ${teamName}`} className="w-48 h-48" /> : <span className="text-xs text-slate-600">Generating secure QR…</span>}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-100">{teamName}</h3>
        <p className="font-mono text-xs text-indigo-400 font-semibold">{teamId}</p>
        {benchLabel && venueName && (
          <p className="text-xs text-slate-400">
            {venueName} • <span className="text-slate-200 font-semibold">{benchLabel}</span>
          </p>
        )}
      </div>

      <div className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="truncate max-w-[200px]">{tokenId}</span>
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="w-full flex items-center gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          disabled={!qrImage}
          onClick={() => { const link = document.createElement("a"); link.href = qrImage; link.download = `${teamId}-event-pass.png`; link.click(); }}
        >
          Download QR PNG
        </Button>
      </div>
    </div>
  );
};

export interface QRScannerProps {
  onScanSuccess: (token: string) => void;
  className?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, className }) => {
  const [manualToken, setManualToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!scanning) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const stop = () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    const start = async () => {
      setCameraError("");
      if (!navigator.mediaDevices?.getUserMedia) { setCameraError("Camera access is unavailable. Use a secure browser context or enter the token manually."); setScanning(false); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        timer = setInterval(async () => {
          const video = videoRef.current;
          if (stopped || !video || !context || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
          try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "attemptBoth" });
            if (code?.data && !stopped) { onScanSuccess(code.data); stop(); setScanning(false); }
          } catch { /* Keep polling while the camera frame is not ready. */ }
        }, 300);
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : "Camera permission was denied or the camera is unavailable.");
        setScanning(false);
      }
    };
    void start();
    return stop;
  }, [scanning, onScanSuccess]);

  return (
    <div
      className={cn(
        "p-5 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl space-y-4 max-w-md w-full mx-auto",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">Ticket Token Scanner</h3>
        </div>
      </div>

      {/* Viewfinder Screen */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/90 border border-slate-800 flex items-center justify-center">
        <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover ${scanning ? "block" : "hidden"}`} playsInline muted />
        {scanning && <div className="absolute inset-8 border-2 border-dashed border-indigo-400/80 rounded-xl pointer-events-none" />}
        {!scanning && <div className="text-center text-slate-500"><QrCode className="w-12 h-12 mx-auto mb-2" /><p className="text-xs">Camera is off</p></div>}
        <div className="absolute bottom-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-[11px] text-slate-300 font-mono">{scanning ? "Align a QR pass inside the frame" : "Start camera to scan a QR pass"}</div>
      </div>

      <Button size="sm" variant={scanning ? "outline" : "primary"} leftIcon={scanning ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />} onClick={() => setScanning((value) => !value)}>{scanning ? "Stop camera" : "Start camera"}</Button>
      {cameraError && <p role="alert" className="text-xs text-amber-300">{cameraError}</p>}

      {/* Manual Code Input fallback */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <p className="text-[11px] text-slate-400">Or enter Token / Team ID manually:</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste a QR token or registration ID"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (manualToken.trim()) {
                onScanSuccess(manualToken.trim());
                setManualToken("");
              }
            }}
          >
            Verify
          </Button>
        </div>
      </div>
    </div>
  );
};
