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

/**
 * SimpleDateTimeDisplay 组件（用于预览）
 * 简单的日期时间显示，不受 move-dates 设置影响
 */
function SimpleDateTimeDisplay({ item, stateManager }: { item: Item; stateManager: StateManager }) {
  const dateDisplayFormat = stateManager.getSetting('date-display-format');
  const timeFormat = stateManager.getSetting('time-format');

  const targetDate = item.data.metadata.time ?? item.data.metadata.date;

  if (!targetDate) return null;

  const hasDate = !!item.data.metadata.date;
  const hasTime = !!item.data.metadata.time;
  const dateDisplayStr = targetDate.format(dateDisplayFormat);
  const timeDisplayStr = hasTime ? targetDate.format(timeFormat) : null;

  return (
    <span className={c('item-metadata-date-wrapper') + ' ' + c('date')}>
      {hasDate && <span className={c('item-metadata-date')}>{dateDisplayStr}</span>}
      {hasDate && hasTime && ' '}
      {hasTime && <span className={c('item-metadata-time')}>{timeDisplayStr}</span>}
    </span>
  );
}

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

    // 提取日期时间和正文内容
    const { contentWithoutDateTime } = extractDateTimeAndContent(
      this.item.data.titleRaw || this.item.data.title,
      this.stateManager
    );

    // 检查是否有日期或时间
    const hasDateTime = !!(this.item.data.metadata.date || this.item.data.metadata.time);

    // 使用 Preact 渲染正文内容
    const renderContainer = itemContent.createDiv();
    this.renderContainers.push(renderContainer);
    const boardModifiers = getBoardModifiers(this.view, this.stateManager);

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

    // 如果有日期时间，显示日期时间区域（在正文下方）
    if (hasDateTime) {
      // 添加分隔线
      const separator = itemContent.createDiv();
      separator.className = c('preview-content-separator');
      separator.style.height = '1px';
      separator.style.background = 'var(--background-modifier-border)';
      separator.style.margin = '12px 0';

      const dateTimeSection = itemContent.createDiv();
      dateTimeSection.className = c('preview-datetime-section');
      dateTimeSection.style.padding = '8px 0';

      // 使用 Preact 渲染日期时间组件
      const dateTimeContainer = dateTimeSection.createDiv();
      this.renderContainers.push(dateTimeContainer);

      render(
        <SimpleDateTimeDisplay item={this.item} stateManager={this.stateManager} />,
        dateTimeContainer
      );
    }
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
