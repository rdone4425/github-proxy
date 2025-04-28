/**
 * 导航网站管理页面脚本
 */

// DOM 元素
const tabButtons = document.querySelectorAll('.tab-button');
const adminPanels = document.querySelectorAll('.admin-panel');

// 网站管理相关元素
const websiteList = document.getElementById('websiteList').querySelector('tbody');
const websiteSearchInput = document.getElementById('websiteSearchInput');
const websiteSearchBtn = document.getElementById('websiteSearchBtn');

// 分类管理相关元素
const categoryTable = document.getElementById('categoryTable').querySelector('tbody');

// 网站设置相关元素
const settingsForm = document.getElementById('settingsForm');
const siteTitleInput = document.getElementById('siteTitle');
const footerTextInput = document.getElementById('footerText');

// 数据存储
let categories = [];
let websites = [];
let settings = {};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTabs();

    // 从本地存储中恢复上次选择的标签页
    const savedTab = localStorage.getItem('adminSelectedTab');
    if (savedTab) {
        switchTab(savedTab);
    }

    loadCategories(); // 这个函数现在会同时加载分类和网站数据
    // loadWebsites(); // 不需要单独调用，避免重复加载
    loadSettings();
    initEventListeners();
    initKeyboardShortcuts();

    // 初始化网站管理器 (确保 WebsiteManager 已加载)
    if (window.WebsiteManager) {
        WebsiteManager.init({
            onWebsiteAdded: () => {
                loadWebsites(); // 这会同时更新网站表格和分类表格
            },
            onWebsiteUpdated: () => {
                loadWebsites(); // 这会同时更新网站表格和分类表格
            }
        });
    } else {
        console.error('WebsiteManager 未加载');
        // 添加一个延迟尝试
        setTimeout(() => {
            if (window.WebsiteManager) {
                WebsiteManager.init({
                    onWebsiteAdded: () => {
                        loadWebsites(); // 这会同时更新网站表格和分类表格
                    },
                    onWebsiteUpdated: () => {
                        loadWebsites(); // 这会同时更新网站表格和分类表格
                    }
                });
            } else {
                console.error('WebsiteManager 加载失败');
            }
        }, 500);
    }

    // 初始化分类管理器 (确保 CategoryManager 已加载)
    if (window.CategoryManager) {
        CategoryManager.init({
            onCategoryAdded: () => {
                loadCategories(); // 这会同时加载分类和网站数据，并更新两个表格
            },
            onCategoryUpdated: () => {
                loadCategories(); // 这会同时加载分类和网站数据，并更新两个表格
            }
        });
    } else {
        console.error('CategoryManager 未加载');
        // 添加一个延迟尝试
        setTimeout(() => {
            if (window.CategoryManager) {
                CategoryManager.init({
                    onCategoryAdded: () => {
                        loadCategories(); // 这会同时加载分类和网站数据，并更新两个表格
                    },
                    onCategoryUpdated: () => {
                        loadCategories(); // 这会同时加载分类和网站数据，并更新两个表格
                    }
                });
            } else {
                console.error('CategoryManager 加载失败');
            }
        }, 500);
    }
});

// 切换标签页
function switchTab(tabId) {
    // 保存选择到本地存储
    localStorage.setItem('adminSelectedTab', tabId);

    // 更新按钮状态
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 更新面板显示
    adminPanels.forEach(panel => {
        if (panel.id === `${tabId}Panel`) {
            panel.classList.add('active');

            // 如果切换到分类管理标签，重新加载分类和网站数据
            if (tabId === 'categories') {
                console.log('切换到分类管理标签，重新加载数据');
                loadCategories();
            }
        } else {
            panel.classList.remove('active');
        }
    });
}

// 初始化标签页切换
function initTabs() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            switchTab(tabId);
        });
    });
}

// 初始化事件监听器
function initEventListeners() {
    // 网站设置事件
    settingsForm.addEventListener('submit', handleSettingsSubmit);

    // 数据导入/导出事件
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataInput = document.getElementById('importDataInput');

    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', exportData);
    }

    if (importDataInput) {
        importDataInput.addEventListener('change', importData);
    }

    // 网站搜索事件
    if (websiteSearchBtn) {
        websiteSearchBtn.addEventListener('click', searchWebsites);
    }

    if (websiteSearchInput) {
        // 按下回车键时执行搜索
        websiteSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchWebsites();
            }
        });

        // 输入框内容变化时，如果为空则显示所有网站
        websiteSearchInput.addEventListener('input', () => {
            if (websiteSearchInput.value.trim() === '') {
                resetWebsiteSearch();
            }
        });
    }

    // 主题切换事件
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            setTheme(theme);

            // 更新选中状态
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

