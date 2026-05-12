/**
 * PreviewModal.tsx
 *
 * 卡片预览模态窗口 - 在弹窗中预览和编辑 Kanban 卡片内容
 *
 * 主要功能：
 * 1. 以只读模式预览卡片内容（Markdown 渲染）
 * 2. 通过标题栏（与关闭按钮同行）的编辑按钮切换为编辑模式
 * 3. 编辑模式下实时同步修改到看板数据
 * 4. 显示卡片元数据（日期、时间等）
 *
 * @author Obsidian Kanban Plugin
 * @date 2024-12-16
 */

import { Modal, setIcon } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { KanbanView } from 'src/KanbanView';
import { StateManager } from 'src/StateManager';
import { Path } from 'src/dnd/types';
import { getEntityFromPath } from 'src/dnd/util/data';
import { getBoardModifiers } from 'src/helpers/boardModifiers';

import { MarkdownEditor, allowNewLine } from '../Editor/MarkdownEditor';
import { MarkdownRenderer } from '../MarkdownRenderer/MarkdownRenderer';
import { KanbanContext } from '../context';
import { c } from '../helpers';
import { Item } from '../types';
import { extractDateTimeAndContent } from './ItemContent';

// region 类型定义

/** PreviewContent 组件的属性 */
interface PreviewContentProps {
  item: Item;
  view: KanbanView;
  stateManager: StateManager;
  path: Path;
}

// endregion

// region 辅助组件

/**
 * SimpleDateTimeDisplay 组件
 *
 * 用于预览窗口中的日期时间显示
 * 不受 move-dates 设置影响，始终以统一格式显示
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

// endregion

// region 主内容组件

/**
 * PreviewContent 组件
 *
 * 预览窗口的核心内容区域，支持只读/编辑模式切换
 *
 * 工作流程：
 * 1. 默认为只读模式，展示 Markdown 渲染后的卡片内容
 * 2. 用户点击标题栏（与关闭按钮同行）的编辑按钮切换到编辑模式
 * 3. 编辑模式下使用 MarkdownEditor 编辑正文，修改实时同步到看板
 * 4. 再次点击按钮或按 Escape 退出编辑模式
 */
function PreviewContent({ item, view, stateManager, path }: PreviewContentProps) {
  /** 是否处于编辑模式 */
  const [isEditMode, setIsEditMode] = useState(false);

  // boardModifiers 用于更新卡片数据
  const boardModifiers = getBoardModifiers(view, stateManager);

  // 提取日期时间和正文内容
  const { dateTimeLine, contentWithoutDateTime } = extractDateTimeAndContent(
    item.data.titleRaw || item.data.title,
    stateManager
  );

  const hasDateTime = !!(item.data.metadata.date || item.data.metadata.time);

  // 编辑内容引用：保存当前编辑的正文和日期时间行
  const titleRef = useRef<string>(contentWithoutDateTime);
  const dateTimeLineRef = useRef<string>(dateTimeLine);

  /**
   * 实时保存修改到看板数据
   *
   * 当编辑器内容发生变化时：
   * 1. 从编辑器获取最新内容
   * 2. 将正文与日期时间行重新组合
   * 3. 通过 boardModifiers.updateItem 实时更新看板数据
   */
  const handleContentChange = useCallback(
    (update: any) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString().trim();
        titleRef.current = newContent;

        const finalContent = dateTimeLineRef.current
          ? `${newContent}\n${dateTimeLineRef.current}`.trim()
          : newContent;

        const updatedItem = stateManager.updateItemContent(item, finalContent);
        boardModifiers.updateItem(path, updatedItem);
      }
    },
    [boardModifiers, path, stateManager, item]
  );

  /** Enter 键处理：根据设置决定是否允许换行 */
  const handleEnter = useCallback(
    (cm: any, mod: boolean, shift: boolean): boolean => {
      return !allowNewLine(stateManager, mod, shift);
    },
    [stateManager]
  );

  /** Escape 键处理：退出编辑模式 */
  const handleEscape = useCallback(() => {
    setIsEditMode(false);
    return true;
  }, []);

  // 暴露切换方法给外部（Modal 类的 DOM 按钮），挂到 window 上
  useEffect(() => {
    (window as any).__kanbanPreviewToggle = () => {
      setIsEditMode((prev) => !prev);
    };
    return () => {
      delete (window as any).__kanbanPreviewToggle;
    };
  }, []);

  return (
    <KanbanContext.Provider
      value={{
        filePath: view.file.path,
        stateManager,
        boardModifiers,
        view,
      }}
    >
      <div className={c('preview-content-wrapper')}>
        {/* region 内容区域 */}
        <div
          style={{
            padding: '15px',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '8px',
            backgroundColor: 'var(--background-secondary)',
          }}
        >
          {isEditMode ? (
            /* region 编辑模式 */
            <div className={c('preview-edit-area')}>
              <MarkdownEditor
                className={c('preview-editor')}
                onEnter={handleEnter}
                onEscape={handleEscape}
                onSubmit={() => {}}
                value={titleRef.current}
                onChange={handleContentChange}
              />

              {/* 日期时间分隔线和显示 */}
              {hasDateTime && (
                <div
                  className={c('item-content-separator')}
                  style={{ height: '1px', background: 'var(--background-modifier-border)', margin: '12px 0' }}
                />
              )}
              {hasDateTime && (
                <div className={c('preview-datetime-section')} style={{ padding: '8px 0' }}>
                  <SimpleDateTimeDisplay item={item} stateManager={stateManager} />
                </div>
              )}
            </div>
            /* endregion */
          ) : (
            /* region 只读模式 */
            <div className={c('preview-readonly-area')}>
              {/* Markdown 渲染内容 */}
              <div className={c('preview-item-content')}>
                <MarkdownRenderer
                  entityId={undefined}
                  className={c('preview-markdown')}
                  markdownString={contentWithoutDateTime}
                />
              </div>

              {/* 日期时间分隔线和显示 */}
              {hasDateTime && (
                <>
                  <div
                    className={c('preview-content-separator')}
                    style={{
                      height: '1px',
                      background: 'var(--background-modifier-border)',
                      margin: '12px 0',
                    }}
                  />
                  <div className={c('preview-datetime-section')} style={{ padding: '8px 0' }}>
                    <SimpleDateTimeDisplay item={item} stateManager={stateManager} />
                  </div>
                </>
              )}
            </div>
            /* endregion */
          )}
        </div>
        {/* endregion */}
      </div>
    </KanbanContext.Provider>
  );
}

