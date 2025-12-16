# 功能：日期分隔和去重优化

## 功能概述

优化卡片创建和编辑时的日期时间显示和处理逻辑，提升用户体验，防止误操作日期。

## 更新日期

2024-12-16

## 功能需求

### 1. 编辑时日期与正文区域分离

**问题**：编辑卡片时，日期时间和正文内容在同一个编辑器中，用户容易误操作到日期时间行。

**解决方案**：

- **渲染层面分离**：在编辑模式下，将日期时间独立显示在编辑器上方
- **只读显示**：日期时间区域使用只读的DateAndTime组件显示，带有视觉分隔
- **独立编辑**：正文编辑器只包含正文内容，不包含日期时间行
- **自动合并**：保存时自动将正文和日期时间重新组合

### 2. 复制粘贴时自动去除重复日期

**问题**：复制粘贴卡片内容时，可能会包含多个日期时间标记，导致显示混乱。

**解决方案**：

- 创建卡片时自动检测并删除所有旧的日期时间标记
- 只保留新生成的当前日期时间
- 支持两种日期格式：
  - 普通格式：`@{2024-12-16}`
  - 链接格式：`@[[2024-12-16]]`

## 技术实现

### 修改文件

1. `src/components/Item/ItemForm.tsx` - 日期去重功能
2. `src/components/Item/ItemContent.tsx` - 编辑时分离显示
3. `styles.css` - 视觉样式

### 实现细节

#### 1. 日期清理逻辑（ItemForm.tsx）

```typescript
// 构建用于匹配日期和时间的正则表达式
const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dateContentMatch = shouldLinkDates
  ? '(?:\\[[^\\]]+\\]\\([^\\)]+\\)|\\[\\[[^\\]]+\\]\\])'
  : '{[^}]+}';
const timeContentMatch = '{[^}]+}';

// 匹配整行的日期时间（包括前后可能的空白字符）
const dateTimeLineRegex = new RegExp(
  `^.*?${escapeRegExp(dateTrigger)}${dateContentMatch}(?:\\s+${escapeRegExp(timeTrigger)}${timeContentMatch})?.*?$`,
  'gm'
);

// 删除所有包含日期时间标记的行
trimmedTitle = trimmedTitle.replace(dateTimeLineRegex, '').trim();
```

#### 2. 编辑时分离显示（ItemContent.tsx）

**提取日期时间和正文的辅助函数：**

```typescript
function extractDateTimeAndContent(
  titleRaw: string,
  stateManager: StateManager
): { dateTimeLine: string; contentWithoutDateTime: string } {
  // ... 提取逻辑
  // 返回日期时间行和纯正文内容
}
```

**编辑模式渲染：**

```typescript
if (!isStatic && isEditing(editState)) {
  const { dateTimeLine, contentWithoutDateTime } = extractDateTimeAndContent(
    item.data.titleRaw,
    stateManager
  );

  return (
    <div className={c('item-input-wrapper')}>
      {/* 日期时间独立显示区域 */}
      {dateTimeLine && (
        <div className={c('item-edit-datetime-section')}>
          <DateAndTime ... />
        </div>
      )}
      {/* 只编辑正文，不包含日期时间 */}
      <MarkdownEditor value={contentWithoutDateTime} ... />
    </div>
  );
}
```

#### 3. 视觉样式（styles.css）

```css
.kanban-plugin__item-edit-datetime-section {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--background-modifier-border);
  background-color: var(--background-secondary);
  border-radius: 4px;
  pointer-events: auto;
}
```

## 使用效果

### 创建新卡片

输入标题 "待办事项"，创建后内容为：

```
待办事项
@{2024-12-16} @@{14:30}
```

### 编辑卡片时

**编辑前的内容：**

```
待办事项
这是一些正文
@{2024-12-16} @@{14:30}
```

**进入编辑模式后的显示：**

- **上方区域（只读）**：显示日期时间 `@{2024-12-16} @@{14:30}`，可点击修改
- **下方区域（可编辑）**：
  ```
  待办事项
  这是一些正文
  ```

**编辑体验：**

- 编辑正文时不会触碰到日期时间行
- 日期时间独立显示，带有背景色分隔
- 点击日期时间可以单独修改
- 保存时自动将正文和日期时间合并

### 复制粘贴卡片

从以下内容：

```
待办事项
@{2024-12-15} @@{10:00}
这是一些正文内容
@{2024-12-14} @@{09:00}
```

粘贴后自动清理为：

```
待办事项
这是一些正文内容
@{2024-12-16} @@{14:30}
```

## 兼容性

- 兼容普通日期格式 `@{2024-12-16}`
- 兼容链接日期格式 `@[[2024-12-16]]`
- 兼容带时间和不带时间的格式
- 不影响现有卡片的显示和编辑

## 注意事项

1. **渲染层面分离**：日期和正文的分离是在编辑UI层面实现的，不改变存储格式
2. **自动合并**：退出编辑时会自动将正文和日期时间重新组合
3. **只读日期区域**：编辑模式下的日期时间区域使用DateAndTime组件，支持点击修改
4. **正则表达式**：会匹配整行包含日期时间标记的内容，确保完全删除旧日期
5. **空行处理**：清理后会合并多余的空行（3个或以上的连续空行会被合并为2个）

## 技术亮点

1. **非侵入式**：不改变数据存储格式，只在编辑UI层面优化
2. **用户友好**：视觉上明确分离，防止误操作
3. **保持灵活**：日期时间仍然可以单独点击修改
4. **自动去重**：智能处理复制粘贴场景，自动清理旧日期

## 后续优化建议

1. 可以考虑在设置中添加选项，让用户选择日期显示位置（上方或下方）
2. 可以考虑添加选项，自定义日期区域的背景色和边框样式
3. 考虑添加一个"保留原有日期"的选项，适用于需要保留历史日期记录的场景
4. 可以扩展支持多个日期标记，按时间顺序显示
