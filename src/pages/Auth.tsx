import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, User, Loader2, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { PasswordStrengthIndicator, validatePasswordStrength } from "@/components/auth/PasswordStrengthIndicator";
import { checkPasswordLeaked } from "@/utils/passwordSecurity";
import { PasswordInput } from "@/components/ui/password-input";
import { ForcePasswordChange } from "@/components/auth/ForcePasswordChange";

const emailSchema = z.string().email("البريد الإلكتروني غير صالح");
const passwordSchemaLogin = z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل");

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showForcePasswordChange, setShowForcePasswordChange] = useState(false);
  const [passwordChangeReason, setPasswordChangeReason] = useState<"weak" | "leaked">("weak");
  const [leakCount, setLeakCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // التحقق من الجلسة الحالية - تسجيل الدخول التلقائي
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Handle session errors gracefully - allow re-login
        if (error) {
          console.error("Session error:", error);
          setIsCheckingSession(false);
          return;
        }
        
        if (session?.user) {
          // Verify session is still valid
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (user && !userError) {
            // المستخدم مسجل دخوله بالفعل - إعادة توجيه للصفحة الرئيسية
            navigate("/", { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkExistingSession();

    // الاستماع لتغييرات حالة المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only redirect on actual sign in, not on token refresh or other events
      if (event === "SIGNED_IN" && session?.user) {
        navigate("/", { replace: true });
      }
      // Handle sign out event
      if (event === "SIGNED_OUT") {
        setIsCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateInputs = (isSignUp: boolean) => {
    try {
      emailSchema.parse(email);
      
      if (isSignUp) {
        // Strong password validation for signup
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
          toast({
            title: "كلمة المرور ضعيفة",
            description: passwordValidation.errors[0],
            variant: "destructive",
          });
          return false;
        }
        if (!fullName.trim()) {
          throw new Error("الاسم الكامل مطلوب");
        }
        if (!acceptedTerms) {
          throw new Error("يجب الموافقة على شروط الاستخدام وسياسة الخصوصية");
        }
      } else {
        // Basic validation for login
        passwordSchemaLogin.parse(password);
      }
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطأ في البيانات",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else if (error instanceof Error) {
        toast({
          title: "خطأ",
          description: error.message,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds(prev => {
          if (prev <= 1) {
            setIsRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  const checkRateLimit = async (emailToCheck: string): Promise<boolean> => {
    try {
      const { data: isLimited, error: limitError } = await supabase.rpc('is_login_rate_limited', {
        p_email: emailToCheck.trim().toLowerCase()
      });
      
      if (limitError) {
        console.error('Rate limit check error:', limitError);
        return false;
      }

      if (isLimited) {
        const { data: remainingSeconds } = await supabase.rpc('get_lockout_remaining_seconds', {
          p_email: emailToCheck.trim().toLowerCase()
        });
        
        setIsRateLimited(true);
        setLockoutSeconds(remainingSeconds || 900);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return false;
    }
  };

  const recordFailedAttempt = async (emailToRecord: string) => {
    try {
      await supabase.rpc('record_failed_login', {
        p_email: emailToRecord.trim().toLowerCase(),
        p_user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to record login attempt:', error);
    }
  };

  const clearFailedAttempts = async (emailToClear: string) => {
    try {
      await supabase.rpc('clear_failed_login_attempts', {
        p_email: emailToClear.trim().toLowerCase()
      });
    } catch (error) {
      console.error('Failed to clear login attempts:', error);
    }
  };

  const logPasswordRejection = async (rejectionReason: string) => {
    try {
      await supabase.from('password_security_logs').insert({
        email: email.trim(),
        rejection_reason: rejectionReason,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to log password rejection:', error);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;

    setIsLoading(true);
    try {
      // Check password strength first
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        await logPasswordRejection(`كلمة مرور ضعيفة: ${passwordValidation.errors[0]}`);
        toast({
          title: "كلمة المرور ضعيفة",
          description: passwordValidation.errors[0],
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check if password has been leaked
      const leakCheck = await checkPasswordLeaked(password);
      if (leakCheck.isLeaked) {
        await logPasswordRejection(`كلمة مرور مسربة (HIBP): ظهرت في ${leakCheck.count} تسريب`);
        toast({
          title: "كلمة المرور غير آمنة",
          description: `كلمة المرور هذه ظهرت في ${leakCheck.count.toLocaleString('ar-SA')} تسريب بيانات سابق. يرجى اختيار كلمة مرور أخرى.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "المستخدم موجود مسبقاً",
            description: "هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      if (data.user) {
        // Record terms consent
        try {
          const { data: versionsData } = await supabase
            .from('terms_versions')
            .select('document_type, version')
            .order('effective_date', { ascending: false });
          
          const termsVersion = versionsData?.find(d => d.document_type === 'terms')?.version || '1.0';
          const privacyVersion = versionsData?.find(d => d.document_type === 'privacy')?.version || '1.0';
          
          await supabase.from('terms_consent_log').insert({
            user_id: data.user.id,
            terms_version: termsVersion,
            privacy_version: privacyVersion,
            consent_type: 'signup',
            user_agent: navigator.userAgent,
          });
        } catch (consentError) {
          console.error('Error recording consent:', consentError);
        }

        toast({
          title: "تم إنشاء الحساب بنجاح",
          description: "مرحباً بك في محامي كوم",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "خطأ في التسجيل",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(false)) return;

    // Check rate limiting first
    const rateLimited = await checkRateLimit(email);
    if (rateLimited) {
      toast({
        title: "تم حظر تسجيل الدخول مؤقتاً",
        description: `محاولات فاشلة كثيرة. يرجى الانتظار ${Math.ceil(lockoutSeconds / 60)} دقيقة.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Record failed attempt
        await recordFailedAttempt(email);
        
        // Check if now rate limited after this attempt
        const nowLimited = await checkRateLimit(email);
        
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "خطأ في تسجيل الدخول",
            description: nowLimited 
              ? `البريد الإلكتروني أو كلمة المرور غير صحيحة. تم حظر الحساب مؤقتاً لمدة 15 دقيقة.`
              : "البريد الإلكتروني أو كلمة المرور غير صحيحة",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      if (data.user) {
        // Clear failed attempts on successful login
        await clearFailedAttempts(email);
        
        // Check password strength after successful login
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
          await logPasswordRejection(`كلمة مرور ضعيفة عند تسجيل الدخول: ${passwordValidation.errors[0]}`);
          setPasswordChangeReason("weak");
          setShowForcePasswordChange(true);
          setIsLoading(false);
          return;
        }

        // Check if password has been leaked
        const leakCheck = await checkPasswordLeaked(password);
        if (leakCheck.isLeaked) {
          await logPasswordRejection(`كلمة مرور مسربة عند تسجيل الدخول (HIBP): ظهرت في ${leakCheck.count} تسريب`);
          setPasswordChangeReason("leaked");
          setLeakCount(leakCheck.count);
          setShowForcePasswordChange(true);
          setIsLoading(false);
          return;
        }

        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك مجدداً",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setShowForcePasswordChange(false);
    toast({
      title: "تم تسجيل الدخول بنجاح",
      description: "مرحباً بك مجدداً",
    });
    navigate("/");
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        toast({
          title: "خطأ في تسجيل الدخول عبر Google",
          description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        toast({
          title: "خطأ في تسجيل الدخول عبر Apple",
          description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // عرض شاشة تحميل أثناء التحقق من الجلسة
  if (isCheckingSession) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card className="glass-card border-golden/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-gradient-golden">مرحباً بك</CardTitle>
                <CardDescription>سجل دخولك للوصول إلى خدماتنا القانونية</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                    <TabsTrigger value="signup">حساب جديد</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    {isRateLimited && (
                      <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-destructive">تم حظر تسجيل الدخول مؤقتاً</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            محاولات فاشلة كثيرة. يرجى الانتظار {Math.floor(lockoutSeconds / 60)} دقيقة و {lockoutSeconds % 60} ثانية
                          </p>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            className="pr-10 bg-background border-golden/30 text-foreground"
                            required
                            disabled={isRateLimited}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">كلمة المرور</Label>
                        <PasswordInput
                          id="login-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          disabled={isRateLimited}
                        />
                      </div>
                      <Button type="submit" variant="golden" className="w-full" disabled={isLoading || isRateLimited}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRateLimited ? "محظور مؤقتاً" : "تسجيل الدخول"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">الاسم الكامل</Label>
                        <div className="relative">
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="أحمد محمد"
                            className="pr-10 bg-background border-golden/30 text-foreground"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            className="pr-10 bg-background border-golden/30 text-foreground"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">كلمة المرور</Label>
                        <PasswordInput
                          id="signup-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                        />
                        <PasswordStrengthIndicator password={password} />
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/30 border border-border">
                        <Checkbox
                          id="accept-terms"
                          checked={acceptedTerms}
                          onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                          className="mt-0.5"
                        />
                        <Label htmlFor="accept-terms" className="text-sm leading-relaxed cursor-pointer">
                          أوافق على{" "}
                          <Link to="/terms" className="text-primary hover:underline" target="_blank">
                            شروط الاستخدام
                          </Link>
                          {" "}و{" "}
                          <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                            سياسة الخصوصية
                          </Link>
                        </Label>
                      </div>
                      <Button type="submit" variant="golden" className="w-full" disabled={isLoading || !acceptedTerms}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء حساب"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-golden/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">أو</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full border-golden/30 text-foreground hover:bg-golden/10"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    الدخول عبر Google
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-golden/30 text-foreground hover:bg-golden/10"
                    onClick={handleAppleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.3-3.74 4.25z"/>
                    </svg>
                    الدخول عبر Apple
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <ForcePasswordChange
        open={showForcePasswordChange}
        reason={passwordChangeReason}
        leakCount={leakCount}
        onSuccess={handlePasswordChangeSuccess}
      />
    </Layout>
  );
};

export default Auth;
