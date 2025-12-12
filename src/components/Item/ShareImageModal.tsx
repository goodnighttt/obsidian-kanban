import html2canvas from 'html2canvas';
import { Modal } from 'obsidian';
import { KanbanView } from 'src/KanbanView';
import { StateManager } from 'src/StateManager';

import { c } from '../helpers';
import { Item } from '../types';

export class ShareImageModal extends Modal {
  view: KanbanView;
  stateManager: StateManager;
  item: Item;
  imageDataUrl: string | null = null;

  constructor(view: KanbanView, stateManager: StateManager, item: Item, imageDataUrl: string) {
    super(view.app);
    this.view = view;
    this.stateManager = stateManager;
    this.item = item;
    this.imageDataUrl = imageDataUrl;
  }

  onOpen() {
    const { contentEl, modalEl } = this;

    modalEl.addClass(c('share-image-modal'));
    modalEl.style.width = '90%';
    modalEl.style.maxWidth = '1200px';
    modalEl.style.maxHeight = '90vh';

    contentEl.empty();
    contentEl.style.padding = '20px';
    contentEl.style.display = 'flex';
    contentEl.style.flexDirection = 'column';
    contentEl.style.height = '100%';

    // 创建头部，包含按钮
    const headerEl = contentEl.createDiv();
    headerEl.style.display = 'flex';
    headerEl.style.justifyContent = 'flex-end';
    headerEl.style.gap = '10px';
    headerEl.style.marginBottom = '20px';
    headerEl.style.paddingBottom = '10px';
    headerEl.style.borderBottom = '2px solid var(--background-modifier-border)';

    // 复制按钮
    const copyButton = headerEl.createEl('button');
    copyButton.textContent = '复制';
    copyButton.className = 'mod-cta';
    copyButton.style.marginRight = '10px';
    copyButton.onclick = async () => {
      if (this.imageDataUrl) {
        try {
          // 将 base64 图片转换为 blob
          const response = await fetch(this.imageDataUrl);
          const blob = await response.blob();

          // 使用 ClipboardItem API 复制图片
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({
                [blob.type]: blob,
              }),
            ]);

            // 显示成功提示
            copyButton.textContent = '已复制！';
            setTimeout(() => {
              copyButton.textContent = '复制';
            }, 2000);
          } else {
            // 如果不支持 ClipboardItem API，提示用户右键保存图片
            copyButton.textContent = '请右键保存图片';
            setTimeout(() => {
              copyButton.textContent = '复制';
            }, 2000);
          }
        } catch (err) {
          console.error('复制图片失败:', err);
          copyButton.textContent = '复制失败';
          setTimeout(() => {
            copyButton.textContent = '复制';
          }, 2000);
        }
      }
    };

    // 关闭按钮
    const closeButton = headerEl.createEl('button');
    closeButton.textContent = '关闭';
    closeButton.onclick = () => {
      this.close();
    };

    // 创建图片容器
    const imageContainer = contentEl.createDiv();
    imageContainer.style.flex = '1';
    imageContainer.style.display = 'flex';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.alignItems = 'flex-start';
    imageContainer.style.overflow = 'auto';
    imageContainer.style.padding = '20px';

    // 创建图片元素
    if (this.imageDataUrl) {
      const img = imageContainer.createEl('img');
      img.src = this.imageDataUrl;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    // 清理图片数据
    if (this.imageDataUrl) {
      URL.revokeObjectURL(this.imageDataUrl);
      this.imageDataUrl = null;
    }
  }
}