// 加载分类
async function loadCategories() {
    try {
        // 同时加载分类和网站数据，确保在渲染分类表格时已经有网站数据
        const [categoriesData, websitesData] = await Promise.all([
            api.getCategories(),
            api.getWebsites()
        ]);

        categories = categoriesData;
        websites = websitesData;

        updateCategorySelects();
        renderCategoryTable();
        renderWebsiteTable(); // 同时更新网站表格

        // 在控制台输出网站数量，用于调试
        console.log('加载的网站数量:', websites.length);
        console.log('加载的分类数量:', categories.length);
    } catch (error) {
        console.error('加载分类和网站数据失败:', error);
        showNotification('加载分类和网站数据失败', 'error');
    }
}

// 加载网站
async function loadWebsites() {
    try {
        websites = await api.getWebsites();
        renderWebsiteTable();

        // 同时更新分类表格，确保网站数量统计正确
        renderCategoryTable();

        // 在控制台输出网站数量，用于调试
        console.log('加载的网站数量 (loadWebsites):', websites.length);
    } catch (error) {
        console.error('加载网站失败:', error);
        showNotification('加载网站失败', 'error');
    }
}

// 加载设置
async function loadSettings() {
    try {
        settings = await api.getSettings();
        if (settings) {
            siteTitleInput.value = settings.siteTitle || '';
            footerTextInput.value = settings.footerText || '';
        }
    } catch (error) {
        console.error('加载设置失败:', error);
        showNotification('加载设置失败', 'error');
    }
}

// 更新分类选择框
function updateCategorySelects() {
    // 通知 WebsiteManager 分类已更新
    if (window.WebsiteManager && typeof WebsiteManager.updateCategorySelect === 'function') {
        WebsiteManager.updateCategorySelect(categories);
    }

    // 通知 CategoryManager 分类已更新
    if (window.CategoryManager && typeof CategoryManager.updateParentSelect === 'function') {
        CategoryManager.updateParentSelect(categories);
    }
}

// 渲染网站表格
function renderWebsiteTable() {
    // 清空表格
    websiteList.innerHTML = '';

    if (websites.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="4" class="empty-message">暂无网站，请添加新网站</td>';
        websiteList.appendChild(emptyRow);
        return;
    }

    // 添加网站行
    websites.forEach(website => {
        const row = document.createElement('tr');

        // 获取网站所属分类
        const category = categories.find(cat => cat.id === website.categoryId);
        const categoryName = category ? category.name : '未分类';

        // 获取网站图标
        let favicon = website.favicon;
        if (!favicon) {
            try {
                favicon = `https://www.google.com/s2/favicons?domain=${new URL(website.url).hostname}&sz=32`;
            } catch (error) {
                // 如果URL无效，使用默认图标
                favicon = '../public/img/default-favicon.png';
            }
        }

        row.innerHTML = `
            <td>
                <div class="website-info-cell">
                    <img src="${favicon}" alt="${website.title}" class="website-favicon" onerror="this.src='../public/img/default-favicon.png'">
                    <div>
                        <div class="website-title">${website.title}</div>
                        <div class="website-description">${website.description || '暂无描述'}</div>
                    </div>
                </div>
            </td>
            <td>${categoryName}</td>
            <td><a href="${website.url}" target="_blank" class="website-url">${website.url}</a></td>
            <td class="actions-cell">
                <button class="btn icon-btn edit-btn" data-id="${website.id}" title="编辑"><i class="fas fa-edit"></i></button>
                <button class="btn icon-btn delete-btn" data-id="${website.id}" title="删除"><i class="fas fa-trash"></i></button>
            </td>
        `;

        // 添加编辑和删除事件
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        // 使用 WebsiteManager 处理编辑和删除操作 (确保 WebsiteManager 已加载)
        if (window.WebsiteManager) {
            editBtn.addEventListener('click', () => WebsiteManager.editWebsite(website));
            deleteBtn.addEventListener('click', () => WebsiteManager.deleteWebsite(website.id, () => loadWebsites()));
        } else {
            // 如果 WebsiteManager 未加载，使用简单的提示
            editBtn.addEventListener('click', () => alert('编辑功能暂不可用'));
            deleteBtn.addEventListener('click', () => alert('删除功能暂不可用'));
        }

        websiteList.appendChild(row);
    });
}

