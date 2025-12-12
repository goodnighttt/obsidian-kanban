import classcat from 'classcat';
import { Menu } from 'obsidian';
import { memo, useCallback, useContext, useEffect, useMemo, useState } from 'preact/compat';
import { useNestedEntityPath } from 'src/dnd/components/Droppable';
import { t } from 'src/lang/helpers';

import { KanbanContext } from '../context';
import { c } from '../helpers';
import { Item } from '../types';

interface ItemCustomMetadataProps {
  item: Item;
  searchQuery?: string;
}

interface ValueDropdownProps {
  metadataKey: string;
  currentValue: string;
  onSelect: (value: string) => void;
  allValues: string[];
  coordinates: { x: number; y: number };
  onClose: () => void;
}

function ValueDropdown({
  metadataKey,
  currentValue,
  onSelect,
  allValues,
  coordinates,
  onClose,
}: ValueDropdownProps): null {
  useEffect(() => {
    const menu = new Menu();

    // 添加"清除值"选项（如果有当前值）
    if (currentValue) {
      menu.addItem((item) => {
        item
          .setTitle(t('Clear value'))
          .setIcon('lucide-x')
          .onClick(() => {
            onSelect('');
            onClose();
          });
      });
      menu.addSeparator();
    }

    // 去重并排序
    const uniqueValues = Array.from(new Set(allValues)).sort();

    if (uniqueValues.length === 0) {
      menu.addItem((item) => {
        item.setTitle(t('No values found')).setDisabled(true);
      });
    } else {
      uniqueValues.forEach((value) => {
        menu.addItem((item) => {
          item
            .setTitle(value)
            .setChecked(value === currentValue)
            .onClick(() => {
              onSelect(value);
              onClose();
            });
        });
      });
    }

    menu.onHide = () => {
      onClose();
    };

    menu.showAtPosition(coordinates);

    return () => {
      menu.close();
    };
  }, [allValues, currentValue, onSelect, onClose, coordinates, metadataKey]);

  return null;
}

export const ItemCustomMetadata = memo(function ItemCustomMetadata({
  item,
  searchQuery,
}: ItemCustomMetadataProps) {
  const { stateManager, boardModifiers } = useContext(KanbanContext);
  const path = useNestedEntityPath();
  const [dropdownState, setDropdownState] = useState<{
    key: string;
    coordinates: { x: number; y: number };
  } | null>(null);

  // 获取看板设置中定义的属性键
  const propertyKeys = stateManager.useSetting('item-property-keys') || [];
  const itemMetadata = item.data.metadata.itemMetadata || {};

  // 只显示在设置中定义的属性键
  const displayedMetadata = useMemo(() => {
    if (propertyKeys.length === 0) return {};
    const result: { [key: string]: string } = {};
    propertyKeys.forEach((key) => {
      if (itemMetadata[key]) {
        result[key] = itemMetadata[key];
      }
    });
    return result;
  }, [propertyKeys, itemMetadata]);

  // 从设置中获取属性值列表，用于下拉框
  const propertyValues = stateManager.useSetting('item-property-values') || {};

  const handleValueClick = useCallback((e: MouseEvent, key: string) => {
    e.stopPropagation();
    // 即使没有值也可以点击，显示下拉框
    setDropdownState({
      key,
      coordinates: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const handleValueSelect = useCallback(
    (key: string, value: string) => {
      const newMetadata = { ...itemMetadata, [key]: value };
      const updatedItem = {
        ...item,
        data: {
          ...item.data,
          metadata: {
            ...item.data.metadata,
            itemMetadata: newMetadata,
          },
        },
      };
      boardModifiers.updateItem(path, updatedItem);
      setDropdownState(null);
    },
    [item, itemMetadata, boardModifiers, path]
  );

  if (propertyKeys.length === 0) {
    return null;
  }

  return (
    <>
      <div className={c('item-custom-metadata')}>
        {propertyKeys.map((key) => {
          const value = displayedMetadata[key] || '';
          const hasValue = !!value;
          const isSearchMatch =
            searchQuery &&
            (key.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
              value.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()));

          return (
            <div
              key={key}
              className={classcat([
                c('item-custom-metadata-row'),
                {
                  'is-search-match': isSearchMatch,
                  'has-value': hasValue,
                },
              ])}
            >
              <div className={c('item-custom-metadata-key')}>{key}</div>
              <div
                className={classcat([
                  c('item-custom-metadata-value'),
                  {
                    'has-value': hasValue,
                  },
                ])}
                onClick={(e) => handleValueClick(e, key)}
                title={hasValue ? t('Click to select value') : t('Click to add value')}
              >
                {hasValue ? (
                  <span className={c('item-custom-metadata-value-text')}>{value}</span>
                ) : (
                  <span className={c('item-custom-metadata-value-placeholder')}>
                    {t('No value')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {dropdownState && (
        <ValueDropdown
          metadataKey={dropdownState.key}
          currentValue={itemMetadata[dropdownState.key] || ''}
          onSelect={(value) => handleValueSelect(dropdownState.key, value)}
          allValues={propertyValues[dropdownState.key] || []}
          coordinates={dropdownState.coordinates}
          onClose={() => setDropdownState(null)}
        />
      )}
    </>
  );
});
