import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

import AppList from './appList';

const authedPostMock = jest.fn();
const toastErrorMock = jest.fn();
const toastSuccessMock = jest.fn();

jest.mock('hooks/useAuth', () => ({
  __esModule: true,
  ...(() => {
    const user = { email: 'admin@example.com' };

    return {
      default: () => ({ user }),
      useAuth: () => ({ user }),
    };
  })(),
}));

jest.mock('lib/api', () => ({
  authedPost: (...args: unknown[]) => authedPostMock(...args),
}));

jest.mock('react-toastify', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

jest.mock('components/admin/create-app', () => ({
  CreateApp: () => <button type="button">Create App</button>,
}));

jest.mock('app/admin/addSubpage', () => ({
  AddSubpage: () => null,
}));

jest.mock('app/admin/childApps', () => ({
  ChildApps: () => null,
}));

jest.mock('./rotateKeyModal', () => ({
  RotateApiKeyModal: ({
    openModal,
    rotate,
  }: {
    openModal: boolean;
    rotate: () => Promise<void>;
  }) =>
    openModal ? (
      <button type="button" onClick={rotate}>
        Confirm rotate
      </button>
    ) : null,
}));

jest.mock('rc-tooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

describe('AppList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dapp_api_keys metadata without undefined or plaintext keys', async () => {
    authedPostMock.mockResolvedValueOnce({
      data: {
        data: [
          {
            admin_uid: 'admin_uid',
            apiKeyLastUsedAt: null,
            apiKeyPrefix: 'prefix42',
            apiKeyRotatedAt: '2026-04-27T00:00:00.000Z',
            apiKeyStatus: 'active',
            appname: 'Active Key App',
            id: 42,
            uid: 'public-app-uid-42',
          },
          {
            admin_uid: 'admin_uid',
            apiKeyLastUsedAt: null,
            apiKeyPrefix: null,
            apiKeyRotatedAt: null,
            apiKeyStatus: 'missing',
            appname: 'Missing Key App',
            id: 43,
            uid: 'public-app-uid-43',
          },
        ],
      },
    });

    const { container } = render(<AppList />);

    expect(await screen.findByText('Active Key App')).toBeTruthy();
    expect(screen.getByText('prefix42...')).toBeTruthy();
    expect(screen.getByText('Missing active key')).toBeTruthy();
    expect(
      screen.getByText('Rotate this app key to create a new one-time API key.')
    ).toBeTruthy();
    expect(container.textContent).not.toContain('undefined');
    expect(container.textContent).not.toContain('legacy-plaintext-key');
  });

  it('rotates by numeric dapp id instead of public uid', async () => {
    authedPostMock
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              admin_uid: 'admin_uid',
              apiKeyPrefix: null,
              apiKeyStatus: 'missing',
              appname: 'Recoverable App',
              id: 43,
              uid: 'public-app-uid-43',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            apiKey: 'cubid_live_prefix_secret',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              admin_uid: 'admin_uid',
              apiKeyPrefix: 'prefix',
              apiKeyStatus: 'active',
              appname: 'Recoverable App',
              id: 43,
              uid: 'public-app-uid-43',
            },
          ],
        },
      });

    render(<AppList />);

    fireEvent.click(
      await screen.findByLabelText('Rotate API key for Recoverable App')
    );
    fireEvent.click(await screen.findByText('Confirm rotate'));

    await waitFor(() => {
      expect(authedPostMock).toHaveBeenCalledWith(
        '/api/admin/apps/rotate-key',
        {
          dappId: 43,
        }
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('Confirm rotate')).toBeNull();
    });
    expect(authedPostMock).not.toHaveBeenCalledWith(
      '/api/admin/apps/rotate-key',
      {
        dappId: 'public-app-uid-43',
      }
    );
  });
});
