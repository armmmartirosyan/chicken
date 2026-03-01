import { CanvasGameArea } from "./CanvasGameArea";
import "./index.css";

export function GameArea({
  onJumpReady,
  scrollContainerRef,
  difficulty,
  onLoadingChange,
}) {
  return (
    <div className="game-area-wrapper">
      <CanvasGameArea
        onJumpReady={onJumpReady}
        scrollContainerRef={scrollContainerRef}
        difficulty={difficulty}
        onLoadingChange={onLoadingChange}
      />
    </div>
  );
}
