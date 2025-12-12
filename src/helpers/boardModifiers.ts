import update from 'immutability-helper';
import { moment } from 'obsidian';
import { KanbanView } from 'src/KanbanView';
import { StateManager } from 'src/StateManager';
import { Path } from 'src/dnd/types';
import {
  appendEntities,
  getEntityFromPath,
  insertEntity,
  moveEntity,
  prependEntities,
  removeEntity,
  updateEntity,
  updateParentEntity,
} from 'src/dnd/util/data';

import { PreviewModal } from '../components/Item/PreviewModal';
import { ShareImageModal } from '../components/Item/ShareImageModal';
import { generateInstanceId } from '../components/helpers';
import { c } from '../components/helpers';
import { Board, DataTypes, Item, Lane } from '../components/types';

export interface BoardModifiers {
  appendItems: (path: Path, items: Item[]) => void;
  prependItems: (path: Path, items: Item[]) => void;
  insertItems: (path: Path, items: Item[]) => void;
  replaceItem: (path: Path, items: Item[]) => void;
  splitItem: (path: Path, items: Item[]) => void;
  moveItemToTop: (path: Path) => void;
  moveItemToBottom: (path: Path) => void;
  addLane: (lane: Lane) => void;
  insertLane: (path: Path, lane: Lane) => void;
  updateLane: (path: Path, lane: Lane) => void;
  archiveLane: (path: Path) => void;
  archiveLaneItems: (path: Path) => void;
  deleteEntity: (path: Path) => void;
  previewItem: (path: Path) => void; // 预览卡片功能
  copyItemContent: (path: Path) => void; // 复制卡片内容功能
  shareItemAsImage: (path: Path, element?: HTMLElement) => Promise<void>; // 分享图片功能
  updateItem: (path: Path, item: Item) => void;
  archiveItem: (path: Path) => void;
  duplicateEntity: (path: Path) => void;
}

