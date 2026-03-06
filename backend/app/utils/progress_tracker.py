"""
Progress tracking utility for multi-step upload process.

5 main steps:
  1. Upload (0-20%)
  2. Extract Text (20-40%)
  3. Chunking (40-60%)
  4. Embedding (60-80%)
  5. Save to DB/Qdrant (80-100%)
"""


class ProgressTracker:
    """Tracks progress across 5 steps, normalizing sub-step progress."""

    STEPS = {
        "upload": (0, 20),
        "extract_text": (20, 40),
        "chunking": (40, 60),
        "embedding": (60, 80),
        "save": (80, 100),
    }

    @staticmethod
    def calculate_progress(
        step: str,
        step_progress: int,
        total_substeps: int = 1,
        current_substep: int = 1,
    ) -> int:
        """
        Calculate overall progress percentage.

        Args:
            step: Step name ('upload', 'extract_text', 'chunking', 'embedding', 'save')
            step_progress: Progress within the step (0-100)
            total_substeps: Total sub-steps in this step (default 1 for non-divided steps)
            current_substep: Current sub-step number (default 1)

        Returns:
            Overall progress (0-100)
        """
        if step not in ProgressTracker.STEPS:
            return 0

        step_start, step_end = ProgressTracker.STEPS[step]
        step_range = step_end - step_start

        if total_substeps == 1:
            # Simple step without sub-division
            return step_start + int((step_progress / 100) * step_range)
        else:
            # Divide step_range among substeps
            substep_width = step_range / total_substeps
            substep_start = step_start + int((current_substep - 1) * substep_width)
            return substep_start + int((step_progress / 100) * substep_width)

    @staticmethod
    def get_message_with_step(step: str, message: str) -> str:
        """Add step indicator to message."""
        step_names = {
            "upload": "📤 Uploading",
            "extract_text": "📄 Extracting text",
            "chunking": "✂️ Chunking",
            "embedding": "🧠 Embedding",
            "save": "💾 Saving to database",
        }
        prefix = step_names.get(step, step)
        return f"{prefix}: {message}"
