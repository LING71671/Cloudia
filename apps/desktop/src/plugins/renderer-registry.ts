import type { Component } from 'vue';
import type { MessageType } from '@cloudia/shared';
import TextMessage from '@/components/chat/renderers/TextMessage.vue';
import SystemMessage from '@/components/chat/renderers/SystemMessage.vue';
import EncryptedMessage from '@/components/chat/renderers/EncryptedMessage.vue';

const renderers: Partial<Record<MessageType, Component>> = {
  text: TextMessage,
  system: SystemMessage,
  'ephemeral-text': EncryptedMessage,
};

export function getRenderer(type: MessageType): Component {
  return renderers[type] ?? TextMessage;
}

export function registerRenderer(type: MessageType, component: Component) {
  renderers[type] = component;
}
