import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MessageInput } from './MessageInput';

const logSend = fn<(content: string) => void>();
const logTyping = fn<() => void>();

const meta: Meta<typeof MessageInput> = {
  title: 'Chat/MessageInput',
  component: MessageInput,
  args: {
    onSend: async (content: string) => {
      logSend(content);
      return {};
    },
    onTyping: () => logTyping(),
    placeholder: 'Escribe un mensaje...'
  },
  parameters: {
    layout: 'centered'
  }
};

export default meta;

type Story = StoryObj<typeof MessageInput>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    isDisabled: true
  }
};
