import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenTool, Type, Upload, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

interface ElectronicSignatureProps {
  isOpen: boolean;
  onClose: () => void;
  onSignatureComplete: (signatureData: SignatureData) => void;
  partyLabel?: string;
}

export interface SignatureData {
  type: 'draw' | 'type' | 'upload';
  data: string;
  name: string;
  date: string;
}

export const ElectronicSignature = ({ 
  isOpen, 
  onClose, 
  onSignatureComplete,
  partyLabel = "الطرف"
}: ElectronicSignatureProps) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize canvas
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, activeTab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleComplete = () => {
    let signatureData: string = '';

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      signatureData = canvas.toDataURL('image/png');
    } else if (activeTab === 'type') {
      if (!typedName.trim()) {
        toast.error('يرجى إدخال الاسم');
        return;
      }
      signatureData = typedName.trim();
    } else if (activeTab === 'upload') {
      if (!uploadedImage) {
        toast.error('يرجى رفع صورة التوقيع');
        return;
      }
      signatureData = uploadedImage;
    }

    onSignatureComplete({
      type: activeTab,
      data: signatureData,
      name: activeTab === 'type' ? typedName : partyLabel,
      date: new Date().toLocaleDateString('ar-SA'),
    });

    handleReset();
    onClose();
  };

  const handleReset = () => {
    setTypedName("");
    setUploadedImage(null);
    clearCanvas();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-golden" />
            التوقيع الإلكتروني - {partyLabel}
          </DialogTitle>
          <DialogDescription>
            اختر طريقة التوقيع المناسبة
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draw' | 'type' | 'upload')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draw" className="flex items-center gap-1">
              <PenTool className="w-4 h-4" />
              رسم
            </TabsTrigger>
            <TabsTrigger value="type" className="flex items-center gap-1">
              <Type className="w-4 h-4" />
              كتابة
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1">
              <Upload className="w-4 h-4" />
              رفع
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <div className="space-y-3">
              <Label>ارسم توقيعك</Label>
              <div className="border rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={350}
                  height={150}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <Button variant="outline" size="sm" onClick={clearCanvas}>
                <Trash2 className="w-4 h-4 ml-1" />
                مسح
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-4">
            <div className="space-y-3">
              <Label>اكتب اسمك</Label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="الاسم الكامل..."
                className="text-center text-lg"
              />
              {typedName && (
                <div className="border rounded-lg p-6 bg-white text-center">
                  <p className="text-2xl font-signature text-gray-800" style={{ fontFamily: 'cursive' }}>
                    {typedName}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-3">
              <Label>ارفع صورة توقيعك</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-golden/30 rounded-lg cursor-pointer hover:border-golden/50 transition-colors bg-muted/30"
              >
                {uploadedImage ? (
                  <img src={uploadedImage} alt="التوقيع" className="max-h-28 max-w-full object-contain" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-golden mb-2" />
                    <span className="text-sm text-muted-foreground">اختر صورة</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>
              {uploadedImage && (
                <Button variant="outline" size="sm" onClick={() => setUploadedImage(null)}>
                  <Trash2 className="w-4 h-4 ml-1" />
                  إزالة
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleComplete}
            className="bg-golden hover:bg-golden/90 text-background"
          >
            <Check className="w-4 h-4 ml-1" />
            تأكيد التوقيع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ElectronicSignature;
