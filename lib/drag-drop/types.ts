// Types for drag and drop functionality
export interface DragItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  roomId: string;
  color: string;
  personId: string;
  currentDate: Date;
  services?: Array<{ name: string }>;
}

export interface DropResult {
  date: Date;
  time: string;
  roomId: string;
  minuteOffset?: number;
}

export interface DragPreview {
  x: number;
  y: number;
  date: Date;
  time: string;
  roomId: string;
}

export interface DragState {
  isDragging: boolean;
  draggedItem: DragItem | null;
  preview: DragPreview | null;
  originalPosition: {
    date: Date;
    time: string;
    roomId: string;
  } | null;
}

export interface TimeSlot {
  hour: string;
  date: Date;
  roomId: string;
}
