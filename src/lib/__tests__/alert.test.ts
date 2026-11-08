import { Alert, closeDialog, useDialogs } from '@/lib/alert';

beforeEach(() => useDialogs.setState({ queue: [] }));

test('confirmation dialogs run only the chosen button', () => {
  const onDelete = jest.fn();
  const onCancel = jest.fn();
  Alert.alert('Apagar meus dados?', 'Apaga tudo.', [
    { text: 'Cancelar', style: 'cancel', onPress: onCancel },
    { text: 'Apagar tudo', style: 'destructive', onPress: onDelete },
  ]);
  const [d] = useDialogs.getState().queue;
  expect(d).toMatchObject({ title: 'Apagar meus dados?', message: 'Apaga tudo.' });

  closeDialog(d.id, d.buttons[1]);
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
  expect(useDialogs.getState().queue).toEqual([]);
});

test('plain messages get an OK button and queue up in order', () => {
  Alert.alert('Nome', 'Digite seu nome para continuar.');
  Alert.alert('Ops', 'Outro aviso.');
  const queue = useDialogs.getState().queue;
  expect(queue.map((d) => d.title)).toEqual(['Nome', 'Ops']);
  expect(queue[0].buttons).toEqual([{ text: 'OK' }]);

  closeDialog(queue[0].id, queue[0].buttons[0]);
  expect(useDialogs.getState().queue.map((d) => d.title)).toEqual(['Ops']);
});
