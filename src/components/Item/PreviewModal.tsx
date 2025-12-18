import { Modal } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { KanbanView } from 'src/KanbanView';
import { StateManager } from 'src/StateManager';
import { getBoardModifiers } from 'src/helpers/boardModifiers';

import { MarkdownRenderer } from '../MarkdownRenderer/MarkdownRenderer';
import { KanbanContext } from '../context';
import { c } from '../helpers';
import { Item } from '../types';
import { extractDateTimeAndContent } from './ItemContent';

export class PreviewModal extends Modal {
  view: KanbanView;
  stateManager: StateManager;
  item: Item;
  renderContainers: HTMLElement[] = [];

  constructor(view: KanbanView, stateManager: StateManager, item: Item) {
    super(view.app);
    this.view = view;
    this.stateManager = stateManager;
    this.item = item;
  }

  onOpen() {
    const { contentEl, modalEl } = this;

    modalEl.addClass(c('preview-modal'));
    modalEl.style.width = '80%';
    modalEl.style.maxWidth = '900px';
    modalEl.style.maxHeight = '80vh';

    contentEl.empty();
    contentEl.style.overflowY = 'auto';
    contentEl.style.maxHeight = 'calc(80vh - 60px)';
    contentEl.style.padding = '20px';

    // 创建标题
    const titleEl = contentEl.createDiv();
    titleEl.style.fontSize = '20px';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.marginBottom = '20px';
    titleEl.style.paddingBottom = '10px';
    titleEl.style.borderBottom = '2px solid var(--background-modifier-border)';
    titleEl.textContent = '预览卡片';

    // 创建内容容器
    const itemWrapper = contentEl.createDiv();
    itemWrapper.style.padding = '15px';
    itemWrapper.style.border = '1px solid var(--background-modifier-border)';
    itemWrapper.style.borderRadius = '8px';
    itemWrapper.style.backgroundColor = 'var(--background-secondary)';

    // Item 内容容器
    const itemContent = itemWrapper.createDiv();
    itemContent.className = c('preview-item-content');

    // 使用 Preact 渲染 MarkdownRenderer
    const renderContainer = itemContent.createDiv();
    this.renderContainers.push(renderContainer);
    const boardModifiers = getBoardModifiers(this.view, this.stateManager);

    // 提取不含日期时间的内容进行预览
    const { contentWithoutDateTime } = extractDateTimeAndContent(
      this.item.data.titleRaw || this.item.data.title,
      this.stateManager
    );

    render(
      <KanbanContext.Provider
        value={{
          filePath: this.view.file.path,
          stateManager: this.stateManager,
          boardModifiers: boardModifiers,
          view: this.view,
        }}
      >
        <MarkdownRenderer
          entityId={undefined}
          className={c('preview-markdown')}
          markdownString={contentWithoutDateTime}
        />
      </KanbanContext.Provider>,
      renderContainer
    );
  }

  onClose() {
    const { contentEl } = this;
    // 清理 Preact 组件
    this.renderContainers.forEach((container) => {
      unmountComponentAtNode(container);
    });
    this.renderContainers = [];
    contentEl.empty();
  }
}
