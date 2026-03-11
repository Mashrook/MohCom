import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoading = false;

export type CompressionQuality = 'high' | 'medium' | 'low';

export interface CompressionProgress {
  progress: number;
  message: string;
}

export interface CompressionOptions {
  quality: CompressionQuality;
  onProgress?: (progress: CompressionProgress) => void;
}

const qualitySettings: Record<CompressionQuality, { crf: string; preset: string; scale: string; audioBitrate: string }> = {
  high: { crf: '23', preset: 'ultrafast', scale: '1920:1080', audioBitrate: '128k' },
  medium: { crf: '28', preset: 'ultrafast', scale: '1280:720', audioBitrate: '96k' },
  low: { crf: '35', preset: 'ultrafast', scale: '854:480', audioBitrate: '64k' }
};

export const loadFFmpeg = async (onProgress?: (progress: CompressionProgress) => void): Promise<FFmpeg> => {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  if (isLoading) {
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpeg && ffmpeg.loaded) {
      return ffmpeg;
    }
  }

  isLoading = true;
  
  try {
    ffmpeg = new FFmpeg();
    
    ffmpeg.on('progress', ({ progress }) => {
      onProgress?.({
        progress: Math.min(95, Math.round(progress * 90) + 10),
        message: `جاري ضغط الفيديو... ${Math.round(progress * 100)}%`
      });
    });

    onProgress?.({ progress: 0, message: 'جاري تحميل أدوات الضغط...' });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    onProgress?.({ progress: 10, message: 'تم تحميل أدوات الضغط' });
    
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw error;
  } finally {
    isLoading = false;
  }
};

export const compressVideo = async (
  file: File,
  options: CompressionOptions
): Promise<File> => {
  const { quality, onProgress } = options;
  const settings = qualitySettings[quality];
  
  const ffmpegInstance = await loadFFmpeg(onProgress);
  
  const inputFileName = 'input.mp4';
  const outputFileName = 'output.mp4';

  try {
    onProgress?.({ progress: 5, message: 'جاري تحضير الفيديو...' });
    
    await ffmpegInstance.writeFile(inputFileName, await fetchFile(file));
    
    onProgress?.({ progress: 10, message: `جاري الضغط بجودة ${quality === 'high' ? 'عالية' : quality === 'medium' ? 'متوسطة' : 'منخفضة'}...` });

    // Use ultrafast preset for maximum speed
    // -threads 0 uses all available cores
    await ffmpegInstance.exec([
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-crf', settings.crf,
      '-preset', settings.preset,
      '-vf', `scale='min(${settings.scale.split(':')[0]},iw)':'min(${settings.scale.split(':')[1]},ih)':force_original_aspect_ratio=decrease`,
      '-c:a', 'aac',
      '-b:a', settings.audioBitrate,
      '-movflags', '+faststart',
      '-threads', '0',
      outputFileName
    ]);

    onProgress?.({ progress: 95, message: 'جاري إنهاء الضغط...' });

    const data = await ffmpegInstance.readFile(outputFileName);
    
    await ffmpegInstance.deleteFile(inputFileName);
    await ffmpegInstance.deleteFile(outputFileName);

    const compressedBlob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
    const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.mp4'), {
      type: 'video/mp4'
    });

    const originalSize = file.size / (1024 * 1024);
    const compressedSize = compressedFile.size / (1024 * 1024);
    const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);

    console.log(`Video compressed: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB (${reduction}% reduction)`);

    onProgress?.({ 
      progress: 100, 
      message: `تم ضغط الفيديو من ${originalSize.toFixed(1)}MB إلى ${compressedSize.toFixed(1)}MB` 
    });

    return compressedFile;
  } catch (error) {
    console.error('Video compression failed:', error);
    throw error;
  }
};

export const shouldCompressVideo = (file: File): boolean => {
  const TEN_MB = 10 * 1024 * 1024;
  return file.size > TEN_MB;
};

export const getEstimatedSize = (originalSize: number, quality: CompressionQuality): string => {
  const ratios: Record<CompressionQuality, number> = {
    high: 0.5,
    medium: 0.3,
    low: 0.15
  };
  const estimated = (originalSize * ratios[quality]) / (1024 * 1024);
  return estimated.toFixed(1);
};
