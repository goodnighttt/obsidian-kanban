/**
 * ItemContent.tsx
 *
 * 卡片内容组件 - 负责渲染和编辑 Kanban 卡片的内容
 *
 * 主要功能：
 * 1. 显示卡片标题和正文内容（Markdown 渲染）
 * 2. 提供卡片编辑功能（Markdown 编辑器）
 * 3. 显示卡片元数据（日期、时间、标签、内联元数据等）
 * 4. 处理日期时间编辑（点击日期/时间弹出选择器）
 * 5. 处理复选框点击（任务列表项）
 * 6. 编辑时将日期时间与正文分离显示，防止误操作
 *
 * @author Obsidian Kanban Plugin
 * @date 2024-12-16
 */
// CodeMirror 编辑器相关
import { EditorView } from '@codemirror/view';
// Preact 相关
import { memo } from 'preact/compat';
import {
  Dispatch,
  StateUpdater,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'preact/hooks';
// 状态管理和路径
import { StateManager } from 'src/StateManager';
import { useNestedEntityPath } from 'src/dnd/components/Droppable';
import { Path } from 'src/dnd/types';
// 任务相关工具函数
import { getTaskStatusDone, toggleTaskString } from 'src/parsers/helpers/inlineMetadata';

// Markdown 编辑器组件
import { MarkdownEditor, allowNewLine } from '../Editor/MarkdownEditor';
// Markdown 渲染器组件
import {
  MarkdownClonedPreviewRenderer,
  MarkdownRenderer,
} from '../MarkdownRenderer/MarkdownRenderer';
// 上下文（Kanban 状态和搜索状态）
import { KanbanContext, SearchContext } from '../context';
// 工具函数（CSS 类名生成、颜色获取等）
import { c, useGetDateColorFn, useGetTagColorFn } from '../helpers';
// 类型定义
import { EditState, EditingState, Item, isEditing } from '../types';
// 日期时间相关组件
import { DateAndTime, RelativeDate } from './DateAndTime';
// 内联元数据组件
import { InlineMetadata } from './InlineMetadata';
// 日期时间选择器相关工具函数
import {
  constructDatePicker,
  constructMenuDatePickerOnChange,
  constructMenuTimePickerOnChange,
  constructTimePicker,
} from './helpers';

/**
 * useDatePickers Hook
 *
 * 提供日期和时间编辑器的回调函数
 *
 * @param item - 当前卡片项
 * @param explicitPath - 可选的显式路径（如果不提供则使用嵌套路径）
 * @returns 返回包含 onEditDate 和 onEditTime 回调函数的对象
 *
 * 功能说明：
 * - onEditDate: 点击日期时触发，弹出日期选择器
 * - onEditTime: 点击时间时触发，弹出时间选择器
 * - 使用 useMemo 优化性能，只在依赖项变化时重新创建回调函数
 */
export function useDatePickers(item: Item, explicitPath?: Path) {
  // 从上下文获取状态管理器和看板修改器
  const { stateManager, boardModifiers } = useContext(KanbanContext);
  // 获取卡片路径（优先使用显式路径，否则使用嵌套路径）
  const path = explicitPath || useNestedEntityPath();

  // 使用 useMemo 缓存回调函数，避免不必要的重新创建
  return useMemo(() => {
    /**
     * 编辑日期的回调函数
     * 当用户点击日期时，在鼠标位置弹出日期选择器
     *
     * @param e - 鼠标事件对象
     */
    const onEditDate = (e: MouseEvent) => {
      constructDatePicker(
        e.view, // 窗口对象
        stateManager, // 状态管理器
        { x: e.clientX, y: e.clientY }, // 鼠标位置坐标
        constructMenuDatePickerOnChange({
          stateManager,
          boardModifiers,
          item,
          hasDate: true, // 标记卡片已有日期
          path,
        }),
        item.data.metadata.date?.toDate() // 当前日期值（如果有）
      );
    };

    /**
     * 编辑时间的回调函数
     * 当用户点击时间时，在鼠标位置弹出时间选择器
     *
     * @param e - 鼠标事件对象
     */
    const onEditTime = (e: MouseEvent) => {
      constructTimePicker(
        e.view, // Preact 使用真实事件，所以这是安全的
        stateManager, // 状态管理器
        { x: e.clientX, y: e.clientY }, // 鼠标位置坐标
        constructMenuTimePickerOnChange({
          stateManager,
          boardModifiers,
          item,
          hasTime: true, // 标记卡片已有时间
          path,
        }),
        item.data.metadata.time // 当前时间值（如果有）
      );
    };

    return {
      onEditDate,
      onEditTime,
    };
  }, [boardModifiers, path, item, stateManager]); // 依赖项：当这些值变化时重新创建回调
}

/**
 * ItemContentProps 接口
 *
 * ItemContent 组件的属性类型定义
 */
export interface ItemContentProps {
  /** 卡片项数据 */
  item: Item;
  /** 设置编辑状态的函数 */
  setEditState: Dispatch<StateUpdater<EditState>>;
  /** 搜索查询字符串（用于高亮匹配内容） */
  searchQuery?: string;
  /** 是否显示元数据（日期、标签等），默认为 true */
  showMetadata?: boolean;
  /** 当前编辑状态 */
  editState: EditState;
  /** 是否为静态模式（不响应交互） */
  isStatic: boolean;
}

/**
 * checkCheckbox 函数
 *
 * 处理任务列表复选框的点击事件，切换复选框状态
 *
 * @param stateManager - 状态管理器（用于获取任务插件设置）
 * @param title - 卡片标题内容（可能包含多行任务列表）
 * @param checkboxIndex - 要切换的复选框索引（从 0 开始）
 * @returns 更新后的标题内容
 *
 * 功能说明：
 * 1. 解析标题内容，按行分割
 * 2. 查找所有任务列表项（格式：- [ ] 或 - [x]）
 * 3. 找到指定索引的复选框并切换其状态
 * 4. 如果启用了 Tasks 插件，优先使用插件的切换逻辑
 * 5. 否则手动切换复选框状态（空格 ↔ 完成标记）
 *
 * 正则表达式说明：
 * /^(\s*>)*(\s*[-+*]\s+?\[)([^\]])(\]\s+)/
 * - (\s*>)*: 可选的引用标记（>）
 * - (\s*[-+*]\s+?\[): 列表标记（-、+、*）和左方括号
 * - ([^\]]): 复选框状态（空格或 x）
 * - (\]\s+): 右方括号和后续空格
 */
function checkCheckbox(stateManager: StateManager, title: string, checkboxIndex: number) {
  let count = 0; // 当前找到的复选框计数

  // 按行分割标题内容（支持 Windows 和 Unix 换行符）
  const lines = title.split(/\n\r?/g);
  const results: string[] = []; // 存储处理后的行

  lines.forEach((line) => {
    // 如果已经处理完目标复选框，直接添加剩余行
    if (count > checkboxIndex) {
      results.push(line);
      return;
    }

    // 匹配任务列表项格式：- [ ] 或 - [x] 等
    const match = line.match(/^(\s*>)*(\s*[-+*]\s+?\[)([^\]])(\]\s+)/);

    if (match) {
      // 如果当前行是目标复选框
      if (count === checkboxIndex) {
        // 优先使用 Tasks 插件的切换逻辑（如果可用）
        const updates = toggleTaskString(line, stateManager.file);
        if (updates) {
          // Tasks 插件处理成功，使用返回的结果
          results.push(updates);
        } else {
          // Tasks 插件不可用，手动切换复选框状态
          // 如果当前是未选中（空格），则切换为完成状态；否则切换为未选中
          const check = match[3] === ' ' ? getTaskStatusDone() : ' ';
          const m1 = match[1] ?? ''; // 引用标记
          const m2 = match[2] ?? ''; // 列表标记和左方括号
          const m4 = match[4] ?? ''; // 右方括号和空格
          // 重新组合行：保留原有格式，只替换复选框状态
          results.push(m1 + m2 + check + m4 + line.slice(match[0].length));
        }
      } else {
        // 不是目标复选框，保持原样
        results.push(line);
      }
      count++; // 增加复选框计数
      return;
    }

    // 不是任务列表项，保持原样
    results.push(line);
  });

  // 将处理后的行重新组合为字符串
  return results.join('\n');
}