// 渲染分类表格
function renderCategoryTable() {
    // 清空表格
    categoryTable.innerHTML = '';

    if (categories.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="4" class="empty-message">暂无分类，请添加新分类</td>';
        categoryTable.appendChild(emptyRow);
        return;
    }

    // 获取父分类并按序号排序（序号越小，排序越靠前）
    const parentCategories = categories
        .filter(cat => !cat.parentId)
        .sort((a, b) => (a.order || 50000) - (b.order || 50000));

    // 渲染父分类及其子分类
    parentCategories.forEach(parent => {
        // 获取该父分类的所有子分类并按序号排序（序号越小，排序越靠前）
        const children = categories
            .filter(child => child.parentId === parent.id)
            .sort((a, b) => (a.order || 50000) - (b.order || 50000));

        // 添加父分类行，并传入子分类数量
        renderCategoryRow(parent, children.length);

        // 创建子分类容器
        if (children.length > 0) {
            // 创建子分类容器
            const childrenContainer = document.createElement('tbody');
            childrenContainer.classList.add('category-children');
            childrenContainer.dataset.parentId = parent.id;

            // 默认收缩
            childrenContainer.style.display = 'none';

            // 添加所有子分类
            children.forEach(child => {
                renderCategoryRow(child, 0, childrenContainer);
            });

            // 将子分类容器添加到表格
            categoryTable.appendChild(childrenContainer);
        }
    });
}

// 渲染单个分类行
function renderCategoryRow(category, childCount = 0, container = categoryTable) {
    const row = document.createElement('tr');
    row.dataset.id = category.id;

    // 确定分类类型
    const categoryType = category.parentId ? '子分类' : '父分类';

    // 计算该分类下的网站数量
    let websiteCount = 0;

    // 调试信息：检查websites数组是否存在且有数据
    console.log(`渲染分类 ${category.name}，websites数组长度: ${websites ? websites.length : 'undefined'}`);

    if (!websites || websites.length === 0) {
        console.warn('警告: websites数组为空或未定义，无法计算网站数量');
        websiteCount = 0;
    } else if (category.parentId) {
        // 子分类：只计算直接属于该分类的网站
        websiteCount = websites.filter(site => site.categoryId === category.id).length;
        console.log(`子分类 ${category.name} 的网站数量: ${websiteCount}`);
    } else {
        // 父分类：计算该分类及其所有子分类下的网站
        const childCategoryIds = categories
            .filter(cat => cat.parentId === category.id)
            .map(cat => cat.id);

        console.log(`父分类 ${category.name} 的子分类IDs: ${JSON.stringify(childCategoryIds)}`);

        // 计算直接属于父分类的网站数量
        const directWebsiteCount = websites.filter(site => site.categoryId === category.id).length;

        // 计算属于子分类的网站数量
        const childWebsiteCount = websites.filter(site => childCategoryIds.includes(site.categoryId)).length;

        // 总数 = 直接属于父分类的网站 + 属于子分类的网站
        websiteCount = directWebsiteCount + childWebsiteCount;

        console.log(`父分类 ${category.name} 的直接网站数量: ${directWebsiteCount}, 子分类网站数量: ${childWebsiteCount}, 总数: ${websiteCount}`);
    }

    // 如果是子分类，添加缩进和父分类名称
    let categoryName = category.name;
    if (category.parentId) {
        // 添加子分类样式
        row.classList.add('child-category-row');
    } else {
        // 添加父分类样式
        row.classList.add('parent-category-row');

        // 如果有子分类，添加展开/折叠图标
        if (childCount > 0) {
            row.classList.add('has-children');
            // 默认收缩，不添加expanded类
            categoryName = `
                <div class="category-name-container">
                    <span class="toggle-children">
                        <i class="fas fa-chevron-right"></i>
                    </span>
                    ${categoryName}
                    <span class="child-count">(${childCount})</span>
                </div>
            `;
        }
    }

    row.innerHTML = `
        <td>${categoryName}</td>
        <td>${categoryType}</td>
        <td>${category.order || 50000}</td>
        <td class="website-count-cell">${websiteCount}</td>
        <td class="actions-cell">
            <button class="btn icon-btn edit-btn" data-id="${category.id}" title="编辑"><i class="fas fa-edit"></i></button>
            <button class="btn icon-btn delete-btn" data-id="${category.id}" title="删除"><i class="fas fa-trash"></i></button>
        </td>
    `;

    // 添加编辑和删除事件
    const editBtn = row.querySelector('.edit-btn');
    const deleteBtn = row.querySelector('.delete-btn');

    // 使用 CategoryManager 处理编辑和删除操作 (确保 CategoryManager 已加载)
    if (window.CategoryManager) {
        editBtn.addEventListener('click', () => CategoryManager.editCategory(category));
        deleteBtn.addEventListener('click', () => CategoryManager.deleteCategory(category.id, categories, websites, () => loadCategories()));
    } else {
        // 如果 CategoryManager 未加载，使用旧的函数
        editBtn.addEventListener('click', () => editCategory(category.id));
        deleteBtn.addEventListener('click', () => deleteCategory(category.id));
    }

    // 如果是父分类且有子分类，添加展开/折叠功能
    if (!category.parentId && childCount > 0) {
        const toggleBtn = row.querySelector('.toggle-children');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡

                // 如果当前是收缩状态，则先收起所有其他展开的父分类
                if (!row.classList.contains('expanded')) {
                    // 收起所有其他展开的父分类
                    document.querySelectorAll('.parent-category-row.has-children.expanded').forEach(expandedRow => {
                        if (expandedRow !== row) {
                            // 移除展开状态
                            expandedRow.classList.remove('expanded');

                            // 更新图标
                            const expandedIcon = expandedRow.querySelector('.toggle-children i');
                            if (expandedIcon) {
                                expandedIcon.className = 'fas fa-chevron-right';
                            }

                            // 隐藏子分类容器
                            const expandedId = expandedRow.dataset.id;
                            const expandedContainer = document.querySelector(`.category-children[data-parent-id="${expandedId}"]`);
                            if (expandedContainer) {
                                expandedContainer.style.display = 'none';
                            }
                        }
                    });
                }

                // 切换当前父分类的展开/折叠状态
                const isExpanded = row.classList.toggle('expanded');

                // 获取子分类容器
                const childrenContainer = document.querySelector(`.category-children[data-parent-id="${category.id}"]`);
                if (childrenContainer) {
                    childrenContainer.style.display = isExpanded ? 'table-row-group' : 'none';
                }

                // 更新图标
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                }
            });
        }
    }

    container.appendChild(row);
}

