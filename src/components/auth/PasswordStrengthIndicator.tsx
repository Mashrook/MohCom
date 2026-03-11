import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const COMMON_PASSWORDS = [
  "password", "123456", "12345678", "qwerty", "abc123",
  "password123", "admin", "letmein", "welcome", "monkey",
  "1234567890", "password1", "iloveyou", "sunshine", "princess"
];

const requirements: PasswordRequirement[] = [
  { label: "12 حرفًا على الأقل", test: (p) => p.length >= 12 },
  { label: "حرف كبير (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "حرف صغير (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "رقم (0-9)", test: (p) => /[0-9]/.test(p) },
  { label: "رمز خاص (!@#$%...)", test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(p) },
  { label: "ليست كلمة مرور شائعة", test: (p) => !COMMON_PASSWORDS.includes(p.toLowerCase()) },
];

export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push("كلمة المرور يجب أن تكون 12 حرفًا على الأقل");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("يجب أن تحتوي على حرف كبير واحد على الأقل");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("يجب أن تحتوي على حرف صغير واحد على الأقل");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("يجب أن تحتوي على رقم واحد على الأقل");
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password)) {
    errors.push("يجب أن تحتوي على رمز خاص واحد على الأقل");
  }
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push("كلمة المرور شائعة جداً، اختر كلمة مرور أقوى");
  }
  
  return { isValid: errors.length === 0, errors };
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { passedCount, strength, strengthLabel, strengthColor } = useMemo(() => {
    const passed = requirements.filter((req) => req.test(password)).length;
    const total = requirements.length;
    const ratio = passed / total;
    
    let label: string;
    let color: string;
    
    if (password.length === 0) {
      label = "";
      color = "bg-muted";
    } else if (ratio < 0.4) {
      label = "ضعيفة";
      color = "bg-destructive";
    } else if (ratio < 0.7) {
      label = "متوسطة";
      color = "bg-yellow-500";
    } else if (ratio < 1) {
      label = "جيدة";
      color = "bg-blue-500";
    } else {
      label = "قوية";
      color = "bg-green-500";
    }
    
    return { passedCount: passed, strength: ratio, strengthLabel: label, strengthColor: color };
  }, [password]);

  if (password.length === 0) return null;

  return (
    <div className="space-y-3 mt-3 p-3 rounded-lg bg-muted/30 border border-border/50">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">قوة كلمة المرور</span>
          <span className={cn(
            "font-medium",
            strength < 0.4 && "text-destructive",
            strength >= 0.4 && strength < 0.7 && "text-yellow-500",
            strength >= 0.7 && strength < 1 && "text-blue-500",
            strength === 1 && "text-green-500"
          )}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300", strengthColor)}
            style={{ width: `${strength * 100}%` }}
          />
        </div>
      </div>
      
      {/* Requirements Checklist */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {requirements.map((req, index) => {
          const passed = req.test(password);
          return (
            <div 
              key={index} 
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                passed ? "text-green-500" : "text-muted-foreground"
              )}
            >
              {passed ? (
                <Check className="w-3 h-3 flex-shrink-0" />
              ) : (
                <X className="w-3 h-3 flex-shrink-0" />
              )}
              <span>{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
