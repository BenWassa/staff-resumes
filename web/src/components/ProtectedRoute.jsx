/**
 * Local-only app shell. Route protection is intentionally disabled because the
 * app no longer has a login workflow or remote identity provider.
 */
export default function ProtectedRoute({ children }) {
  return children;
}
