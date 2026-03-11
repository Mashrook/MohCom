import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, LayoutDashboard, Shield, Scale, Users, MessageCircle, Settings, Download, CreditCard, ArrowRight, KeyRound, AlertTriangle, Database, Globe, Monitor, FileCheck, Video, Cog, FileText, Key, Eye, Smartphone } from "lucide-react";
import { Moon, Sun } from "lucide-react";
import { isIOSApp } from "@/utils/isIOSApp";
import { Button } from "@/components/ui/button";
import { PrefetchLink } from "@/components/PrefetchLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePWA } from "@/hooks/usePWA";
import { useAppDownloadLinks } from "@/hooks/useAppDownloadLinks";
import newLogo from "@/assets/new-logo-circle.png";
import { usePrefetchPriorityPages } from "@/hooks/usePrefetch";
import SecurityAlertsDropdown from "@/components/admin/SecurityAlertsDropdown";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const allNavLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/about", label: "عن المنصة" },
  { href: "/consultation", label: "الاستشارات" },
  { href: "/predictions", label: "التنبؤ بالأحكام" },
  { href: "/complaints", label: "الشكاوى" },
  { href: "/contracts", label: "العقود" },
  { href: "/lawyers", label: "المحامين" },
  { href: "/legal-search", label: "البحث القانوني" },
  { href: "/blog", label: "المدونة" },
  { href: "/pricing", label: "الاشتراكات" },
];

