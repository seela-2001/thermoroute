import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface HlsVideoProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onError?: () => void;
}

export function HlsVideo({
  src,
  className,
  autoPlay = true,
  muted = true,
  playsInline = true,
  onError,
}: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [failed, setFailed] = useState(false);
  const autoPlayRef = useRef(autoPlay);
  const onErrorRef = useRef(onError);
  useLayoutEffect(() => {
    autoPlayRef.current = autoPlay;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setFailed(false);

    const handleError = () => {
      setFailed(true);
      onErrorRef.current?.();
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlayRef.current) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) handleError();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = src;
      if (autoPlayRef.current) video.play().catch(() => {});
    } else {
      handleError();
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  if (failed) return null;

  return (
    <video
      ref={videoRef}
      className={className}
      muted={muted}
      playsInline={playsInline}
      autoPlay={autoPlay}
    />
  );
}
