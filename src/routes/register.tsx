import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field } from "./auth";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create account — DRAUPADI" },
      { name: "description", content: "Create your DRAUPADI account for private previews, member pricing and atelier styling." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Please enter a valid email address.");
    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) return setError("Please enter a valid phone number.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName.trim(), phone: phone.trim() || null },
      },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Auto sign in user if session is established automatically
    if (data.session) {
      setLoading(false);
      toast.success("Account created and logged in successfully!");
      navigate({ to: "/" });
      return;
    }

    // Otherwise attempt to log them in automatically
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (signInError) {
      toast.success("Account created successfully! Please sign in.");
      navigate({ to: "/auth" });
    } else {
      toast.success("Account created and logged in successfully!");
      navigate({ to: "/" });
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join the Draupadi atelier in under a minute.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name" value={fullName} onChange={setFullName} autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Phone" type="tel" value={phone} onChange={setPhone} autoComplete="tel" required={true} />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {error && <p className="text-sm text-[var(--maroon)]">{error}</p>}
        <button type="submit" disabled={loading} className="btn-luxe w-full !justify-center">
          {loading ? "Creating account…" : "Create Account"}
        </button>
        <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
      <p className="mt-6 text-sm text-center text-[var(--muted-foreground)]">
        Already a member?{" "}
        <Link to="/auth" className="text-[var(--maroon)] border-b border-[var(--gold)]">Sign in</Link>
      </p>
    </AuthShell>
  );
}

