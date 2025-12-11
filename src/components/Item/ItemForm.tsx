import { EditorView } from '@codemirror/view';
import { moment } from 'obsidian';
import { Dispatch, StateUpdater, useContext, useRef } from 'preact/hooks';
import useOnclickOutside from 'react-cool-onclickoutside';
import { t } from 'src/lang/helpers';

import { MarkdownEditor, allowNewLine } from '../Editor/MarkdownEditor';
import { getDropAction } from '../Editor/helpers';
import { KanbanContext } from '../context';
import { c } from '../helpers';
import { EditState, EditingState, Item, isEditing } from '../types';

interface ItemFormProps {
  addItems: (items: Item[]) => void;
  editState: EditState;
  setEditState: Dispatch<StateUpdater<EditState>>;
  hideButton?: boolean;
}

export function ItemForm({ addItems, editState, setEditState, hideButton }: ItemFormProps) {
  const { stateManager } = useContext(KanbanContext);
  const editorRef = useRef<EditorView>();

  const clear = () => setEditState(EditingState.cancel);
  const clickOutsideRef = useOnclickOutside(clear, {
    ignoreClass: [c('ignore-click-outside'), 'mobile-toolbar', 'suggestion-container'],
  });

  const createItem = (title: string) => {
    // 获取日期和时间格式设置
    const dateTrigger = stateManager.getSetting('date-trigger') || '@';
    const timeTrigger = stateManager.getSetting('time-trigger') || '@@';
    const dateFormat = stateManager.getSetting('date-format') || 'YYYY-MM-DD';
    const timeFormat = stateManager.getSetting('time-format') || 'HH:mm';

    // 获取当前日期和时间
    const now = moment();
    const dateStr = now.format(dateFormat);
    const timeStr = now.format(timeFormat);

    // 构建包含日期和时间的标题
    // 格式：标题\n{dateTrigger}{日期} {timeTrigger}{时间}
    // 日期时间放在下一行，方便之后编辑时添加正文
    const trimmedTitle = title.trim();
    const dateTimeLine = `${dateTrigger}{${dateStr}} ${timeTrigger}{${timeStr}}`;
    const titleWithDateTime = trimmedTitle ? `${trimmedTitle}\n${dateTimeLine}` : dateTimeLine;

    addItems([stateManager.getNewItem(titleWithDateTime, ' ')]);
    const cm = editorRef.current;
    if (cm) {
      cm.dispatch({
        changes: {
          from: 0,
          to: cm.state.doc.length,
          insert: '',
        },
      });
    }
  };

  if (isEditing(editState)) {
    return (
      <div className={c('item-form')} ref={clickOutsideRef}>
        <div className={c('item-input-wrapper')}>
          <MarkdownEditor
            editorRef={editorRef}
            editState={{ x: 0, y: 0 }}
            className={c('item-input')}
            placeholder={t('Card title...')}
            onEnter={(cm, mod, shift) => {
              if (!allowNewLine(stateManager, mod, shift)) {
                createItem(cm.state.doc.toString());
                return true;
              }
            }}
            onSubmit={(cm) => {
              createItem(cm.state.doc.toString());
            }}
            onEscape={clear}
          />
        </div>
      </div>
    );
  }

  if (hideButton) return null;

  return (
    <div className={c('item-button-wrapper')}>
      <button
        className={c('new-item-button')}
        onClick={() => setEditState({ x: 0, y: 0 })}
        onDragOver={(e) => {
          if (getDropAction(stateManager, e.dataTransfer)) {
            setEditState({ x: 0, y: 0 });
          }
        }}
      >
        <span className={c('item-button-plus')}>+</span> {t('Add a card')}
      </button>
    </div>
  );
}
