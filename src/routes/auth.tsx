import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./index";
import heroImg from "@/assets/hero-saree.jpg";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Timer, RotateCcw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — DRAUPADI" },
      { name: "description", content: "Sign in to your DRAUPADI atelier account to track orders, wishlist and personal styling." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Forgot Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP flow state
  // views: 'login' | 'login_otp' | 'forgot' | 'forgot_otp' | 'reset_password'
  const [view, setView] = useState<"login" | "login_otp" | "forgot" | "forgot_otp" | "reset_password">("login");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [timer, setTimer] = useState(300);
  const [resendCount, setResendCount] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const redirectTo = (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("redirect")) || "/";

  useEffect(() => {
    // Check if redirecting from registration with verification success
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "true") {
        setVerifiedSuccess(true);
        // Clean URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirectTo as any });
    });
  }, [navigate, redirectTo]);

  // Countdown timer effect
  useEffect(() => {
    if ((view !== "login_otp" && view !== "forgot_otp") || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [view, timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Submit Password credentials (Login)
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    
    setLoading(true);
    // Validate credentials and sign in directly
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password 
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Role-based redirect
    const userId = data.user?.id;
    let target = redirectTo;
    if (userId) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (roles) target = "/admin";
    }

    setLoading(false);
    toast.success("Logged in successfully!");
    navigate({ to: target as any });
  }

  // Submit Forgot Password Email Request (Forgot Step 1)
  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    // Send password reset OTP
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setView("forgot_otp");
    setTimer(300);
    setOtp("");
    setResendCount(0);
    setFailedAttempts(0);
    setIsLocked(false);
    toast.success("Recovery code sent to your email!");
  }

  // Verify Recovery OTP (Forgot Step 2)
  async function handleVerifyForgotOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (otp.length < 6) {
      setOtpError("Please enter a 6-digit verification code.");
      return;
    }
    if (isLocked) {
      setOtpError("This recovery session is locked due to too many failed attempts.");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    // Verify recovery code using main client (logs user in)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: "recovery"
    });

    if (error) {
      setOtpLoading(false);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        setIsLocked(true);
        setOtpError("Too many failed attempts. Recovery session locked.");
        toast.error("Recovery locked. Please request a new code.");
      } else {
        setOtpError(`Invalid code. ${5 - newAttempts} attempts remaining.`);
        toast.error("Invalid recovery code.");
      }
      return;
    }

    setOtpLoading(false);
    toast.success("OTP verified! Create your new password.");
    setView("reset_password");
  }

  // Resend Recovery OTP
  async function handleResendForgotOtp() {
    if (resendCount >= 3) {
      setOtpError("Maximum resend limit reached. Please request a new recovery link later.");
      toast.error("Resend limit reached.");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setOtpLoading(false);

    if (error) {
      setOtpError(error.message);
      toast.error("Failed to resend code.");
    } else {
      setResendCount((prev) => prev + 1);
      setTimer(300);
      setOtp("");
      setFailedAttempts(0);
      setIsLocked(false);
      toast.success("A new recovery code has been sent.");
    }
  }

  // Submit Password Reset (Forgot Step 3)
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      toast.error("Failed to update password.");
      return;
    }

    toast.success("Password updated successfully!");
    navigate({ to: redirectTo as any });
  }

  // --- RENDERING VIEWS ---



  // 2. FORGOT PASSWORD EMAIL ENTRY VIEW
  if (view === "forgot") {
    return (
      <AuthShell title="Reset your password" subtitle="Enter your email address to receive a recovery code.">
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <Field label="Email Address" type="email" value={email} onChange={setEmail} autoComplete="email" />
          {error && <p className="text-sm text-[var(--maroon)]">{error}</p>}
          <button type="submit" disabled={loading} className="btn-luxe w-full !justify-center">
            {loading ? "Sending OTP…" : "Send Recovery Code"}
          </button>
        </form>

        <button
          onClick={() => setView("login")}
          disabled={loading}
          className="flex items-center justify-center gap-1 w-full text-xs uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--maroon)] mt-8 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </button>
      </AuthShell>
    );
  }

  // 3. FORGOT PASSWORD OTP VIEW
  if (view === "forgot_otp") {
    return (
      <AuthShell title="Enter recovery code" subtitle="We've sent a 6-digit recovery code to your email.">
        <div className="space-y-6">
          <div className="p-4 border border-[var(--gold)]/30 bg-[var(--beige)]/20 rounded-sm text-sm text-[var(--ink)] text-center">
            Recovery code sent to <strong className="text-[var(--maroon-deep)]">{email}</strong>
          </div>

          <form onSubmit={handleVerifyForgotOtp} className="space-y-6 flex flex-col items-center">
            <div className="w-full flex justify-center py-2">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={otpLoading || isLocked}
                className="gap-2"
              >
                <InputOTPGroup className="gap-2 md:gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-12 w-10 md:h-14 md:w-12 text-lg md:text-xl font-serif text-[var(--maroon-deep)] border-[var(--border)] focus:border-[var(--gold)] focus:ring-[var(--gold)] rounded-sm bg-transparent transition-all"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {otpError && (
              <p className="text-sm text-[var(--maroon)] text-center w-full">{otpError}</p>
            )}

            <div className="w-full flex items-center justify-between text-xs text-[var(--muted-foreground)] tracking-wide">
              <span className="flex items-center gap-1.5 font-medium">
                <Timer className="h-3.5 w-3.5 text-[var(--gold)]" />
                {timer > 0 ? (
                  <span>Expires in: <strong className="text-[var(--ink)] font-mono">{formatTime(timer)}</strong></span>
                ) : (
                  <span className="text-[var(--maroon)] font-semibold">Code expired</span>
                )}
              </span>

              <button
                type="button"
                onClick={handleResendForgotOtp}
                disabled={timer > 0 || resendCount >= 3 || otpLoading || isLocked}
                className="flex items-center gap-1 hover:text-[var(--maroon)] disabled:opacity-40 disabled:hover:text-[var(--muted-foreground)] transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Resend Code {resendCount > 0 && `(${3 - resendCount} left)`}
              </button>
            </div>

            <button
              type="submit"
              disabled={otpLoading || isLocked || otp.length < 6}
              className="btn-luxe w-full !justify-center"
            >
              {otpLoading ? "Verifying…" : "Verify OTP"}
            </button>
          </form>

          <button
            onClick={() => setView("forgot")}
            disabled={otpLoading}
            className="flex items-center justify-center gap-1 w-full text-xs uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--maroon)] mt-4 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
        </div>
      </AuthShell>
    );
  }

  // 4. RESET PASSWORD VIEW
  if (view === "reset_password") {
    return (
      <AuthShell title="Create new password" subtitle="Secure your atelier account with a new password.">
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <Field label="New Password" type="password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <Field label="Confirm New Password" type="password" value={confirmNewPassword} onChange={setConfirmNewPassword} autoComplete="new-password" />
          {error && <p className="text-sm text-[var(--maroon)]">{error}</p>}
          <button type="submit" disabled={loading} className="btn-luxe w-full !justify-center">
            {loading ? "Updating password…" : "Reset Password"}
          </button>
        </form>
      </AuthShell>
    );
  }

  // 5. STANDARD LOGIN VIEW
  return (
    <AuthShell title="Welcome back" subtitle="Step back into your atelier.">
      {verifiedSuccess && (
        <div className="p-4 mb-6 border border-[var(--gold)] bg-[var(--beige)]/30 rounded-sm text-sm text-[var(--maroon-deep)] text-center animate-fade-in animate-duration-500">
          Your account has been successfully verified and created. Please sign in.
        </div>
      )}

      <form onSubmit={handleLoginSubmit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <div className="relative">
          <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
          <button
            type="button"
            onClick={() => setView("forgot")}
            className="absolute right-0 top-0 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--maroon)] transition-colors cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>
        {error && <p className="text-sm text-[var(--maroon)]">{error}</p>}
        <button type="submit" disabled={loading} className="btn-luxe w-full !justify-center">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-[var(--muted-foreground)]">
        New to Draupadi?{" "}
        <Link to="/register" className="text-[var(--maroon)] border-b border-[var(--gold)]">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[var(--ivory)]">
      <div className="relative hidden md:block">
        <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--maroon-deep)]/80 to-black/60" />
        <div className="relative h-full flex flex-col justify-between p-10 text-[var(--ivory)]">
          <Link to="/" className="inline-flex items-center gap-2">
            <Logo variant="dark" className="h-12" />
          </Link>
          <div>
            <h2 className="font-serif text-4xl leading-tight">Heritage sarees,<br/>woven for you.</h2>
            <p className="mt-4 text-[var(--ivory)]/80 max-w-md text-sm">Join the atelier for private previews, personalised styling and member-only collections.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 md:p-14">
        <div className="w-full max-w-md">
          <Link to="/" className="md:hidden inline-flex mb-8"><Logo variant="light" className="h-10" /></Link>
          <div className="mb-8">
            <div className="text-[0.7rem] tracking-[0.35em] uppercase text-[var(--maroon)] mb-3">The Atelier</div>
            <h1 className="font-serif text-3xl md:text-4xl">{title}</h1>
            <p className="mt-2 text-[var(--muted-foreground)] text-sm">{subtitle}</p>
          </div>
          {children}
          <Link to="/" className="block mt-8 text-center text-xs tracking-[0.3em] uppercase text-[var(--muted-foreground)] hover:text-[var(--maroon)]">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange, autoComplete, required = true }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[0.7rem] tracking-[0.28em] uppercase text-[var(--maroon-deep)]">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-4 py-3 bg-transparent border border-[var(--border)] focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] outline-none rounded-sm text-[var(--ink)]"
      />
    </label>
  );
}
