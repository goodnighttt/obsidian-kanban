import { Modal, Setting } from 'obsidian';
import { StateManager } from 'src/StateManager';
import { Path } from 'src/dnd/types';
import { BoardModifiers } from 'src/helpers/boardModifiers';
import { t } from 'src/lang/helpers';

import { c } from '../helpers';
import { Item } from '../types';

export class PropertyEditorModal extends Modal {
  stateManager: StateManager;
  boardModifiers: BoardModifiers;
  item: Item;
  path: Path;
  editingKey: string | null;
  onSave: (item: Item) => void;

  constructor(
    stateManager: StateManager,
    boardModifiers: BoardModifiers,
    item: Item,
    path: Path,
    editingKey: string | null,
    onSave: (item: Item) => void
  ) {
    super(stateManager.app);
    this.stateManager = stateManager;
    this.boardModifiers = boardModifiers;
    this.item = item;
    this.path = path;
    this.editingKey = editingKey;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass(c('property-editor-modal'));

    contentEl.empty();

    const itemMetadata = this.item.data.metadata.itemMetadata || {};
    const isEditing = this.editingKey !== null && this.editingKey !== undefined;
    const currentKey = isEditing ? this.editingKey : '';
    const currentValue = isEditing && currentKey ? itemMetadata[currentKey] || '' : '';

    new Setting(contentEl).setHeading().setName(isEditing ? t('Edit property') : t('Add property'));

    const keySetting = new Setting(contentEl).setName(t('Property key')).addText((text) => {
      text.setValue(currentKey).setPlaceholder(t('Property key'));
      if (!isEditing) {
        text.inputEl.onkeydown = (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            valueSetting.controlEl.querySelector('input')?.focus();
          }
        };
      } else {
        text.setDisabled(true);
      }
    });

    const valueSetting = new Setting(contentEl).setName(t('Property value')).addText((text) => {
      text.setValue(currentValue).setPlaceholder(t('Property value'));
      text.inputEl.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSave(keySetting, valueSetting);
        } else if (e.key === 'Escape') {
          this.close();
        }
      };
    });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(t('Save'))
          .setCta()
          .onClick(() => this.handleSave(keySetting, valueSetting));
      })
      .addButton((button) => {
        button.setButtonText(t('Cancel')).onClick(() => this.close());
      });

    // Focus on key input if adding new, value input if editing
    setTimeout(() => {
      if (isEditing) {
        valueSetting.controlEl.querySelector('input')?.focus();
        valueSetting.controlEl.querySelector('input')?.select();
      } else {
        keySetting.controlEl.querySelector('input')?.focus();
      }
    }, 0);
  }

  handleSave(keySetting: Setting, valueSetting: Setting) {
    const keyInput = keySetting.controlEl.querySelector('input') as HTMLInputElement;
    const valueInput = valueSetting.controlEl.querySelector('input') as HTMLInputElement;

    const key = keyInput?.value.trim();
    const value = valueInput?.value.trim();

    if (!key) {
      return;
    }

    const itemMetadata = { ...(this.item.data.metadata.itemMetadata || {}) };
    itemMetadata[key] = value || '';

    const updatedItem = {
      ...this.item,
      data: {
        ...this.item.data,
        metadata: {
          ...this.item.data.metadata,
          itemMetadata,
        },
      },
    };

    this.onSave(updatedItem);
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
