import Preact from 'preact/compat';
import { Icon } from '../Icon/Icon';
import { c } from '../helpers';
import { Item } from '../types';
import { Path } from 'src/dnd/types'; // 导入路径类型
import { BoardModifiers } from '../../helpers/boardModifiers'; // 导入管理器类型

interface ItemCopyContentButtonProps {
    item: Item;
    path: Path; // 需要路径来定位卡片
    boardModifiers: BoardModifiers; // 需要管理器来执行预览动作
}

// Preact.memo是一个性能优化手段，会检查Item是否发生变化。
// 如果Item没有发生变化，则不会重新渲染组件。
export const ItemCopyContentButton = Preact.memo(function ItemCopyContentButton({
    item,
    path,
    boardModifiers,
}: ItemCopyContentButtonProps) {

    const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // 直接调用插件原生的复制内容逻辑
        boardModifiers.copyItemContent(path);
    };

    return (
        <a
            data-ignore-drag={true} // 必须加上，否则点击时会触发拖拽
            onClick={handleClick}
            className={`${c('item-postfix-button')} clickable-icon`}
            aria-label="复制内容" // 悬停时的提示文字
        >
            <Icon name="lucide-clipboard" /> {/* 这里可以换成你想要的图标 */}
        </a>
    );
});