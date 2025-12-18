# 日期时间视觉分离功能

## 功能概述

本功能实现了在**预览和编辑模式**下将日期时间与正文内容进行视觉分离：

1. **预览模式** - 日期时间显示在正文上方，使用分隔线分开
2. **编辑模式** - 日期时间显示在独立区域（不可编辑），正文在下方可编辑
3. **预览弹窗** - 与预览模式相同，日期时间和正文用分隔线分开
4. **复制功能** - 复制时仍然不包含日期时间（保持原有功能）

## 实现日期

2024-12-18

## 核心原理

通过 `extractDateTimeAndContent` 函数提取卡片内容：

- **日期时间行**：包含日期时间标记的完整行
- **正文内容**：不含日期时间的纯文本内容

然后在渲染时：

1. 日期时间渲染在上方独立区域
2. 添加视觉分隔线
3. 正文内容渲染在下方

## 修改文件

### 1. `src/components/Item/ItemContent.tsx`

#### 修改 1.1：显示模式重构

**修改内容：**

- 在显示模式中也使用 `extractDateTimeAndContent` 提取内容
- 将日期时间独立显示在上方
- 添加分隔线
- 正文内容只显示不含日期时间的部分

**代码变更：**

```typescript
// 修改前 - 显示完整内容
return (
  <div onClick={onWrapperClick} className={c('item-title')}>
    <MarkdownRenderer
      markdownString={item.data.title}  // 包含日期时间
    />
    {showMetadata && (
      <div className={c('item-metadata')}>
        <DateAndTime ... />  // 日期时间重复显示在下方
      </div>
    )}
  </div>
);

// 修改后 - 分离显示
const { dateTimeLine, contentWithoutDateTime } = extractDateTimeAndContent(
  item.data.titleRaw,
  stateManager
);

// 检查是否有日期或时间
const hasDateTime = !!(item.data.metadata.date || item.data.metadata.time);

return (
  <div onClick={onWrapperClick} className={c('item-title')}>
    {/* 正文内容 */}
    <MarkdownRenderer
      markdownString={contentWithoutDateTime}  // 只显示正文
    />

    {/* 分隔线 */}
    {hasDateTime && <div className={c('item-content-separator')}></div>}

    {/* 日期时间显示区域（在正文下方） */}
    {hasDateTime && (
      <div className={c('item-datetime-display-section')}>
        <DateAndTime ... />
      </div>
    )}

    {/* 其他元数据（不再包含 DateAndTime） */}
    {showMetadata && (
      <div className={c('item-metadata')}>
        <RelativeDate ... />
        <InlineMetadata ... />
        <Tags ... />
      </div>
    )}
  </div>
);
```

**关键改进：**

1. ✅ 日期时间只显示一次（在上方）
2. ✅ 使用分隔线清晰分开
3. ✅ 正文不包含日期时间标记
4. ✅ 保持可点击编辑日期时间的功能

---

### 2. `src/components/Item/PreviewModal.tsx`

#### 修改 2.1：添加 DateAndTime 导入

**代码变更：**

```typescript
import { DateAndTime } from './DateAndTime';
```

#### 修改 2.2：预览窗口分离显示

**修改内容：**

- 提取日期时间和正文
- 渲染日期时间组件
- 添加分隔线
- 渲染正文内容

**代码变更：**

```typescript
// 提取日期时间和正文内容
const { dateTimeLine, contentWithoutDateTime } = extractDateTimeAndContent(
  this.item.data.titleRaw || this.item.data.title,
  this.stateManager
);

// 如果有日期时间，显示日期时间区域
if (dateTimeLine) {
  const dateTimeSection = itemContent.createDiv();
  dateTimeSection.className = c('preview-datetime-section');

  // 渲染日期时间组件
  render(
    <DateAndTime
      item={this.item}
      stateManager={this.stateManager}
      filePath={this.view.file.path}
      getDateColor={(date) => null}
    />,
    dateTimeContainer
  );

  // 添加分隔线
  const separator = itemContent.createDiv();
  separator.className = c('preview-content-separator');
  separator.style.height = '1px';
  separator.style.background = 'var(--background-modifier-border)';
  separator.style.margin = '12px 0';
}

// 渲染正文内容
render(
  <MarkdownRenderer
    markdownString={contentWithoutDateTime}
  />,
  renderContainer
);
```

