import { useState } from "react";
import { register, login, verifyOtp } from "@/lib/api/auth";
import { toast } from "sonner";

type AuthGateProps = {
  onAuthed: () => void;
};

export function AuthGate({ onAuthed }: AuthGateProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [identifier, setIdentifier] = useState("");
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await login(identifier, form.password);
      toast.success("Logged in");
      onAuthed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setLoading(true);
    try {
      const result = await register(form);
      setOtpIdentifier(result.user.email);
      setIdentifier(result.user.email);
      setStep("otp");
      toast.success(result.mock_otp ? `Mock OTP: ${result.mock_otp}` : "OTP sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    try {
      await verifyOtp(otpIdentifier, otpCode);
      toast.success("Verified");
      onAuthed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-signal-bg px-4">
      <div className="w-full max-w-md rounded-3xl border border-signal-border bg-signal-panel p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-signal-text">Signal</h1>
        <p className="mt-1 text-sm text-signal-muted">Private messaging backed by Django and JWT.</p>

        {step === "otp" ? (
          <div className="mt-6 space-y-4">
            <div className="text-sm text-signal-muted">Enter the mock OTP we returned after registration.</div>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="OTP code"
              className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
            />
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full rounded-lg bg-signal-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Verify OTP
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === "login" ? "bg-signal-accent text-white" : "bg-signal-bg text-signal-text"}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === "register" ? "bg-signal-accent text-white" : "bg-signal-bg text-signal-text"}`}
              >
                Register
              </button>
            </div>

            {mode === "login" ? (
              <>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Username, email or phone"
                  className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
                />
                <input
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  type="password"
                  className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
                />
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full rounded-lg bg-signal-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                <input
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Username"
                  className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
                />
                <input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
                />
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
                />
                <input
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  type="password"
                  className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
                />
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full rounded-lg bg-signal-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Create account
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
