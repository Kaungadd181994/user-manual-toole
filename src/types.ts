export interface GuideStep {
  step_number: number;
  timestamp: string;
  title: string;
  action: string;
  visual_cue: string;
  screenshotDataUrl?: string;
}

export interface GuideData {
  guide_title: string;
  target_audience: string;
  summary: string;
  steps: GuideStep[];
}

export type ActiveTab = 'builder' | 'settings';