const getNavLinks = () => {
  if (isIOSApp()) {
    return allNavLinks.filter(link => link.href !== "/pricing");
  }
  return allNavLinks;
};

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const iosApp = isIOSApp();
  const navLinks = getNavLinks();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, subscription, isAdmin, isLawyer } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isInstallable, installApp } = usePWA();
  const { getActiveLink, hasActiveLink } = useAppDownloadLinks();
  
  // Prefetch priority pages on mount
  usePrefetchPriorityPages();
  
  const activeAppLink = getActiveLink();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getDashboardLink = () => {
    if (isAdmin) return "/admin/dashboard";
    if (isLawyer) return "/lawyer-full-dashboard";
    return "/dashboard";
  };

  const getDashboardLabel = () => {
    if (isAdmin) return "لوحة الأدمن";
    if (isLawyer) return "لوحة المحامي";
    return "لوحة التحكم";
  };

  const showBackButton = location.pathname !== "/";
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo + Back */}
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleBack}
                className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                aria-label="الرجوع"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            )}
            <Link to="/" className="group flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20 transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-[0_0_20px_hsl(43,66%,52%,0.5)] group-hover:scale-105">
                <img src={newLogo} alt="محامي كوم" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col transition-all duration-300 group-hover:translate-x-0.5">
                <span className="text-xl font-bold bg-gradient-to-l from-[hsl(43,66%,52%)] via-[hsl(48,90%,60%)] to-[hsl(43,66%,52%)] bg-clip-text text-transparent group-hover:drop-shadow-[0_0_8px_hsl(48,90%,60%,0.6)]">
                  محامي كوم
                </span>
                <span className="text-[10px] text-muted-foreground font-medium -mt-0.5 group-hover:text-primary/80 transition-colors">ADVISOR AI</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.slice(0, 8).map((link) => (
              <PrefetchLink
                key={link.href}
                to={link.href}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                  location.pathname === link.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </PrefetchLink>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-foreground hover:bg-muted/60"
              aria-label="تبديل الوضع"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            {user ? (
              <>
                {!iosApp && subscription.subscribed && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                    {subscription.planType === "basic" ? "أساسي" : subscription.planType === "professional" ? "احترافي" : "مؤسسات"}
                  </span>
                )}
                {/* Security Alerts for Admin */}
                {isAdmin && <SecurityAlertsDropdown />}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-golden/30">
                      <User className="w-4 h-4 ml-2" />
                      حسابي
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* لوحة التحكم الرئيسية حسب الدور */}
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardLink()} className="flex items-center">
                        <LayoutDashboard className="w-4 h-4 ml-2" />
                        {getDashboardLabel()}
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* رابط الرسائل */}
                    <DropdownMenuItem asChild>
                      <Link to="/messages" className="flex items-center">
                        <MessageCircle className="w-4 h-4 ml-2" />
                        الرسائل
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* روابط إضافية للأدمن فقط */}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          لوحات التحكم
                        </DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/dashboard" className="flex items-center">
                            <Shield className="w-4 h-4 ml-2" />
                            لوحة الأدمن الكاملة
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/lawyer-full-dashboard" className="flex items-center">
                            <Scale className="w-4 h-4 ml-2" />
                            لوحة المحامي
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard" className="flex items-center">
                            <Users className="w-4 h-4 ml-2" />
                            لوحة المشترك
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center">
                            <Shield className="w-4 h-4 ml-2" />
                            إدارة المستخدمين
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/analytics" className="flex items-center">
                            <LayoutDashboard className="w-4 h-4 ml-2" />
                            الإحصائيات
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/audit" className="flex items-center">
                            <Shield className="w-4 h-4 ml-2" />
                            سجل التدقيق
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/password-security" className="flex items-center">
                            <KeyRound className="w-4 h-4 ml-2" />
                            حماية كلمات المرور
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/payment-errors" className="flex items-center">
                            <AlertTriangle className="w-4 h-4 ml-2" />
                            سجل أخطاء الدفع
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/backup" className="flex items-center">
                            <Database className="w-4 h-4 ml-2" />
                            النسخ الاحتياطي
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/ip-restriction" className="flex items-center">
                            <Globe className="w-4 h-4 ml-2" />
                            تقييد IP
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/sessions" className="flex items-center">
                            <Monitor className="w-4 h-4 ml-2" />
                            جلسات المدراء
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/security" className="flex items-center">
                            <Shield className="w-4 h-4 ml-2" />
                            سجل الأمان الشامل
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/system-status" className="flex items-center">
                            <Monitor className="w-4 h-4 ml-2" />
                            حالة النظام
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/lawyer-applications" className="flex items-center">
                            <FileCheck className="w-4 h-4 ml-2" />
                            طلبات المحامين
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/communication" className="flex items-center">
                            <Video className="w-4 h-4 ml-2" />
                            إعدادات الاتصال
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/api-keys" className="flex items-center">
                            <Key className="w-4 h-4 ml-2" />
                            إدارة مفاتيح API
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/monitoring" className="flex items-center">
                            <Eye className="w-4 h-4 ml-2" />
                            مراقبة الاتصالات
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/contracts" className="flex items-center">
                            <FileText className="w-4 h-4 ml-2" />
                            إدارة نماذج العقود
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/platform-settings" className="flex items-center">
                            <Cog className="w-4 h-4 ml-2" />
                            إعدادات المنصة الشاملة
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/app-links" className="flex items-center">
                            <Smartphone className="w-4 h-4 ml-2" />
                            إدارة روابط التطبيق
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/account-settings" className="flex items-center">
                        <Settings className="w-4 h-4 ml-2" />
                        إعدادات الحساب
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/security-settings" className="flex items-center">
                        <Shield className="w-4 h-4 ml-2" />
                        إعدادات الأمان
                      </Link>
                    </DropdownMenuItem>
                    {!iosApp && (
                      <DropdownMenuItem asChild>
                        <Link to="/subscription" className="flex items-center">
                          <CreditCard className="w-4 h-4 ml-2" />
                          إدارة الاشتراك
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="w-4 h-4 ml-2" />
                      تسجيل الخروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="golden" size="sm">
                    تسجيل الدخول
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div 
            className="lg:hidden py-4 border-t border-border/50 animate-fade-in"
            style={{ 
              maxHeight: 'calc(100vh - 5rem)',
              WebkitOverflowScrolling: 'touch',
              overflowY: 'auto',
              position: 'relative',
              touchAction: 'pan-y'
            }}
          >
            <div className="flex flex-col gap-2 pb-24">
              {navLinks.map((link) => (
                <PrefetchLink
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300",
                    location.pathname === link.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {link.label}
                </PrefetchLink>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun className="w-4 h-4 ml-2" /> : <Moon className="w-4 h-4 ml-2" />}
                {theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
              </Button>
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/50">
                {user ? (
                  <>
                    <Link to={getDashboardLink()} onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full border-golden/30">
                        <LayoutDashboard className="w-4 h-4 ml-2" />
                        {getDashboardLabel()}
                      </Button>
                    </Link>
                    
                    {/* روابط إضافية للأدمن في القائمة المتنقلة */}
                    {isAdmin && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border/30">
                        <span className="text-xs text-muted-foreground px-4">لوحات التحكم</span>
                        <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            <Shield className="w-4 h-4 ml-2" />
                            لوحة الأدمن الكاملة
                          </Button>
                        </Link>
                        <Link to="/lawyer-full-dashboard" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            <Scale className="w-4 h-4 ml-2" />
                            لوحة المحامي
                          </Button>
                        </Link>
                        <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            <Users className="w-4 h-4 ml-2" />
                            لوحة المشترك
                          </Button>
                        </Link>
                        <Link to="/admin/payment-errors" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            <AlertTriangle className="w-4 h-4 ml-2" />
                            سجل أخطاء الدفع
                          </Button>
                        </Link>
                        <Link to="/admin/lawyer-applications" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            <FileCheck className="w-4 h-4 ml-2" />
                            طلبات المحامين
                          </Button>
                        </Link>
                      </div>
                    )}
                    
                    {/* رابط إدارة الاشتراك */}
                    {!iosApp && (
                      <Link to="/subscription" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          <CreditCard className="w-4 h-4 ml-2" />
                          إدارة الاشتراك
                        </Button>
                      </Link>
                    )}
                    
                    {/* رابط إعدادات الأمان */}
                    <Link to="/security-settings" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Shield className="w-4 h-4 ml-2" />
                        إعدادات الأمان
                      </Button>
                    </Link>
                    
                    {/* تسجيل الخروج - مرئي دائماً */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <Button variant="ghost" className="w-full text-destructive" onClick={() => { handleSignOut(); setIsOpen(false); }}>
                        <LogOut className="w-4 h-4 ml-2" />
                        تسجيل الخروج
                      </Button>
                    </div>
                  </>
                ) : (
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="golden" className="w-full">
                      تسجيل الدخول
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
