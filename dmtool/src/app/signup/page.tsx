"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);

    const { data, error } = await signUpWithEmail(email.trim(), password);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      router.push("/campaigns");
      return;
    }

    setMessage("Sign-up successful. Check your email to confirm your account.");
  };

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10">
      <div className="rounded border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign up</h1>
        <p className="mt-2 text-sm text-slate-600">Create a new account with your email and password.</p>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@example.com"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="••••••••"
          />
        </label>

        <button
          className="mt-6 w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Signing up…" : "Sign up"}
        </button>

        {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}

        <p className="mt-6 text-sm text-slate-600">
          Already have an account? <a className="font-medium text-blue-600 hover:text-blue-700" href="/login">Sign in</a>
        </p>
      </div>
    </main>
  );
}