// 这些函数已移至 WebsiteManager 模块

// 分类管理功能已移至 CategoryManager 模块

// 处理设置表单提交
async function handleSettingsSubmit(event) {
    event.preventDefault();

    const settingsData = {
        siteTitle: siteTitleInput.value,
        footerText: footerTextInput.value
    };

    try {
        await api.updateSettings(settingsData);
        settings = settingsData;
        showNotification('设置保存成功', 'success');
    } catch (error) {
        console.error('保存设置失败:', error);
        showNotification('保存设置失败', 'error');
    }
}

// 网站编辑和删除功能已移至 WebsiteManager 模块
// 分类编辑和删除功能已移至 CategoryManager 模块

// 搜索网站
function searchWebsites() {
    const searchTerm = websiteSearchInput.value.trim().toLowerCase();

    if (!searchTerm) {
        resetWebsiteSearch();
        return;
    }

    // 保存原始网站列表，用于恢复
    if (!window.originalWebsites) {
        window.originalWebsites = [...websites];
    }

    // 过滤网站
    const filteredWebsites = window.originalWebsites.filter(website => {
        return (
            website.title.toLowerCase().includes(searchTerm) ||
            website.url.toLowerCase().includes(searchTerm) ||
            (website.description && website.description.toLowerCase().includes(searchTerm))
        );
    });

    // 显示搜索结果
    if (filteredWebsites.length > 0) {
        // 临时替换网站数组，用于渲染
        const tempWebsites = websites;
        websites = filteredWebsites;

        // 渲染搜索结果
        renderWebsiteTable();

        // 恢复原始网站数组
        websites = tempWebsites;

        // 添加搜索状态提示
        const statusMessage = document.createElement('div');
        statusMessage.className = 'search-status';
        statusMessage.id = 'searchStatus';
        statusMessage.innerHTML = `找到 <strong>${filteredWebsites.length}</strong> 个匹配的网站 (搜索: "${searchTerm}")`;

        // 添加到表格前面
        const websiteTable = document.getElementById('websiteList');
        websiteTable.parentNode.insertBefore(statusMessage, websiteTable);

        // 高亮搜索结果
        highlightSearchResults(searchTerm);
    } else {
        // 没有找到匹配的网站
        websiteList.innerHTML = '';
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="4" class="no-results">没有找到匹配 "${searchTerm}" 的网站</td>`;
        websiteList.appendChild(emptyRow);

        // 添加搜索状态提示
        const statusMessage = document.createElement('div');
        statusMessage.className = 'search-status';
        statusMessage.id = 'searchStatus';
        statusMessage.innerHTML = `没有找到匹配 "${searchTerm}" 的网站`;

        // 添加到表格前面
        const websiteTable = document.getElementById('websiteList');
        websiteTable.parentNode.insertBefore(statusMessage, websiteTable);
    }
}

// 重置网站搜索
function resetWebsiteSearch() {
    // 移除搜索状态提示
    const statusMessage = document.getElementById('searchStatus');
    if (statusMessage) {
        statusMessage.remove();
    }

    // 清空搜索框
    if (websiteSearchInput) {
        websiteSearchInput.value = '';
    }

    // 恢复原始网站列表
    if (window.originalWebsites) {
        // 重新渲染网站表格
        renderWebsiteTable();

        // 清除保存的原始网站列表
        window.originalWebsites = null;
    }
}

// 高亮搜索结果
function highlightSearchResults(searchTerm) {
    if (!searchTerm) return;

    // 转换为小写，用于不区分大小写的匹配
    searchTerm = searchTerm.toLowerCase();

    // 获取所有网站标题、描述和URL元素
    const titleElements = document.querySelectorAll('.website-title');
    const descriptionElements = document.querySelectorAll('.website-description');
    const urlElements = document.querySelectorAll('.website-url');

    // 高亮函数
    const highlightText = (element, term) => {
        if (!element) return;

        const originalText = element.textContent;
        const lowerText = originalText.toLowerCase();

        // 如果文本中包含搜索词
        if (lowerText.includes(term)) {
            // 创建一个正则表达式，用于不区分大小写的替换
            const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

            // 替换为带高亮的HTML
            element.innerHTML = originalText.replace(regex, '<span class="highlight">$1</span>');
        }
    };

    // 高亮标题
    titleElements.forEach(element => highlightText(element, searchTerm));

    // 高亮描述
    descriptionElements.forEach(element => highlightText(element, searchTerm));

    // 高亮URL
    urlElements.forEach(element => highlightText(element, searchTerm));
}

// 导出数据
async function exportData() {
    try {
        showNotification('正在准备导出数据...', 'info');

        // 获取所有数据
        const [exportCategories, exportWebsites, exportSettings] = await Promise.all([
            api.getCategories(),
            api.getWebsites(),
            api.getSettings()
        ]);

        // 构建导出数据对象
        const exportData = {
            categories: exportCategories,
            websites: exportWebsites,
            settings: exportSettings,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        // 转换为JSON字符串
        const dataStr = JSON.stringify(exportData, null, 2);

        // 创建下载链接
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileName = `nav-site-backup-${new Date().toISOString().slice(0,10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);

        showNotification('数据导出成功', 'success');
    } catch (error) {
        console.error('导出数据失败:', error);
        showNotification('导出数据失败: ' + (error.message || '未知错误'), 'error');
    }
}

// 导入数据
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showNotification('正在导入数据...', 'info');

        // 读取文件内容
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                // 解析JSON数据
                const importData = JSON.parse(e.target.result);

                // 验证数据格式
                if (!importData.categories || !importData.websites || !importData.settings) {
                    throw new Error('导入文件格式不正确');
                }

                // 确认导入
                if (!confirm('导入将覆盖当前所有数据，确定要继续吗？')) {
                    return;
                }

                // 导入设置
                if (importData.settings) {
                    await api.updateSettings(importData.settings);
                }

                // 导入分类
                if (importData.categories && Array.isArray(importData.categories)) {
                    // 先删除所有现有分类
                    const currentCategories = await api.getCategories();
                    for (const category of currentCategories) {
                        await api.deleteCategory(category.id);
                    }

                    // 添加导入的分类
                    for (const category of importData.categories) {
                        await api.addCategory(category);
                    }
                }

                // 导入网站
                if (importData.websites && Array.isArray(importData.websites)) {
                    // 先删除所有现有网站
                    const currentWebsites = await api.getWebsites();
                    for (const website of currentWebsites) {
                        await api.deleteWebsite(website.id);
                    }

                    // 添加导入的网站
                    for (const website of importData.websites) {
                        await api.addWebsite(website);
                    }
                }

                showNotification('数据导入成功，正在刷新页面...', 'success');

                // 重新加载页面以应用更改
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                console.error('处理导入数据失败:', error);
                showNotification('导入数据失败: ' + (error.message || '未知错误'), 'error');
            }
        };

        reader.onerror = () => {
            showNotification('读取文件失败', 'error');
        };

        reader.readAsText(file);
    } catch (error) {
        console.error('导入数据失败:', error);
        showNotification('导入数据失败: ' + (error.message || '未知错误'), 'error');
    } finally {
        // 清空文件输入，以便可以再次选择同一文件
        event.target.value = '';
    }
}

