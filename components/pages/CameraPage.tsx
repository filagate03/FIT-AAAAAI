import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const PLACEHOLDER_IMAGE = '/images/camera-placeholder.jpg';

const CameraPage: React.FC = () => {
    const { requestImageAnalysis, addToast } = useAppContext();
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const fallbackCameraInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const startCamera = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setCameraError('Ваш браузер не поддерживает прямой доступ к камере. Загрузите фото вручную.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsCameraReady(true);
                setCameraError(null);
            }
        } catch (error) {
            console.error('Camera init error', error);
            setCameraError('Не удалось получить доступ к камере. Разрешите использование камеры или загрузите фото.');
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => {
            const stream = videoRef.current?.srcObject as MediaStream | undefined;
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [startCamera]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target?.result as string;
            const base64Data = base64String.split(',')[1];
            if (base64Data) {
                requestImageAnalysis(base64Data, base64String);
            } else {
                addToast('Не удалось обработать изображение.', 'error');
            }
        };
        reader.onerror = () => {
            addToast('Не удалось прочитать файл.', 'error');
        };
        reader.readAsDataURL(file);

        event.target.value = '';
    };

    const triggerGalleryUpload = () => {
        galleryInputRef.current?.click();
    };

    const triggerNativeCameraCapture = () => {
        fallbackCameraInputRef.current?.click();
    };

    const capturePhoto = async () => {
        if (!isCameraReady || !videoRef.current) {
            triggerNativeCameraCapture();
            return;
        }

        try {
            setIsCapturing(true);
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!canvas) {
                addToast('Камера недоступна. Загрузите фото вручную.', 'error');
                return;
            }

            const width = video.videoWidth || 720;
            const height = video.videoHeight || 960;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                addToast('Не удалось подготовить снимок. Попробуйте снова.', 'error');
                return;
            }

            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const base64Data = dataUrl.split(',')[1];
            if (!base64Data) {
                addToast('Не удалось обработать снимок.', 'error');
                return;
            }

            await requestImageAnalysis(base64Data, dataUrl);
        } catch (error) {
            console.error('capture error', error);
            addToast('Не удалось сделать снимок. Попробуйте снова или загрузите фото.', 'error');
        } finally {
            setTimeout(() => setIsCapturing(false), 250);
        }
    };

    return (
        <div className="px-4 py-6 flex flex-col items-center gap-6 min-h-[calc(100dvh-6rem)]">
            <canvas ref={canvasRef} className="hidden" aria-hidden />
            <input
                type="file"
                ref={galleryInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
            />
            <input
                type="file"
                ref={fallbackCameraInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                capture="environment"
                className="hidden"
            />

            <div className="w-full max-w-md flex flex-col items-center gap-4">
                <div className="relative w-full aspect-[3/4] overflow-hidden rounded-[32px] shadow-xl border border-border bg-muted">
                    <img
                        src={PLACEHOLDER_IMAGE}
                        alt="Пример сервировки блюда"
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isCameraReady ? 'opacity-0' : 'opacity-100'}`}
                        loading="lazy"
                    />
                    <video
                        ref={videoRef}
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
                        autoPlay
                        playsInline
                        muted
                    />
                    {!isCameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white drop-shadow">
                            {cameraError || 'Разрешите доступ к камере или загрузите фото из галереи.'}
                        </div>
                    )}
                    {isCapturing && (
                        <div className="absolute inset-0 bg-white/40 animate-pulse pointer-events-none" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 flex flex-col justify-between p-5 text-left text-white pointer-events-none">
                        <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-white/70">Анализ питания</p>
                            <p className="mt-2 text-lg font-semibold leading-snug max-w-[92%]">
                                Сделайте фото или загрузите изображение вашего блюда, и наш ИИ-диетолог проанализирует его состав.
                            </p>
                        </div>
                        <div className="text-sm text-white/85 flex items-center gap-2">
                            <span className="material-symbols-outlined !text-base">nutrition</span>
                            Готово к анализу
                        </div>
                    </div>
                </div>
                {cameraError && (
                    <p className="text-sm text-center text-muted-foreground max-w-md">
                        {cameraError}
                    </p>
                )}
            </div>

            <div className="w-full max-w-md flex flex-col gap-3">
                <button
                    onClick={capturePhoto}
                    className="w-full flex items-center justify-center py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
                >
                    <span className="material-symbols-outlined !text-xl mr-2 align-middle">photo_camera</span>
                    Сделать фото
                </button>
                <button
                    onClick={triggerGalleryUpload}
                    className="w-full flex items-center justify-center py-3 px-6 bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
                >
                    <span className="material-symbols-outlined !text-xl mr-2 align-middle">upload_file</span>
                    Загрузить изображение
                </button>
            </div>
        </div>
    );
};

export default CameraPage;