/**
 * Tags 组件
 *
 * 渲染卡片的标签列表
 *
 * @param tags - 标签数组（例如：['#tag1', '#tag2']）
 * @param searchQuery - 搜索查询字符串（用于高亮匹配的标签）
 * @param alwaysShow - 是否总是显示标签（忽略设置中的 move-tags 选项）
 *
 * 功能说明：
 * 1. 根据设置决定是否显示标签
 * 2. 为每个标签应用自定义颜色（如果配置了）
 * 3. 点击标签时执行搜索操作（根据 tag-action 设置）
 * 4. 高亮匹配搜索查询的标签
 */
export function Tags({
  tags,
  searchQuery,
  alwaysShow,
}: {
  tags?: string[];
  searchQuery?: string;
  alwaysShow?: boolean;
}) {
  // 从上下文获取状态管理器
  const { stateManager } = useContext(KanbanContext);
  // 获取标签颜色函数（根据配置返回标签的颜色）
  const getTagColor = useGetTagColorFn(stateManager);
  // 从上下文获取搜索功能
  const search = useContext(SearchContext);
  // 判断是否应该显示标签（根据设置或 alwaysShow 参数）
  const shouldShow = stateManager.useSetting('move-tags') || alwaysShow;

  // 如果没有标签或不应该显示，返回 null
  if (!tags.length || !shouldShow) return null;

  return (
    <div className={c('item-tags')}>
      {tags.map((tag, i) => {
        // 获取标签的颜色配置
        const tagColor = getTagColor(tag);

        return (
          <a
            href={tag}
            onClick={(e) => {
              e.preventDefault(); // 阻止默认链接行为

              // 获取标签点击行为设置
              const tagAction = stateManager.getSetting('tag-action');
              // 如果设置为 'kanban' 且有搜索功能，使用看板搜索
              if (search && tagAction === 'kanban') {
                search.search(tag, true);
                return;
              }

              // 否则使用 Obsidian 全局搜索
              (stateManager.app as any).internalPlugins
                .getPluginById('global-search')
                .instance.openGlobalSearch(`tag:${tag}`);
            }}
            key={i}
            className={`tag ${c('item-tag')} ${
              // 如果标签匹配搜索查询，添加高亮样式
              searchQuery && tag.toLocaleLowerCase().contains(searchQuery) ? 'is-search-match' : ''
            }`}
            style={
              // 应用自定义颜色（如果配置了）
              tagColor && {
                '--tag-color': tagColor.color, // 文字颜色
                '--tag-background': tagColor.backgroundColor, // 背景颜色
              }
            }
          >
            {/* 标签首字符（通常是 #） */}
            <span>{tag[0]}</span>
            {/* 标签剩余部分 */}
            {tag.slice(1)}
          </a>
        );
      })}
    </div>
  );
}

