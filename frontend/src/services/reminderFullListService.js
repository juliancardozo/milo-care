import { getFullRemindersList } from './api';

export async function fetchFullRemindersList(windowDays) {
  const { data } = await getFullRemindersList(windowDays);
  return data;
}
