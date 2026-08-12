import {
  providerStartErrorMessage,
  providerUnavailableMessage,
} from "./providers";

const publicAuthErrors = new Set([
  "Account is not active",
  "Choose a supported sign-in provider.",
  "Email or password was not recognized.",
  "Sign-in is temporarily unavailable.",
  "Sign-up is temporarily unavailable.",
  "Social sign-in is temporarily unavailable.",
  "Social sign-in was cancelled. Please try again when you are ready.",
  "Social sign-in could not be completed. Please try again or continue with email.",
  providerUnavailableMessage("google"),
  providerUnavailableMessage("facebook"),
  providerStartErrorMessage("google"),
  providerStartErrorMessage("facebook"),
]);

export function publicAuthErrorMessage(value: string | null | undefined) {
  if (!value || value.length > 200 || !publicAuthErrors.has(value)) {
    return null;
  }
  return value;
}

export function safeNextPath(value: string | null | undefined) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/feed";
}

export function oauthCallbackErrorMessage(
  error: string | null | undefined,
  errorDescription: string | null | undefined,
  errorCode?: string | null,
) {
  if (!error && !errorDescription && !errorCode) {
    return null;
  }

  if (error === "access_denied") {
    return "Social sign-in was cancelled. Please try again when you are ready.";
  }

  return "Social sign-in could not be completed. Please try again or continue with email.";
}

export function oauthExchangeErrorMessage() {
  return "Social sign-in could not be completed. Please try again or continue with email.";
}