---

### 3. `src/styles.less`

#### 添加新样式类

**代码变更：**

```less
// 日期时间显示区域（显示模式下）
.kanban-plugin__item-datetime-display-section {
  padding: 4px 0;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

// 内容分隔线（分隔日期时间和正文）
.kanban-plugin__item-content-separator {
  height: 1px;
  background: var(--background-modifier-border);
  margin: 8px 0;
  opacity: 0.6;
}

// 编辑模式下的日期时间区域（增强样式）
.kanban-plugin__item-edit-datetime-section {
  padding: 6px 0;
  margin-bottom: 8px;
  background: var(--background-secondary);
  border-radius: 4px;
  padding: 8px;
  display: flex;
  align-items: center;
}
```

**样式说明：**

- `item-datetime-display-section`：预览模式的日期时间区域
- `item-content-separator`：分隔线，透明度 0.6
- `item-edit-datetime-section`：编辑模式的日期时间区域（带背景色）

---

## 功能效果

### 1. 预览模式（显示状态）

**显示效果：**

```
┌─────────────────────────────────┐
│ 📅 2024-12-18 ⏰ 14:30         │  ← 日期时间区域
├─────────────────────────────────┤  ← 分隔线
│ 待办事项标题                     │
│ 这是一些正文内容                 │  ← 正文内容
│ - 列表项1                        │
│ - 列表项2                        │
└─────────────────────────────────┘
```

**特点：**

- ✅ 日期时间在上方独立显示
- ✅ 分隔线清晰分开两部分
- ✅ 正文内容干净整洁
- ✅ 可以点击日期时间进入编辑

### 2. 编辑模式

**显示效果：**

```
┌─────────────────────────────────┐
│ 📅 2024-12-18 ⏰ 14:30         │  ← 日期时间区域（带背景色，不可编辑）
├─────────────────────────────────┤  ← 分隔线
│ 待办事项标题                     │
│ 这是一些正文内容                 │  ← 可编辑区域
│ - 列表项1                        │
│ - 列表项2                        │
│ [光标在这里]                     │
└─────────────────────────────────┘
```

**特点：**

- ✅ 日期时间区域带背景色（视觉区分）
- ✅ 日期时间不可在编辑器中修改（防止误操作）
- ✅ 可以点击日期时间组件单独修改
- ✅ 正文可以自由编辑
- ✅ 编辑时光标不会进入日期时间区域

### 3. 预览弹窗

**显示效果：**
与预览模式相同，正文在上方，分隔线分开，日期时间在下方。

### 4. 复制功能

**行为：**

- 复制卡片内容时，只复制正文部分
- 不包含日期时间标记

**示例：**

```
原卡片内容：
待办事项标题
这是一些正文内容
@{2024-12-18} @@{14:30}

复制后：
待办事项标题
这是一些正文内容
```

---

## 技术实现要点

### 1. 内容提取算法

使用 `extractDateTimeAndContent` 函数：

```typescript
const { dateTimeLine, contentWithoutDateTime } = extractDateTimeAndContent(
  item.data.titleRaw,
  stateManager
);
```

**返回值：**

- `dateTimeLine`：日期时间行（如：`@{2024-12-18} @@{14:30}`）
- `contentWithoutDateTime`：不含日期时间的正文

### 2. 分离渲染策略

**显示模式：**

1. 提取内容
2. 渲染日期时间组件（可点击）
3. 渲染分隔线
4. 渲染正文 Markdown

**编辑模式：**

1. 提取内容
2. 渲染日期时间组件（带背景色）
3. 渲染分隔线（隐式，通过样式实现）
4. 渲染可编辑 Markdown 编辑器

### 3. 样式设计

