jest.mock('react-native', () => ({ Platform: { OS: 'web' }, Alert: { alert: jest.fn() } }));

const confirm = jest.fn();
const alert = jest.fn();
(globalThis as any).window = { confirm, alert };

const { Alert } = require('@/lib/alert') as typeof import('@/lib/alert');

beforeEach(() => jest.clearAllMocks());

test('confirmation dialogs run the action only when confirmed', () => {
  const onDelete = jest.fn();
  const onCancel = jest.fn();
  const buttons = [
    { text: 'Cancelar', style: 'cancel' as const, onPress: onCancel },
    { text: 'Excluir', style: 'destructive' as const, onPress: onDelete },
  ];

  confirm.mockReturnValueOnce(true);
  Alert.alert('Excluir Luiza?', 'Apaga tudo.', buttons);
  expect(confirm).toHaveBeenCalledWith('Excluir Luiza?\n\nApaga tudo.');
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();

  confirm.mockReturnValueOnce(false);
  Alert.alert('Excluir Luiza?', 'Apaga tudo.', buttons);
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('plain messages use a simple alert', () => {
  Alert.alert('Nome', 'Digite um nome para o perfil.');
  expect(alert).toHaveBeenCalledWith('Nome\n\nDigite um nome para o perfil.');
  expect(confirm).not.toHaveBeenCalled();
});