// endregion

// region PreviewModal 类

/**
 * PreviewModal 模态窗口
 *
 * 继承 Obsidian 的 Modal 类，作为 PreviewContent 的容器。
 * 在标题栏（与关闭按钮同行）创建编辑/只读切换按钮。
 */
export class PreviewModal extends Modal {
  view: KanbanView;
  stateManager: StateManager;
  item: Item;
  path: Path;
  renderContainers: HTMLElement[] = [];
  /** 编辑模式状态 */
  private isEditMode = false;
  /** 编辑/只读按钮的引用 */
  private editButtonEl: HTMLElement | null = null;

  constructor(view: KanbanView, stateManager: StateManager, item: Item, path: Path) {
    super(view.app);
    this.view = view;
    this.stateManager = stateManager;
    this.item = item;
    this.path = path;
  }

  onOpen() {
    const { contentEl, modalEl } = this;

    // region 模态窗口基础样式
    modalEl.addClass(c('preview-modal'));
    modalEl.style.width = '80%';
    modalEl.style.maxWidth = '900px';
    modalEl.style.maxHeight = '80vh';

    contentEl.empty();
    contentEl.style.overflowY = 'auto';
    contentEl.style.maxHeight = 'calc(80vh - 60px)';
    contentEl.style.padding = '20px';
    // endregion

    // region 创建编辑/只读按钮（与关闭按钮同行）
    this.createEditButton(modalEl);
    // endregion

    // region 渲染 Preact 内容（只渲染一次，不重新创建）
    const contentContainer = contentEl.createDiv();
    this.renderContainers.push(contentContainer);

    const latestItem = getEntityFromPath(this.stateManager.state, this.path) || this.item;

    render(
      <PreviewContent
        item={latestItem}
        view={this.view}
        stateManager={this.stateManager}
        path={this.path}
      />,
      contentContainer
    );
    // endregion
  }

  onClose() {
    const { contentEl } = this;

    // 清理编辑按钮
    if (this.editButtonEl) {
      this.editButtonEl.remove();
      this.editButtonEl = null;
    }

    // 清理全局引用
    delete (window as any).__kanbanPreviewToggle;

    // 清理 Preact 组件
    this.renderContainers.forEach((container) => {
      unmountComponentAtNode(container);
    });
    this.renderContainers = [];
    contentEl.empty();
  }

  // region 编辑按钮 DOM 操作

  /**
   * 在关闭按钮左侧创建编辑/只读切换按钮
   * 按钮紧挨关闭按钮的左侧
   */
  private createEditButton(modalEl: HTMLElement) {
    const closeButton = modalEl.querySelector('.modal-close-button');
    if (!closeButton || !closeButton.parentElement) return;

    const btn = document.createElement('button');
    btn.className = `clickable-icon ${c('preview-edit-button')}`;
    btn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 8px;
      color: var(--text-muted);
      background: transparent;
      border: none;
    `;

    // 点击事件：切换模式，通知 Preact 组件内部切换状态
    btn.addEventListener('click', () => {
      this.isEditMode = !this.isEditMode;
      this.updateEditButton();
      // 调用 Preact 组件暴露的切换方法
      if ((window as any).__kanbanPreviewToggle) {
        (window as any).__kanbanPreviewToggle();
      }
    });

    closeButton.parentElement.insertBefore(btn, closeButton);
    this.editButtonEl = btn;

    this.updateEditButton();
  }

  /**
   * 更新编辑按钮的图标、文字和颜色
   *
   * - 只读模式：眼睛图标 + "只读"，默认颜色
   * - 编辑模式：铅笔图标 + "编辑"，蓝色高亮
   */
  private updateEditButton() {
    const btn = this.editButtonEl;
    if (!btn) return;

    if (this.isEditMode) {
      btn.innerHTML = '';
      btn.style.color = 'var(--interactive-accent)';
      const iconSpan = document.createElement('span');
      iconSpan.style.cssText = 'display: flex; align-items: center;';
      setIcon(iconSpan, 'lucide-pencil');
      btn.appendChild(iconSpan);
      btn.appendChild(document.createTextNode('编辑'));
    } else {
      btn.innerHTML = '';
      btn.style.color = 'var(--text-muted)';
      const iconSpan = document.createElement('span');
      iconSpan.style.cssText = 'display: flex; align-items: center;';
      setIcon(iconSpan, 'lucide-eye');
      btn.appendChild(iconSpan);
      btn.appendChild(document.createTextNode('只读'));
    }
  }

  // endregion
}

// endregion