// 网站信息获取功能已移至 WebsiteManager 模块

// 初始化主题
function initTheme() {
    // 获取当前主题
    const currentTheme = localStorage.getItem('theme') || 'light';

    // 应用主题
    setTheme(currentTheme);

    // 更新主题选择器
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        if (option.dataset.theme === currentTheme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// 设置主题
function setTheme(theme) {
    // 保存主题设置
    localStorage.setItem('theme', theme);

    // 应用主题
    document.documentElement.setAttribute('data-theme', theme);

    // 如果是自动主题，检查系统偏好
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark-mode', prefersDark);
    } else {
        document.documentElement.classList.toggle('dark-mode', theme === 'dark');
    }
}

// 初始化键盘快捷键
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 如果在输入框中，不触发快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Alt + W: 切换到网站管理
        if (e.altKey && e.key === 'w') {
            e.preventDefault();
            switchTab('websites');
        }

        // Alt + C: 切换到分类管理
        if (e.altKey && e.key === 'c') {
            e.preventDefault();
            switchTab('categories');
        }

        // Alt + S: 切换到设置
        if (e.altKey && e.key === 's') {
            e.preventDefault();
            switchTab('settings');
        }

        // Alt + A: 添加新网站/分类（根据当前标签）
        if (e.altKey && e.key === 'a') {
            e.preventDefault();
            const activePanel = document.querySelector('.admin-panel.active');
            if (activePanel) {
                if (activePanel.id === 'websitesPanel') {
                    document.getElementById('addWebsiteBtn').click();
                } else if (activePanel.id === 'categoriesPanel') {
                    document.getElementById('addCategoryBtn').click();
                }
            }
        }

        // Alt + E: 导出数据
        if (e.altKey && e.key === 'e') {
            e.preventDefault();
            exportData();
        }

        // Alt + I: 导入数据（触发文件选择）
        if (e.altKey && e.key === 'i') {
            e.preventDefault();
            document.getElementById('importDataInput').click();
        }

        // Esc: 取消当前操作（关闭表单）
        if (e.key === 'Escape') {
            const visibleForms = document.querySelectorAll('.form-container[style*="display: block"]');
            visibleForms.forEach(form => {
                const cancelBtn = form.querySelector('button[type="button"]');
                if (cancelBtn) {
                    cancelBtn.click();
                }
            });
        }
    });

    // 添加快捷键提示
    addShortcutHints();
}