export function getBoardModifiers(view: KanbanView, stateManager: StateManager): BoardModifiers {
  const appendArchiveDate = (item: Item) => {
    const archiveDateFormat = stateManager.getSetting('archive-date-format');
    const archiveDateSeparator = stateManager.getSetting('archive-date-separator');
    const archiveDateAfterTitle = stateManager.getSetting('append-archive-date');

    const newTitle = [moment().format(archiveDateFormat)];

    if (archiveDateSeparator) newTitle.push(archiveDateSeparator);

    newTitle.push(item.data.titleRaw);

    if (archiveDateAfterTitle) newTitle.reverse();

    const titleRaw = newTitle.join(' ');
    return stateManager.updateItemContent(item, titleRaw);
  };

  return {
    appendItems: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => appendEntities(boardData, path, items));
    },

    prependItems: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => prependEntities(boardData, path, items));
    },

    insertItems: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => insertEntity(boardData, path, items));
    },

    replaceItem: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) =>
        insertEntity(removeEntity(boardData, path), path, items)
      );
    },

    splitItem: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => {
        return insertEntity(removeEntity(boardData, path), path, items);
      });
    },

    moveItemToTop: (path: Path) => {
      stateManager.setState((boardData) => moveEntity(boardData, path, [path[0], 0]));
    },

    moveItemToBottom: (path: Path) => {
      stateManager.setState((boardData) => {
        const laneIndex = path[0];
        const lane = boardData.children[laneIndex];
        return moveEntity(boardData, path, [laneIndex, lane.children.length]);
      });
    },

    addLane: (lane: Lane) => {
      stateManager.setState((boardData) => {
        const collapseState = view.getViewState('list-collapse') || [];
        const op = (collapseState: boolean[]) => {
          const newState = [...collapseState];
          newState.push(false);
          return newState;
        };

        view.setViewState('list-collapse', undefined, op);
        return update<Board>(appendEntities(boardData, [], [lane]), {
          data: { settings: { 'list-collapse': { $set: op(collapseState) } } },
        });
      });
    },

    insertLane: (path: Path, lane: Lane) => {
      stateManager.setState((boardData) => {
        const collapseState = view.getViewState('list-collapse');
        const op = (collapseState: boolean[]) => {
          const newState = [...collapseState];
          newState.splice(path.last(), 0, false);
          return newState;
        };

        view.setViewState('list-collapse', undefined, op);

        return update<Board>(insertEntity(boardData, path, [lane]), {
          data: { settings: { 'list-collapse': { $set: op(collapseState) } } },
        });
      });
    },

    updateLane: (path: Path, lane: Lane) => {
      stateManager.setState((boardData) =>
        updateParentEntity(boardData, path, {
          children: {
            [path[path.length - 1]]: {
              $set: lane,
            },
          },
        })
      );
    },

    archiveLane: (path: Path) => {
      stateManager.setState((boardData) => {
        const lane = getEntityFromPath(boardData, path);
        const items = lane.children;

        try {
          const collapseState = view.getViewState('list-collapse');
          const op = (collapseState: boolean[]) => {
            const newState = [...collapseState];
            newState.splice(path.last(), 1);
            return newState;
          };
          view.setViewState('list-collapse', undefined, op);

          return update<Board>(removeEntity(boardData, path), {
            data: {
              settings: { 'list-collapse': { $set: op(collapseState) } },
              archive: {
                $unshift: stateManager.getSetting('archive-with-date')
                  ? items.map(appendArchiveDate)
                  : items,
              },
            },
          });
        } catch (e) {
          stateManager.setError(e);
          return boardData;
        }
      });
    },

    archiveLaneItems: (path: Path) => {
      stateManager.setState((boardData) => {
        const lane = getEntityFromPath(boardData, path);
        const items = lane.children;

        try {
          return update(
            updateEntity(boardData, path, {
              children: {
                $set: [],
              },
            }),
            {
              data: {
                archive: {
                  $unshift: stateManager.getSetting('archive-with-date')
                    ? items.map(appendArchiveDate)
                    : items,
                },
              },
            }
          );
        } catch (e) {
          stateManager.setError(e);
          return boardData;
        }
      });
    },

    deleteEntity: (path: Path) => {
      stateManager.setState((boardData) => {
        const entity = getEntityFromPath(boardData, path);

        if (entity.type === DataTypes.Lane) {
          const collapseState = view.getViewState('list-collapse');
          const op = (collapseState: boolean[]) => {
            const newState = [...collapseState];
            newState.splice(path.last(), 1);
            return newState;
          };
          view.setViewState('list-collapse', undefined, op);

          return update<Board>(removeEntity(boardData, path), {
            data: { settings: { 'list-collapse': { $set: op(collapseState) } } },
          });
        }

        return removeEntity(boardData, path);
      });
    },

    previewItem: (path: Path) => {
      const boardData = stateManager.state;
      const item = getEntityFromPath(boardData, path);
      const modal = new PreviewModal(view, stateManager, item);
      modal.open();
    },

    copyItemContent: (path: Path) => {
      const boardData = stateManager.state;
      const item = getEntityFromPath(boardData, path);
      navigator.clipboard.writeText(item.data.titleRaw);
    },

    shareItemAsImage: async (path: Path, element?: HTMLElement) => {
      const boardData = stateManager.state;
      const item = getEntityFromPath(boardData, path);

      // 如果没有传入元素，尝试通过 item.id 查找
      let cardElement = element;
      if (!cardElement) {
        const win = view.getWindow();
        const scopeId = view.id;
        const entityId = `${scopeId}-${item.id}`;

        // 方法1: 通过 data-hitboxid 查找（EntityManager 设置的）
        const measureNode = win.document.querySelector(`[data-hitboxid="${entityId}"]`);
        if (measureNode) {
          const itemWrapper = measureNode.closest(`.${c('item-wrapper')}`);
          if (itemWrapper) {
            cardElement = itemWrapper.querySelector(`.${c('item')}`) as HTMLElement;
          }
        }

        // 方法2: 如果方法1失败，遍历所有 item 元素查找匹配的内容
        if (!cardElement) {
          const allItemWrappers = win.document.querySelectorAll(`.${c('item-wrapper')}`);
          for (const wrapper of Array.from(allItemWrappers)) {
            const itemContent = wrapper.querySelector(`.${c('item-content-wrapper')}`);
            if (itemContent) {
              // 检查内容是否匹配（通过检查第一个文本节点）
              const textContent = itemContent.textContent?.trim() || '';
              const itemTitle = item.data.titleRaw.split('\n')[0].trim();
              if (textContent.includes(itemTitle) || itemTitle.includes(textContent)) {
                cardElement = wrapper.querySelector(`.${c('item')}`) as HTMLElement;
                break;
              }
            }
          }
        }

        // 方法3: 如果还是找不到，使用第一个 item 元素作为备选
        if (!cardElement) {
          cardElement = win.document.querySelector(`.${c('item')}`) as HTMLElement;
        }
      }

      if (!cardElement) {
        console.error('无法找到卡片元素');
        return;
      }

      try {
        // 动态导入 html2canvas
        const html2canvas = (await import('html2canvas')).default;

        // 使用 html2canvas 将元素转换为图片
        const canvas = await html2canvas(cardElement, {
          backgroundColor: null,
          scale: 4, // 提高图片质量
          logging: false,
          useCORS: true,
          allowTaint: true,
        });

        // 将 canvas 转换为 base64 图片
        const imageDataUrl = canvas.toDataURL('image/png');

        // 打开分享图片模态窗
        const modal = new ShareImageModal(view, stateManager, item, imageDataUrl);
        modal.open();
      } catch (error) {
        console.error('生成图片失败:', error);
      }
    },

    updateItem: (path: Path, item: Item) => {
      stateManager.setState((boardData) => {
        return updateParentEntity(boardData, path, {
          children: {
            [path[path.length - 1]]: {
              $set: item,
            },
          },
        });
      });
    },

    archiveItem: (path: Path) => {
      stateManager.setState((boardData) => {
        const item = getEntityFromPath(boardData, path);
        try {
          return update(removeEntity(boardData, path), {
            data: {
              archive: {
                $push: [
                  stateManager.getSetting('archive-with-date') ? appendArchiveDate(item) : item,
                ],
              },
            },
          });
        } catch (e) {
          stateManager.setError(e);
          return boardData;
        }
      });
    },

    duplicateEntity: (path: Path) => {
      stateManager.setState((boardData) => {
        const entity = getEntityFromPath(boardData, path);
        const entityWithNewID = update(entity, {
          id: {
            $set: generateInstanceId(),
          },
        });

        if (entity.type === DataTypes.Lane) {
          const collapseState = view.getViewState('list-collapse');
          const op = (collapseState: boolean[]) => {
            const newState = [...collapseState];
            newState.splice(path.last(), 0, collapseState[path.last()]);
            return newState;
          };
          view.setViewState('list-collapse', undefined, op);

          return update<Board>(insertEntity(boardData, path, [entityWithNewID]), {
            data: { settings: { 'list-collapse': { $set: op(collapseState) } } },
          });
        }

        return insertEntity(boardData, path, [entityWithNewID]);
      });
    },
  };
}
