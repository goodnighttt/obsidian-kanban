import Preact from 'preact/compat';
import { Icon } from '../Icon/Icon';
import { c } from '../helpers';
import { Item } from '../types';
import { Path } from 'src/dnd/types'; // 导入路径类型
import { BoardModifiers } from '../../helpers/boardModifiers'; // 导入管理器类型

interface ItemOverviewButtonProps {
    item: Item;
    path: Path; // 需要路径来定位卡片
    boardModifiers: BoardModifiers; // 需要管理器来执行预览动作
}

// Preact.memo是一个性能优化手段，会检查Item是否发生变化。
// 如果Item没有发生变化，则不会重新渲染组件。
export const ItemOverviewButton = Preact.memo(function ItemOverviewButton({
    item,
    path,
    boardModifiers,
}: ItemOverviewButtonProps) {

    const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // 直接调用插件原生的预览逻辑
        boardModifiers.previewItem(path);
    };

    return (
        <a
            data-ignore-drag={true} // 必须加上，否则点击时会触发拖拽
            onClick={handleClick}
            className={`${c('item-postfix-button')} clickable-icon`}
            aria-label="预览卡片" // 悬停时的提示文字
        >
            <Icon name="lucide-eye" /> {/* 这里可以换成你想要的图标 */}
        </a>
    );
});