export interface Shift {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string;
  title: string;
  color: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  avatar: string;
  shifts: Shift[];
}
