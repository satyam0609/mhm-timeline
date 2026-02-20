import { useEffect, useRef } from "react";

const useDragScrollLock = (isDragging: any, onEnd: any) => {
  const containerRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;

    const handleEnd = () => {
      if (isDragging) onEnd();
    };

    const preventDefault = (e: any) => {
      if (isDragging && e.cancelable) e.preventDefault();
    };

    if (isDragging) {
      // 1. Style Locks
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      // 2. Global "End" Listeners
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchend", handleEnd);
      window.addEventListener("touchcancel", handleEnd);

      // 3. Passive Listener Fix (Manually attached to container)
      if (container) {
        container.addEventListener("touchstart", preventDefault, {
          passive: false,
        });
        container.addEventListener("touchmove", preventDefault, {
          passive: false,
        });
      }
    }

    return () => {
      // Cleanup Styles
      document.body.style.overflow = "";
      document.body.style.touchAction = "";

      // Cleanup Global Listeners
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);

      // Cleanup Passive Listeners
      if (container) {
        container.removeEventListener("touchstart", preventDefault);
        container.removeEventListener("touchmove", preventDefault);
      }
    };
  }, [isDragging, onEnd]);

  return containerRef;
};

export default useDragScrollLock;
