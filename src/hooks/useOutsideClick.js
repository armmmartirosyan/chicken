import { useEffect } from "react";

export function useOutsideClick(ref, handler, parentRef) {
  useEffect(() => {
    const listener = (event) => {
      // Do nothing if clicking ref's element or descendant elements
      if (
        !ref.current ||
        ref.current.contains(event.target) ||
        (parentRef &&
          parentRef.current &&
          parentRef.current.contains(event.target))
      ) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, parentRef]); // Only re-run if ref, handler, or parentRef changes
}
