import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Registers global keyboard shortcuts for drawing tools.
 * Attaches to window (not canvas element) since Konva canvas doesn't receive keyboard focus.
 * Reads state via useAppStore.getState() to avoid stale closures.
 */
export function useDrawingKeys() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const state = useAppStore.getState();

      // Undo: Ctrl/Cmd+Z (without Shift)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        state.undoDraw();
        return;
      }

      // Redo: Ctrl/Cmd+Shift+Z
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        state.redoDraw();
        return;
      }

      // Delete selected segment: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedSegmentId) {
        e.preventDefault();
        state.deleteSegment(state.selectedSegmentId);
        return;
      }

      // Escape: cancel in-progress drawing or deselect
      if (e.key === 'Escape') {
        state.clearDrawing();
        state.selectSegment(null);
        return;
      }

      // Tool shortcuts — only activate without modifier keys to avoid browser conflicts
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'l' || e.key === 'L') {
          state.setToolMode('line');
          return;
        }
        if (e.key === 'a' || e.key === 'A') {
          state.setToolMode('arc');
          return;
        }
        if (e.key === 's' || e.key === 'S') {
          state.setToolMode('select');
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // empty deps — all state reads go through getState()
}
