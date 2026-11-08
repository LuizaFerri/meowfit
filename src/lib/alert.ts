import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

function webAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const action = buttons?.find((b) => b.style !== 'cancel');
  if (cancel && action) {
    if (window.confirm(text)) action.onPress?.();
    else cancel.onPress?.();
    return;
  }
  window.alert(text);
  (action ?? cancel)?.onPress?.();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS === 'web') webAlert(title, message, buttons);
    else NativeAlert.alert(title, message, buttons);
  },
};