/**
 * extractDateTimeAndContent 函数
 *
 * 从卡片标题中提取日期时间行和正文内容
 *
 * 用途：在编辑模式下，将日期时间与正文分离显示，防止用户误操作日期
 *
 * @param titleRaw - 卡片的原始标题内容（可能包含日期时间标记）
 * @param stateManager - 状态管理器（用于获取日期时间触发器和设置）
 * @returns 返回包含 dateTimeLine（日期时间行）和 contentWithoutDateTime（不含日期时间的正文）的对象
 *
 * 功能说明：
 * 1. 获取日期和时间触发器（默认：@ 和 @@）
 * 2. 构建正则表达式匹配日期时间行
 * 3. 提取最后一个匹配的日期时间行（如果有多个，只保留最新的）
 * 4. 从标题中删除所有日期时间行，得到纯正文内容
 *
 * 日期时间格式示例：
 * - 普通格式：@{2024-12-16} @@{14:30}
 * - 链接格式：@[[2024-12-16]] @@{14:30}
 */
export function extractDateTimeAndContent(
  titleRaw: string,
  stateManager: StateManager
): { dateTimeLine: string; contentWithoutDateTime: string } {
  // 获取日期和时间触发器（用户可配置，默认为 @ 和 @@）
  const dateTrigger = stateManager.getSetting('date-trigger') || '@';
  const timeTrigger = stateManager.getSetting('time-trigger') || '@@';
  // 是否将日期链接到日记笔记
  const shouldLinkDates = stateManager.getSetting('link-date-to-daily-note');

  /**
   * 转义正则表达式特殊字符
   * 确保触发器中的特殊字符（如 @）在正则表达式中被正确转义
   */
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /**
   * 日期内容匹配模式
   * - 如果启用链接：匹配 [[日期]] 或 [日期](链接) 格式
   * - 否则：匹配 {日期} 格式
   */
  const dateContentMatch = shouldLinkDates
    ? '(?:\\[[^\\]]+\\]\\([^\\)]+\\)|\\[\\[[^\\]]+\\]\\])'
    : '{[^}]+}';
  /**
   * 时间内容匹配模式
   * 时间格式固定为 {时间}，例如：{14:30}
   */
  const timeContentMatch = '{[^}]+}';

  /**
   * 构建日期时间行匹配正则表达式
   *
   * 模式说明：
   * - ^.*?: 行首任意字符（非贪婪匹配）
   * - ${escapeRegExp(dateTrigger)}${dateContentMatch}: 日期触发器 + 日期内容
   * - (?:\\s+${escapeRegExp(timeTrigger)}${timeContentMatch})?: 可选的时间部分（空格 + 时间触发器 + 时间内容）
   * - .*?$: 行尾任意字符（非贪婪匹配）
   * - gm: 全局匹配 + 多行模式
   */
  const dateTimeLineRegex = new RegExp(
    `^.*?${escapeRegExp(dateTrigger)}${dateContentMatch}(?:\\s+${escapeRegExp(timeTrigger)}${timeContentMatch})?.*?$`,
    'gm'
  );

  let dateTimeLine = '';
  // 匹配所有日期时间行
  const match = titleRaw.match(dateTimeLineRegex);
  if (match && match.length > 0) {
    // 如果有多个日期时间行，只保留最后一个（最新的）
    // 这样可以处理复制粘贴时可能出现的多个日期的情况
    dateTimeLine = match[match.length - 1].trim();
  }

  /**
   * 删除所有日期时间行，保留正文内容
   * 使用 replace 删除所有匹配的行，然后去除首尾空白
   */
  const contentWithoutDateTime = titleRaw.replace(dateTimeLineRegex, '').trim();

  return { dateTimeLine, contentWithoutDateTime };
}

