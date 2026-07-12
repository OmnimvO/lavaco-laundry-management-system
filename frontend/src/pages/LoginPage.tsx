import {
  useState,
  type FormEvent,
} from "react";

import {
  FaEnvelope,
  FaLock,
  FaSignInAlt,
} from "react-icons/fa";

import { useAuth } from "../hooks/useAuth";

function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage(
        "Email is required."
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        "Password is required."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await login({
        email: email.trim(),
        password,
      });
    } catch (error) {
      console.error(
        "Login failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to log in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            Lava Co.
          </div>

          <h1>
            Laundry Hub Management System
          </h1>

          <p>
            Sign in to manage orders,
            customers, employees, and reports.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-form-header">
            <h2>Welcome Back</h2>

            <p>
              Enter your account details to
              continue.
            </p>
          </div>

          {errorMessage && (
            <div
              className="auth-error"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <div className="auth-form-group">
            <label htmlFor="loginEmail">
              Email Address
            </label>

            <div className="auth-input-wrapper">
              <FaEnvelope />

              <input
                id="loginEmail"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="admin@lavaco.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-form-group">
            <label htmlFor="loginPassword">
              Password
            </label>

            <div className="auth-input-wrapper">
              <FaLock />

              <input
                id="loginPassword"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-button"
            disabled={isSubmitting}
          >
            <FaSignInAlt />

            <span>
              {isSubmitting
                ? "Signing In..."
                : "Sign In"}
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;