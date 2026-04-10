/**
 * 通用文档加载器
 * 自动从JSON配置文件加载文档列表并动态生成侧边栏链接
 */

class DocsLoader {
    constructor(configPath) {
        this.configPath = configPath;
    }

    /**
     * 加载文档列表
     * @param {string} targetSelector - 目标容器选择器
     * @param {boolean} showSeparator - 是否显示分隔符
     */
    async load(targetSelector = '.sidebar-menu', showSeparator = true) {
        try {
            const response = await fetch(this.configPath);
            if (!response.ok) {
                throw new Error(`无法加载配置文件: ${response.status}`);
            }

            const data = await response.json();
            const target = document.querySelector(targetSelector);

            if (!target) {
                console.warn(`未找到目标容器: ${targetSelector}`);
                return;
            }

            // 添加分隔符
            if (showSeparator && data.documents && data.documents.length > 0) {
                const separator = document.createElement('li');
                separator.className = 'sidebar-item';
                separator.style.marginTop = '1rem';
                separator.style.borderTop = '1px solid var(--border-color)';
                separator.style.paddingTop = '0.5rem';
                separator.innerHTML = `<small style="color: var(--text-lighter); margin-left: 0.75rem;">📚 ${data.category || '扩展文档'}</small>`;
                target.appendChild(separator);
            }

            // 添加文档链接
            if (data.documents) {
                data.documents.forEach(doc => {
                    const li = document.createElement('li');
                    li.className = 'sidebar-item';

                    const link = document.createElement('a');
                    link.href = doc.file;
                    link.className = 'sidebar-link';
                    link.target = '_blank';
                    link.title = doc.description || doc.title;
                    link.innerHTML = `<i class="${doc.icon || 'fas fa-file-alt'}"></i>${doc.title}`;

                    li.appendChild(link);
                    target.appendChild(li);
                });
            }

            console.log(`✅ 成功加载 ${data.documents?.length || 0} 个文档`);
        } catch (error) {
            console.warn('⚠️ 无法加载文档列表:', error.message);
            // 在开发环境中显示错误提示
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                this.showError(targetSelector, error.message);
            }
        }
    }

    /**
     * 显示错误信息
     */
    showError(targetSelector, message) {
        const target = document.querySelector(targetSelector);
        if (target) {
            const errorLi = document.createElement('li');
            errorLi.className = 'sidebar-item';
            errorLi.style.padding = '0.5rem 0.75rem';
            errorLi.style.color = '#f56c6c';
            errorLi.style.fontSize = '0.85rem';
            errorLi.innerHTML = `<i class="fas fa-exclamation-triangle"></i> 文档加载失败: ${message}`;
            target.appendChild(errorLi);
        }
    }
}

/**
 * 便捷函数：快速加载文档
 * @param {string} configPath - 配置文件路径
 * @param {string} targetSelector - 目标容器选择器
 */
function loadDocs(configPath, targetSelector = '.sidebar-menu') {
    const loader = new DocsLoader(configPath);
    loader.load(targetSelector);
}
