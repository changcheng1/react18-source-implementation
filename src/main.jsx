/**
 * React 18 Implementation - Main Entry Point
 *
 * This file demonstrates the basic usage of our React 18 implementation,
 * showcasing component rendering, state management with hooks, and event handling.
 *
 * @author React 18 Implementation Team
 * @version 1.0.0
 */
import * as React from "react";
import { createRoot } from "react-dom/client";

/**
 * Example functional component demonstrating useState hook and event handling
 * @returns {JSX.Element} A clickable div that displays and increments a counter
 */
function FunctionComponent() {
  const [numbers, setNumbers] = React.useState(2);

  return (
    <div
      onClick={() => {
        setNumbers(numbers + 1);
      }}
    >
      {numbers}
    </div>
  );
}

// Create root container and render the application
const root = createRoot(document.getElementById("root"));
root.render(<FunctionComponent />);
