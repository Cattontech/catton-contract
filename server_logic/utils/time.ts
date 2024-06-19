import { Global } from "../../global";

export function calculateDeltaSeconds(current: Date, updatedAt: Date): number {
  const deltaMilliseconds = current.getTime() - updatedAt.getTime();
  return Math.floor(deltaMilliseconds / 1000); // Convert milliseconds to seconds
}

export function calculateIdleSeconds(current: Date, updatedAt: Date): number {
  const deltaSeconds = calculateDeltaSeconds(current, updatedAt)
  return Math.min(deltaSeconds, Global.idleConfig.max_idle_time);
}

export function isSameDay(date1: Date, date2: Date): boolean {
  const result = date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();
  return result;
}