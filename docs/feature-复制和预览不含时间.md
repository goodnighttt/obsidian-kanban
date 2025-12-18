# 复制和预览卡片不含时间功能

## 功能概述

本功能实现了在两个场景下隐藏卡片的日期时间标记：

1. **复制卡片内容** - 复制时不包含日期时间标记
2. **预览卡片** - 预览模态窗口中不显示日期时间

**注意：** 分享图片功能保持原样，会显示日期时间。

## 实现日期

2024-12-18

## 修改文件

### 1. `src/components/Item/ItemContent.tsx`

**修改内容：**
- 将 `extractDateTimeAndContent` 函数从私有函数改为导出函数
- 允许其他模块使用该函数提取不含日期时间的内容

**代码变更：**
```typescript
// 修改前
function extractDateTimeAndContent(...)

// 修改后
export function extractDateTimeAndContent(...)
```

**功能说明：**
`extractDateTimeAndContent` 函数可以：
- 提取日期时间行（格式如：`@{2024-12-16} @@{14:30}`）
- 返回不含日期时间的纯正文内容
- 支持普通格式和链接格式的日期

---

### 2. `src/helpers/boardModifiers.ts`

#### 修改 2.1：导入依赖

**修改内容：**
- 导入 `extractDateTimeAndContent` 函数

**代码变更：**
```typescript
import { extractDateTimeAndContent } from '../components/Item/ItemContent';
```

#### 修改 2.2：复制卡片内容功能

**修改内容：**
- 使用 `extractDateTimeAndContent` 提取不含日期时间的内容
- 复制到剪贴板时只包含正文内容

**代码变更：**
```typescript
// 修改前
copyItemContent: (path: Path) => {
  const boardData = stateManager.state;
  const item = getEntityFromPath(boardData, path);
  navigator.clipboard.writeText(item.data.titleRaw);
},

// 修改后
copyItemContent: (path: Path) => {
  const boardData = stateManager.state;
  const item = getEntityFromPath(boardData, path);
  // 使用 extractDateTimeAndContent 提取不含日期时间的内容
  const { contentWithoutDateTime } = extractDateTimeAndContent(
    item.data.titleRaw,
    stateManager
  );
  navigator.clipboard.writeText(contentWithoutDateTime);
},
```

---

### 3. `src/components/Item/PreviewModal.tsx`

#### 修改 3.1：导入依赖

**修改内容：**
- 导入 `extractDateTimeAndContent` 函数

**代码变更：**
```typescript
import { extractDateTimeAndContent } from './ItemContent';
```

#### 修改 3.2：预览渲染

**修改内容：**
- 在渲染 MarkdownRenderer 前提取不含日期时间的内容
- 预览窗口中只显示纯正文内容

**代码变更：**
```typescript
// 修改前
render(
  <KanbanContext.Provider value={{...}}>
    <MarkdownRenderer
      entityId={undefined}
      className={c('preview-markdown')}
      markdownString={this.item.data.titleRaw || this.item.data.title}
    />
  </KanbanContext.Provider>,
  renderContainer
);

// 修改后
// 提取不含日期时间的内容进行预览
const { contentWithoutDateTime } = extractDateTimeAndContent(
  this.item.data.titleRaw || this.item.data.title,
  this.stateManager
);

render(
  <KanbanContext.Provider value={{...}}>
    <MarkdownRenderer
      entityId={undefined}
      className={c('preview-markdown')}
      markdownString={contentWithoutDateTime}
    />
  </KanbanContext.Provider>,
  renderContainer
);
```

---

## 功能使用

### 1. 复制卡片内容

**操作步骤：**
1. 右键点击卡片
2. 选择"复制卡片内容"（Copy card content）
3. 粘贴到任意位置

**效果：**
- 原卡片内容：
  ```
  待办事项标题
  这是一些正文内容
  @{2024-12-18} @@{14:30}
  ```

- 复制后的内容：
  ```
  待办事项标题
  这是一些正文内容
  ```

### 2. 预览卡片

**操作步骤：**
1. 右键点击卡片
2. 选择"预览卡片"（Preview card）
3. 在弹出的预览窗口中查看内容

**效果：**
- 预览窗口中只显示卡片的正文内容
- 不显示日期时间标记
- 保持 Markdown 渲染效果

### 3. 分享图片（保持原样）

**操作步骤：**
1. 右键点击卡片
2. 选择"分享为图片"（Share as image）
3. 等待图片生成

**效果：**
- 生成的图片中**包含**日期时间元素（保持原有行为）
- 保持卡片的完整样式和内容

---

## 技术实现要点

### 日期时间提取算法

使用正则表达式匹配日期时间行：
- 支持普通格式：`@{2024-12-16}`
- 支持链接格式：`@[[2024-12-16]]`
- 支持时间：`@@{14:30}`
- 匹配整行并删除

### 错误处理

所有修改都包含错误处理：
- 复制功能：如果提取失败，返回空内容
- 预览功能：如果提取失败，使用原始内容

---

## 兼容性

- ✅ 兼容现有的日期时间功能
- ✅ 不影响卡片的正常编辑和显示
- ✅ 不改变数据存储格式
- ✅ 支持所有日期格式配置
- ✅ 分享图片功能保持原有行为

---

## 注意事项

1. **数据不丢失**：只在显示和复制时隐藏时间，原始数据保持不变
2. **编辑不受影响**：编辑卡片时仍然可以看到和修改日期时间
3. **设置仍生效**：用户的日期时间格式设置仍然有效
4. **可逆操作**：不是永久删除，只是在特定场景下不显示
5. **图片保持完整**：分享图片功能会显示完整的卡片内容，包括日期时间

---

## 测试建议

### 测试场景 1：复制功能
1. 创建包含日期时间的卡片
2. 复制卡片内容
3. 粘贴到其他应用
4. 验证不包含日期时间标记

### 测试场景 2：预览功能
1. 创建包含日期时间的卡片
2. 打开预览窗口
3. 验证预览中不显示日期时间
4. 关闭预览，验证原卡片仍显示日期时间

### 测试场景 3：图片分享（保持原样）
1. 创建包含日期时间的卡片
2. 生成分享图片
3. 验证图片中**包含**日期时间
4. 验证原卡片仍正常显示

### 测试场景 4：边界情况
1. 测试不包含日期时间的卡片
2. 测试多个日期时间的卡片
3. 测试链接格式的日期
4. 测试只有日期没有时间的卡片

---

## 相关文件

- `src/components/Item/ItemContent.tsx` - 日期时间提取逻辑
- `src/helpers/boardModifiers.ts` - 卡片操作功能
- `src/components/Item/PreviewModal.tsx` - 预览功能
- `src/components/Item/ShareImageModal.tsx` - 图片分享功能（未修改）
- `src/components/Item/DateAndTime.tsx` - 日期时间显示组件

---

## 版本信息

- **实现版本**：v2.0.51+
- **实现日期**：2024-12-18
- **开发者**：Obsidian Kanban Plugin Team