**分隔线特点：**

- 高度 1px
- 颜色：主题边框色
- 透明度：0.6（柔和效果）
- 上下边距：8px

**日期时间区域：**

- 编辑模式：带背景色，增强视觉区分
- 显示模式：无背景，保持简洁

---

## 用户体验改进

### 改进前的问题

1. **预览模式**：日期时间混在正文中，不够清晰
2. **编辑模式**：容易误操作日期时间
3. **视觉混乱**：元数据和正文边界不清

### 改进后的优势

1. ✅ **视觉清晰**：日期时间和正文明确分开
2. ✅ **防止误操作**：编辑时不会碰到日期时间
3. ✅ **一致性**：预览和编辑的布局保持一致
4. ✅ **可访问性**：日期时间仍可点击修改
5. ✅ **美观性**：分隔线提供清晰的视觉引导

---

## 兼容性

- ✅ 不改变数据存储格式
- ✅ 向后兼容旧版卡片
- ✅ 支持所有日期时间格式
- ✅ 支持链接格式日期
- ✅ 不影响其他功能（标签、元数据等）

---

## 测试场景

### 场景 1：带日期时间的卡片

**测试步骤：**

1. 创建包含日期时间的卡片
2. 查看预览模式
3. 验证日期时间在上方，有分隔线
4. 进入编辑模式
5. 验证日期时间区域有背景色，不可编辑
6. 验证光标只在正文区域

### 场景 2：不带日期时间的卡片

**测试步骤：**

1. 创建不含日期时间的卡片
2. 查看预览和编辑模式
3. 验证没有日期时间区域
4. 验证没有分隔线
5. 验证正常显示和编辑

### 场景 3：预览弹窗

**测试步骤：**

1. 右键卡片选择"预览"
2. 验证日期时间在上方
3. 验证有分隔线
4. 验证正文在下方

### 场景 4：复制功能

**测试步骤：**

1. 右键卡片选择"复制内容"
2. 粘贴到其他地方
3. 验证不包含日期时间

### 场景 5：编辑日期时间

**测试步骤：**

1. 在预览模式点击日期
2. 验证弹出日期选择器
3. 修改日期
4. 验证更新成功
5. 重复测试编辑模式

---

## 已知限制

1. **静态渲染**：拖拽预览时使用静态渲染，可能不显示分离效果
2. **主题兼容性**：分隔线颜色依赖主题变量
3. **自定义样式**：用户自定义 CSS 可能影响分隔线显示

---

## 后续优化建议

1. **可配置性**：

   - 添加设置选项，控制是否显示分隔线
   - 允许自定义分隔线样式
   - 允许选择日期时间位置（上方/下方）

2. **视觉增强**：

   - 分隔线可以有更多样式选项（实线/虚线/点线）
   - 日期时间区域可以有图标装饰
   - 支持折叠日期时间区域

3. **交互改进**：
   - 悬停在日期时间区域时显示提示
   - 快捷键快速编辑日期时间
   - 拖拽调整日期时间区域大小

---

## 相关文件

- `src/components/Item/ItemContent.tsx` - 核心显示和编辑逻辑
- `src/components/Item/PreviewModal.tsx` - 预览弹窗逻辑
- `src/styles.less` - 样式定义
- `src/components/Item/DateAndTime.tsx` - 日期时间组件
- `src/helpers/boardModifiers.ts` - 复制功能逻辑

---

## 版本信息

- **实现版本**：v2.0.51+
- **实现日期**：2024-12-18
- **开发者**：Obsidian Kanban Plugin Team

---

## 总结

此功能通过视觉分离的方式，解决了卡片中日期时间和正文混杂的问题：

1. **预览模式**：清晰展示，日期时间和正文用分隔线分开
2. **编辑模式**：防止误操作，日期时间独立显示且不可在编辑器中修改
3. **一致性**：各种模式下保持统一的视觉体验
4. **灵活性**：仍然可以通过点击单独编辑日期时间

这大大提升了用户在使用 Kanban 卡片时的体验！