/**
 * ItemContent 组件
 *
 * 卡片内容的主要组件，负责渲染和编辑卡片
 *
 * 功能特性：
 * 1. 显示模式：渲染 Markdown 内容，显示元数据（日期、标签等）
 * 2. 编辑模式：提供 Markdown 编辑器，支持编辑正文
 * 3. 日期时间分离：编辑时将日期时间独立显示，防止误操作
 * 4. 交互处理：处理日期/时间点击、复选框点击等交互
 *
 * 使用 memo 优化性能，只在 props 变化时重新渲染
 */
export const ItemContent = memo(function ItemContent({
  item,
  editState,
  setEditState,
  searchQuery,
  showMetadata = true,
  isStatic,
}: ItemContentProps) {
  // 从上下文获取状态管理器、文件路径和看板修改器
  const { stateManager, filePath, boardModifiers } = useContext(KanbanContext);
  // 获取日期颜色函数（根据日期规则返回颜色配置）
  const getDateColor = useGetDateColorFn(stateManager);

  /**
   * 使用 useRef 存储编辑过程中的临时数据
   * - titleRef: 存储编辑后的正文内容（不包含日期时间）
   * - dateTimeLineRef: 存储日期时间行（编辑过程中保持不变）
   */
  const titleRef = useRef<string | null>(null);
  const dateTimeLineRef = useRef<string>('');

  /**
   * useEffect: 处理编辑状态变化
   *
   * 当编辑完成或取消时：
   * 1. 编辑完成（EditingState.complete）：
   *    - 将正文和日期时间重新组合
   *    - 更新卡片内容
   *    - 清空临时引用
   * 2. 编辑取消（EditingState.cancel）：
   *    - 直接清空临时引用，不保存更改
   */
  useEffect(() => {
    if (editState === EditingState.complete) {
      // 编辑完成，保存更改
      if (titleRef.current !== null) {
        // 重新组合正文和日期时间
        // 格式：正文内容\n日期时间行
        const finalContent = dateTimeLineRef.current
          ? `${titleRef.current}\n${dateTimeLineRef.current}`.trim()
          : titleRef.current;
        // 更新卡片内容
        boardModifiers.updateItem(path, stateManager.updateItemContent(item, finalContent));
      }
      // 清空临时引用
      titleRef.current = null;
      dateTimeLineRef.current = '';
    } else if (editState === EditingState.cancel) {
      // 编辑取消，不保存更改，直接清空临时引用
      titleRef.current = null;
      dateTimeLineRef.current = '';
    }
  }, [editState, stateManager, item]);

  // 获取卡片路径（用于更新操作）
  const path = useNestedEntityPath();
  // 获取日期和时间编辑器的回调函数
  const { onEditDate, onEditTime } = useDatePickers(item);
  const onEnter = useCallback(
    (cm: EditorView, mod: boolean, shift: boolean) => {
      if (!allowNewLine(stateManager, mod, shift)) {
        setEditState(EditingState.complete);
        return true;
      }
    },
    [stateManager]
  );

  const onWrapperClick = useCallback(
    (e: MouseEvent) => {
      if (e.targetNode.instanceOf(HTMLElement)) {
        if (e.targetNode.hasClass(c('item-metadata-date'))) {
          onEditDate(e);
        } else if (e.targetNode.hasClass(c('item-metadata-time'))) {
          onEditTime(e);
        }
      }
    },
    [onEditDate, onEditTime]
  );

  const onSubmit = useCallback(() => setEditState(EditingState.complete), []);

  const onEscape = useCallback(() => {
    setEditState(EditingState.cancel);
    return true;
  }, [item]);

  const onCheckboxContainerClick = useCallback(
    (e: PointerEvent) => {
      const target = e.target as HTMLElement;

      if (target.hasClass('task-list-item-checkbox')) {
        if (target.dataset.src) {
          return;
        }

        const checkboxIndex = parseInt(target.dataset.checkboxIndex, 10);
        const checked = checkCheckbox(stateManager, item.data.titleRaw, checkboxIndex);
        const updated = stateManager.updateItemContent(item, checked);

        boardModifiers.updateItem(path, updated);
      }
    },
    [path, boardModifiers, stateManager, item]
  );

  /**
   * 编辑模式渲染
   *
   * 当卡片处于编辑状态时，显示编辑界面
   * 关键特性：将日期时间与正文分离显示，防止误操作
   */
  if (!isStatic && isEditing(editState)) {
    // 提取日期时间行和正文内容
    // 这样可以将日期时间独立显示，正文单独编辑
    const { dateTimeLine, contentWithoutDateTime } = extractDateTimeAndContent(
      item.data.titleRaw,
      stateManager
    );
    // 保存日期时间行到 ref，供保存时使用
    dateTimeLineRef.current = dateTimeLine;

    // 检查是否有日期或时间
    const hasDateTime = !!(item.data.metadata.date || item.data.metadata.time);

    return (
      <div className={c('item-input-wrapper')}>
        {/* 
          正文编辑区域 - 只编辑正文，不包含日期时间
          
          功能说明：
          - 使用 MarkdownEditor 组件提供编辑功能
          - value 只包含正文内容（不包含日期时间行）
          - 编辑时不会误操作到日期时间
          - onChange 时保存正文内容到 titleRef
          - 保存时会自动与日期时间重新组合
        */}
        <MarkdownEditor
          editState={editState}
          className={c('item-input')}
          onEnter={onEnter}
          onEscape={onEscape}
          onSubmit={onSubmit}
          value={contentWithoutDateTime}
          onChange={(update) => {
            // 当文档内容发生变化时，保存到 titleRef
            if (update.docChanged) {
              titleRef.current = update.state.doc.toString().trim();
            }
          }}
        />

        {/* 
          日期时间显示区域 - 独立显示在正文下方，视觉上分离
          
          功能说明：
          - 只在存在日期时间时显示
          - 使用 SimpleDateTimeDisplay 组件渲染（不受 move-dates 设置影响）
          - 带有独立的样式类，提供视觉分隔
          - 支持点击修改日期/时间
          - 编辑正文时不会触碰到这个区域
        */}
        {hasDateTime && <div className={c('item-content-separator')}></div>}
        {hasDateTime && (
          <div className={c('item-edit-datetime-section')}>
            <DateAndTime
              item={item}
              stateManager={stateManager}
              filePath={filePath}
              getDateColor={getDateColor}
              onEditDate={onEditDate}
              onEditTime={onEditTime}
            />
          </div>
        )}
      </div>
    );
  }

  /**
   * 显示模式渲染
   *
   * 当卡片不在编辑状态时，显示卡片内容
   * 将日期时间与正文内容分离显示
   */

  // 提取日期时间行和正文内容
  const { dateTimeLine, contentWithoutDateTime } = extractDateTimeAndContent(
    item.data.titleRaw,
    stateManager
  );

  // 检查是否有日期或时间
  const hasDateTime = !!(item.data.metadata.date || item.data.metadata.time);

  return (
    <div onClick={onWrapperClick} className={c('item-title')}>
      {/* 
        正文内容区域
        根据 isStatic 标志选择不同的渲染器
        - isStatic: 使用克隆的预览渲染器（用于拖拽预览等场景）
        - 否则: 使用普通渲染器（正常显示）
        
        两个渲染器都支持：
        - Markdown 渲染
        - 搜索高亮
        - 复选框点击处理
      */}
      {isStatic ? (
        <MarkdownClonedPreviewRenderer
          entityId={item.id}
          className={c('item-markdown')}
          markdownString={contentWithoutDateTime || item.data.title}
          searchQuery={searchQuery}
          onPointerUp={onCheckboxContainerClick}
        />
      ) : (
        <MarkdownRenderer
          entityId={item.id}
          className={c('item-markdown')}
          markdownString={contentWithoutDateTime || item.data.title}
          searchQuery={searchQuery}
          onPointerUp={onCheckboxContainerClick}
        />
      )}

      {/* 分隔线（仅在有日期时间时显示） */}
      {hasDateTime && <div className={c('item-content-separator')}></div>}

      {/* 
        日期时间显示区域（如果存在）
        显示在正文下方，与正文用分隔线分开
      */}
      {hasDateTime && (
        <div className={c('item-datetime-display-section')}>
          <DateAndTime
            item={item}
            stateManager={stateManager}
            filePath={filePath}
            getDateColor={getDateColor}
            onEditDate={onEditDate}
            onEditTime={onEditTime}
          />
        </div>
      )}

      {/* 
        元数据区域
        显示卡片的其他元数据信息（如果 showMetadata 为 true）
        
        包含：
        1. RelativeDate: 相对日期显示（如"今天"、"明天"）
        2. InlineMetadata: 内联元数据（自定义字段）
        3. Tags: 标签列表（可点击搜索）
        
        注意：DateAndTime 已经在下方独立显示，这里不再重复显示
      */}
      {showMetadata && (
        <div className={c('item-metadata')}>
          {/* 相对日期显示（如"今天"、"2天后"） */}
          <RelativeDate item={item} stateManager={stateManager} />
          {/* 内联元数据显示 */}
          <InlineMetadata item={item} stateManager={stateManager} />
          {/* 标签列表 */}
          <Tags tags={item.data.metadata.tags} searchQuery={searchQuery} />
        </div>
      )}
    </div>
  );
});