// 添加快捷键提示
function addShortcutHints() {
    // 网站管理标签
    const websitesTab = document.querySelector('.tab-button[data-tab="websites"]');
    if (websitesTab) {
        websitesTab.setAttribute('title', '快捷键: Alt+W');
    }

    // 分类管理标签
    const categoriesTab = document.querySelector('.tab-button[data-tab="categories"]');
    if (categoriesTab) {
        categoriesTab.setAttribute('title', '快捷键: Alt+C');
    }

    // 设置标签
    const settingsTab = document.querySelector('.tab-button[data-tab="settings"]');
    if (settingsTab) {
        settingsTab.setAttribute('title', '快捷键: Alt+S');
    }

    // 添加网站按钮
    const addWebsiteBtn = document.getElementById('addWebsiteBtn');
    if (addWebsiteBtn) {
        addWebsiteBtn.setAttribute('title', '添加新网站 (Alt+A)');
    }

    // 添加分类按钮
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.setAttribute('title', '添加新分类 (Alt+A)');
    }

    // 导出数据按钮
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.setAttribute('title', '导出数据 (Alt+E)');
    }

    // 导入数据按钮
    const importDataLabel = document.querySelector('label[for="importDataInput"]');
    if (importDataLabel) {
        importDataLabel.setAttribute('title', '导入数据 (Alt+I)');
    }
}
