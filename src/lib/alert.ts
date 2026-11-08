import type { AlertButton } from 'react-native';
import { create } from 'zustand';

export type Dialog = { id: number; title: string; message?: string; buttons: AlertButton[] };

type DialogState = { queue: Dialog[] };

let nextId = 0;

export const useDialogs = create<DialogState>(() => ({ queue: [] }));

export function closeDialog(id: number, button?: AlertButton) {
  useDialogs.setState((s) => ({ queue: s.queue.filter((d) => d.id !== id) }));
  button?.onPress?.();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    const dialog: Dialog = {
      id: ++nextId,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    };
    useDialogs.setState((s) => ({ queue: [...s.queue, dialog] }));
  },
};
