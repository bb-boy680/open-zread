// UI State management - replaces the fragile global stateListeners pattern
// Inspired by Notion's clean, hierarchical approach to state

export type UIStatus = 'idle' | 'running' | 'success' | 'error';

export interface StepRecord {
  step: string;
  detail?: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  duration?: number;
  _key: number;
}

export interface UIState {
  status: UIStatus;
  currentStep: StepRecord | null;
  stepHistory: StepRecord[];
  totalSteps: number;
  currentStepIndex: number;
  outputPath?: string;
  errorMessage?: string;
  startTime: number;
}

class UIStore {
  private listeners = new Set<(state: UIState) => void>();
  private keyCounter = 0;
  private state: UIState = {
    status: 'idle',
    currentStep: null,
    stepHistory: [],
    totalSteps: 0,
    currentStepIndex: 0,
    startTime: Date.now(),
  };

  getState(): UIState {
    return { ...this.state, stepHistory: [...this.state.stepHistory] };
  }

  subscribe(fn: (state: UIState) => void): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const snapshot = this.getState();
    this.listeners.forEach(fn => fn(snapshot));
  }

  setTotalSteps(total: number) {
    this.state.totalSteps = total;
    this.emit();
  }

  startStep(step: string, detail?: string) {
    // Archive previous step if running
    if (this.state.currentStep) {
      const prev = this.state.currentStep;
      this.state.stepHistory.push({
        ...prev,
        status: 'completed',
        completedAt: Date.now(),
        duration: Date.now() - prev.startedAt,
      });
      this.state.currentStepIndex++;
    }

    this.state.currentStep = {
      step,
      detail,
      status: 'running',
      startedAt: Date.now(),
      _key: this.keyCounter++,
    };
    this.state.status = 'running';
    this.emit();
  }

  completeStep() {
    if (this.state.currentStep) {
      const current = this.state.currentStep;
      this.state.stepHistory.push({
        ...current,
        status: 'completed',
        completedAt: Date.now(),
        duration: Date.now() - current.startedAt,
      });
      this.state.currentStepIndex++;
      this.state.currentStep = null;
      this.emit();
    }
  }

  failStep(errorMessage: string) {
    if (this.state.currentStep) {
      const current = this.state.currentStep;
      this.state.stepHistory.push({
        ...current,
        status: 'failed',
        completedAt: Date.now(),
        duration: Date.now() - current.startedAt,
      });
      this.state.currentStep = null;
    }
    this.state.status = 'error';
    this.state.errorMessage = errorMessage;
    this.emit();
  }

  succeed(outputPath: string) {
    if (this.state.currentStep) {
      const current = this.state.currentStep;
      this.state.stepHistory.push({
        ...current,
        status: 'completed',
        completedAt: Date.now(),
        duration: Date.now() - current.startedAt,
      });
      this.state.currentStepIndex++;
      this.state.currentStep = null;
    }
    this.state.status = 'success';
    this.state.outputPath = outputPath;
    this.emit();
  }

  getTotalDuration(): number {
    return Date.now() - this.state.startTime;
  }

  reset() {
    this.state = {
      status: 'idle',
      currentStep: null,
      stepHistory: [],
      totalSteps: 0,
      currentStepIndex: 0,
      startTime: Date.now(),
    };
    this.emit();
  }
}

export const uiStore = new UIStore();
