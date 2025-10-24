/**
 * React Feature Flags - Runtime Feature Configuration
 *
 * This module contains feature flags that control the behavior of React features.
 * Feature flags allow React to enable/disable features at runtime, which is useful
 * for gradual rollouts, A/B testing, and maintaining backward compatibility.
 *
 * In a production React build, these flags are typically replaced with constants
 * during the build process to enable dead code elimination.
 *
 * @module ReactFeatureFlags
 */

/**
 * Allow Concurrent by Default
 *
 * Controls whether concurrent rendering features are enabled by default.
 * When true, React will use concurrent rendering mode, which enables:
 * - Time slicing and interruptible rendering
 * - Priority-based scheduling
 * - Concurrent features like Suspense and Transitions
 *
 * This flag is essential for React 18's concurrent features.
 */
export const allowConcurrentByDefault = true;
