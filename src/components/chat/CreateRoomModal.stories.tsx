import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CreateRoomModal } from './CreateRoomModal';

const meta: Meta<typeof CreateRoomModal> = {
  title: 'Chat/CreateRoomModal',
  component: CreateRoomModal,
  args: {
    open: true,
    error: null,
    isSubmitting: false,
    onClose: fn(),
    onSubmit: async (values) => {
      logSubmit(values);
    }
  },
  parameters: {
    layout: 'centered'
  }
};

export default meta;

type Story = StoryObj<typeof CreateRoomModal>;

const logSubmit = fn<(values: { name: string; description?: string | null; isPublic?: boolean }) => void>();

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: 'No se pudo crear la sala. Intenta nuevamente.'
  }
};

export const Submitting: Story = {
  args: {
    isSubmitting: true
  }
};
